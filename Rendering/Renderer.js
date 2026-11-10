import { loadTexture } from "./Texture.js";
import { ditheringSettings } from "./Dithering.js";
import { calculateTangentPoints } from "./Geometry.js";


async function loadShader(path) {

    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Failed to load shader: ${path}`);
    }

    return response.text();
}


const [
    vertexShaderSource,
    fragmentShaderSource,
    playerShaderSource,
    orbShaderSource,
    filamentShaderSource
] = await Promise.all([
    loadShader(new URL("./Shaders/vertex.vert", import.meta.url)),
    loadShader(new URL("./Shaders/fragment.frag", import.meta.url)),
    loadShader(new URL("./Shaders/player.frag", import.meta.url)),
    loadShader(new URL("./Shaders/orb.frag", import.meta.url)),
    loadShader(new URL("./Shaders/filament.frag", import.meta.url))
]);


export class Renderer {


    constructor(canvas) {

        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2");

        if (!this.gl) {
            throw new Error("WebGL 2 initialization failed.");
        }

        const gl = this.gl;

        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


        this.program = this.createProgram(
            gl,
            vertexShaderSource,
            fragmentShaderSource
        );

        this.playerProgram = this.createShapeProgram(
            playerShaderSource
        );

        this.orbProgram = this.createShapeProgram(
            orbShaderSource
        );

        this.filamentProgram = this.createShapeProgram(
            filamentShaderSource
        );


        this.resolutionLocation = gl.getUniformLocation(
            this.program,
            "u_resolution"
        );

        this.textureLocation = gl.getUniformLocation(
            this.program,
            "u_texture"
        );


        this.positionLocation = gl.getAttribLocation(
            this.program,
            "a_position"
        );

        this.texCoordLocation = gl.getAttribLocation(
            this.program,
            "a_texCoord"
        );

        this.ditheringEnabled = true;

        this.worldDithering = true;

        this.vertexBuffer = gl.createBuffer();

        this.ditheringUniforms = {
            worldDithering: gl.getUniformLocation(
                this.program,
                "u_worldDithering"
            ),
            backgroundPosition: gl.getUniformLocation(
                this.program,
                "u_backgroundPosition"
            ),

            backgroundSize: gl.getUniformLocation(
                this.program,
                "u_backgroundSize"
            ),
            enabled: gl.getUniformLocation(
                this.program, 
                "u_ditheringEnabled"
            ),
            matrixSize: gl.getUniformLocation(
                this.program,
                "u_matrixSize"
            ),
            bayerMatrix: gl.getUniformLocation(
                this.program, 
                "u_bayerMatrix[0]"
            ),
            palette: gl.getUniformLocation(
                this.program, 
                "u_palette[0]"
            ),
            cutoffs: gl.getUniformLocation(
                this.program, 
                "u_cutoffs[0]"
            ),
            cutoffStrength: gl.getUniformLocation(
                this.program, 
                "u_cutoffStrength"
            ),

            cameraPosition: gl.getUniformLocation(this.program, "u_cameraPosition"),
            zoom: gl.getUniformLocation(this.program, "u_zoom")
        };

        this.uploadDitheringSettings(ditheringSettings);

        this.darkTexture = this.createDarkTexture();
        this.createSceneFramebuffer();
    }

    createShapeProgram(fragmentSource) {

        const gl = this.gl;

        const program = this.createProgram(
            gl,
            vertexShaderSource,
            fragmentSource
        );

        return {
            program,

            zoom: gl.getUniformLocation(program, "u_zoom"),

            tailA: gl.getUniformLocation(program, "u_tailA"),

            tailB: gl.getUniformLocation(program, "u_tailB"),

            tailC: gl.getUniformLocation(program, "u_tailC"),

            hasTail: gl.getUniformLocation(program, "u_hasTail"),

            speed: gl.getUniformLocation(program, "u_speed"),

            start: gl.getUniformLocation(program, "u_start"),

            end: gl.getUniformLocation(program, "u_end"),

            active: gl.getUniformLocation(
                program,
                "u_active"
            ),

            alignment: gl.getUniformLocation(
                program,
                "u_alignment"
            ),

            spinAngle: gl.getUniformLocation(
                program,
                "u_spinAngle"
            ),

            position: gl.getAttribLocation(
                program, "a_position"
            ),

            texCoord: gl.getAttribLocation(
                program, "a_texCoord"
            ),

            size: gl.getUniformLocation(
                program, "u_size"
            ),

            color: gl.getUniformLocation(
                program, "u_color"
            ),

            time: gl.getUniformLocation(
                program, "u_time"
            ),
            resolution: gl.getUniformLocation(
                program, "u_resolution"
            ),
            playerPosition: gl.getUniformLocation(
                program, "u_playerPosition"
            ),

            centerPosition: gl.getUniformLocation(
                program, "u_centerPosition"
            ),

            playerRadius: gl.getUniformLocation(
                program, "u_playerRadius"
            ),
            showBorder: gl.getUniformLocation(program, "u_showBorder"),
        };
    }

    createShader(gl, type, source) {

        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

            const error = gl.getShaderInfoLog(shader);

            gl.deleteShader(shader);

            throw new Error(error);
        }

        return shader;
    }


    createProgram(gl, vertexSource, fragmentSource) {

        const vertexShader = this.createShader(
            gl,
            gl.VERTEX_SHADER,
            vertexSource
        );

        const fragmentShader = this.createShader(
            gl,
            gl.FRAGMENT_SHADER,
            fragmentSource
        );

        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

            const error = gl.getProgramInfoLog(program);

            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            throw new Error(error);
        }

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return program;
    }


    createSceneFramebuffer() {

        const gl = this.gl;

        this.sceneFramebuffer = gl.createFramebuffer();
        this.sceneTexture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);

        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            this.sceneTexture,
            0
        );

        this.resizeSceneFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    resizeSceneFramebuffer() {

        const gl = this.gl;
        const rect = this.canvas.getBoundingClientRect();

        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        if (width <= 0 || height <= 0) return;

        // Resize canvas drawing buffer
        this.canvas.width = width;
        this.canvas.height = height;

        // Resize scene texture
        gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA8,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Scene framebuffer is incomplete.");
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.sceneWidth = width;
        this.sceneHeight = height;

        gl.viewport(0, 0, width, height);
    }


    uploadDitheringSettings(settings) {

        const gl = this.gl;
        const uniforms = this.ditheringUniforms;

        gl.useProgram(this.program);

        gl.uniform1i(
            uniforms.matrixSize,
            settings.matrixSize
        );

        gl.uniform1fv(
            uniforms.bayerMatrix,
            new Float32Array(settings.bayerMatrix)
        );

        gl.uniform3fv(
            uniforms.palette,
            new Float32Array(
                settings.palette.flat().map(value => value / 255)
            )
        );

        gl.uniform1fv(
            uniforms.cutoffs,
            new Float32Array(settings.cutoffs)
        );

        gl.uniform1f(
            uniforms.cutoffStrength,
            settings.cutoffStrength
        );
    }


    uploadCameraSettings(camera) {

        const gl = this.gl;
        const uniforms = this.ditheringUniforms;

        gl.uniform2f(
            uniforms.cameraPosition,
            camera.x,
            camera.y
        );

        gl.uniform1f(
            uniforms.zoom,
            camera.zoom
        );
    }


    uploadBackgroundSettings(background) {

        const gl = this.gl;
        const uniforms = this.ditheringUniforms;

        gl.uniform2f(
            uniforms.backgroundPosition,
            background.x,
            background.y
        );

        gl.uniform2f(
            uniforms.backgroundSize,
            background.width,
            background.height
        );

    }


    uploadWorldDithering(){
        this.gl.uniform1i(
            this.ditheringUniforms.worldDithering,
            this.worldDithering? 1: 0
        );
    }


    load_render_texture(path) {
        return loadTexture(this.gl, path);
    }


    createDarkTexture() {

        const gl = this.gl;

        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([10, 10, 10, 255])
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        return texture;
    }


    renderSprite(sprite, camera = null) {

        const gl = this.gl;

        if (!sprite.texture) return;

        const position = camera
            ? camera.worldToScreen(sprite.x, sprite.y)
            : { x: sprite.x, y: sprite.y };

        const zoom = camera ? camera.zoom : 1;

        const width = sprite.width * zoom;
        const height = sprite.height * zoom;

        const left = position.x - width / 2;
        const top = position.y - height / 2;

        const right = left + width;
        const bottom = top + height;

        const vertices = new Float32Array([

            left,  top,       0, 1,
            right, top,       1, 1,
            left,  bottom,    0, 0,

            left,  bottom,    0, 0,
            right, top,       1, 1,
            right, bottom,    1, 0
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.DYNAMIC_DRAW
        );

        gl.enableVertexAttribArray(this.positionLocation);

        gl.vertexAttribPointer(
            this.positionLocation,
            2,
            gl.FLOAT,
            false,
            16,
            0
        );

        gl.enableVertexAttribArray(this.texCoordLocation);

        gl.vertexAttribPointer(
            this.texCoordLocation,
            2,
            gl.FLOAT,
            false,
            16,
            8
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sprite.texture);

        gl.uniform1i(this.textureLocation, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }


    renderShape(shape, camera, shader, color) {

        const gl = this.gl;

        const position = camera
            ? camera.worldToScreen(shape.x, shape.y)
            : { x: shape.x, y: shape.y };

        const zoom = camera ? camera.zoom : 1;

        const width = shape.width * zoom;
        const height = shape.height * zoom;

        const left = position.x - width / 2;
        const top = position.y - height / 2;

        const right = left + width;
        const bottom = top + height;

        const vertices = new Float32Array([
            left,  top,       0, 1,
            right, top,       1, 1,
            left,  bottom,    0, 0,

            left,  bottom,    0, 0,
            right, top,       1, 1,
            right, bottom,    1, 0
        ]);

        gl.useProgram(shader.program);
        gl.uniform2f(
            shader.resolution,
            this.canvas.width,
            this.canvas.height
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.DYNAMIC_DRAW
        );

        gl.enableVertexAttribArray(shader.position);

        gl.vertexAttribPointer(
            shader.position,
            2,
            gl.FLOAT,
            false,
            16,
            0
        );

        gl.enableVertexAttribArray(shader.texCoord);

        gl.vertexAttribPointer(
            shader.texCoord,
            2,
            gl.FLOAT,
            false,
            16,
            8
        );

        // Object dimensions in screen pixels
        gl.uniform2f(
            shader.size,
            width,
            height
        );

        // Object color
        gl.uniform4fv(
            shader.color,
            color
        );
        if (shader === this.orbProgram) {

            gl.uniform1i(
                shader.active,
                shape.inRange ? 1 : 0
            );

            gl.uniform1f(
                shader.alignment,
                shape.alignment
            );

            gl.uniform1f(
                shader.spinAngle,
                shape.spinAngle
            );
        }

        // Animation time, if supported by shader
        if (shader.time !== null) {
            gl.uniform1f(
                shader.time,
                performance.now() * 0.001
            );
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }


    renderPlayer(player, camera) {

        const gl = this.gl;
        const shader = this.playerProgram;

        // Player position in screen coordinates
        const position = camera
            ? camera.worldToScreen(player.x, player.y)
            : { x: player.x, y: player.y };

        const zoom = camera ? camera.zoom : 1;

        // Player's visual radius in screen pixels
        const radius = Math.min(
            player.width,
            player.height
        ) * zoom * 0.42;

        // Screen center
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const center = {
            x: centerX,
            y: centerY
        };

        // Calculate triangle in screen space
        const tail = calculateTangentPoints(
            position,
            radius,
            center
        );

        // Smallest bounding box containing player and screen center
        const left = Math.min(position.x - radius, centerX);
        const right = Math.max(position.x + radius, centerX);

        const top = Math.min(position.y - radius, centerY);
        const bottom = Math.max(position.y + radius, centerY);

        const width = right - left;
        const height = bottom - top;

        // Player position relative to the quad (UV coordinates)
        const playerLocalPosition = [
            (position.x - left) / width,
            1.0 - (position.y - top) / height
        ];

        // Screen center relative to the quad (UV coordinates)
        const centerLocalPosition = [
            (centerX - left) / width,
            1.0 - (centerY - top) / height
        ];

        const toLocal = (point) => [
            (point.x - left) / width,
            1.0 - (point.y - top) / height
        ];

        const tailA = tail ? toLocal(tail.a) : centerLocalPosition;
        const tailB = tail ? toLocal(tail.b) : centerLocalPosition;
        const tailC = centerLocalPosition;

        // Quad vertices
        const vertices = new Float32Array([
            left,  top,       0, 1,
            right, top,       1, 1,
            left,  bottom,    0, 0,

            left,  bottom,    0, 0,
            right, top,       1, 1,
            right, bottom,    1, 0
        ]);

        gl.useProgram(shader.program);

        // Canvas resolution
        gl.uniform2f(
            shader.resolution,
            this.canvas.width,
            this.canvas.height
        );

        // Dimensions of the bounding box
        gl.uniform2f(
            shader.size,
            width,
            height
        );

        // Player position inside the bounding box
        gl.uniform2fv(
            shader.playerPosition,
            playerLocalPosition
        );

        // Screen center inside the bounding box
        gl.uniform2fv(
            shader.centerPosition,
            centerLocalPosition
        );

        // Player radius
        gl.uniform1f(
            shader.playerRadius,
            radius
        );
        gl.uniform1f(
            shader.zoom,
            camera ? camera.zoom : 1.0
        );

        gl.uniform1f(shader.playerRadius, radius);
        gl.uniform1i(shader.showBorder, player.showBorder ? 1 : 0);

        gl.uniform4fv(
            shader.color,
            [1.0, 1.0, 1.0, 1.0]
        );

        gl.uniform2fv(shader.tailA, tailA);
        gl.uniform2fv(shader.tailB, tailB);
        gl.uniform2fv(shader.tailC, tailC);

        gl.uniform1i(
            shader.hasTail,
            tail ? 1 : 0
        );
        const speed = Math.hypot(
            player.vx,
            player.vy
        );

        gl.uniform1f(shader.speed, speed);

        if (shader.time !== null) {
            gl.uniform1f(
                shader.time,
                performance.now() * 0.001
            );
        }

        // Upload geometry
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.DYNAMIC_DRAW
        );

        gl.enableVertexAttribArray(shader.position);

        gl.vertexAttribPointer(
            shader.position,
            2,
            gl.FLOAT,
            false,
            16,
            0
        );

        gl.enableVertexAttribArray(shader.texCoord);

        gl.vertexAttribPointer(
            shader.texCoord,
            2,
            gl.FLOAT,
            false,
            16,
            8
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }


    renderFilament(player, orb, camera) {

        const gl = this.gl;
        const shader = this.filamentProgram;

        const start = camera
            ? camera.worldToScreen(player.x, player.y)
            : { x: player.x, y: player.y };

        const end = camera
            ? camera.worldToScreen(orb.x, orb.y)
            : { x: orb.x, y: orb.y };

        const zoom = camera ? camera.zoom : 1.0;

        const padding = 24 * zoom;

        const left = Math.min(start.x, end.x) - padding;
        const right = Math.max(start.x, end.x) + padding;

        const top = Math.min(start.y, end.y) - padding;
        const bottom = Math.max(start.y, end.y) + padding;

        const width = right - left;
        const height = bottom - top;

        const localPosition = (point) => [
            point.x - left,
            point.y - top
        ];

        const vertices = new Float32Array([
            left,  top,       0, 1,
            right, top,       1, 1,
            left,  bottom,    0, 0,

            left,  bottom,    0, 0,
            right, top,       1, 1,
            right, bottom,    1, 0
        ]);

        gl.useProgram(shader.program);

        gl.uniform2f(
            shader.resolution,
            this.canvas.width,
            this.canvas.height
        );

        gl.uniform2f(
            shader.size,
            width,
            height
        );

        gl.uniform2fv(
            shader.start,
            localPosition(start)
        );

        gl.uniform2fv(
            shader.end,
            localPosition(end)
        );

        gl.uniform1f(shader.zoom, zoom);

        gl.uniform1f(
            shader.time,
            performance.now() * 0.001
        );

        gl.uniform4fv(
            shader.color,
            [0.45, 0.75, 1.0, 1.0]
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.DYNAMIC_DRAW
        );

        gl.enableVertexAttribArray(shader.position);

        gl.vertexAttribPointer(
            shader.position,
            2,
            gl.FLOAT,
            false,
            16,
            0
        );

        gl.enableVertexAttribArray(shader.texCoord);

        gl.vertexAttribPointer(
            shader.texCoord,
            2,
            gl.FLOAT,
            false,
            16,
            8
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }


    render(level, player, camera) {

        const gl = this.gl;

        const rect = this.canvas.getBoundingClientRect();

        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        // Resize framebuffer if client dimensions changed
        if (
            this.sceneWidth !== width ||
            this.sceneHeight !== height
        ) {
            this.resizeSceneFramebuffer();
        }

        


        // ============================================================
        // PASS 1: RENDER SCENE
        // ============================================================

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);

        gl.viewport(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.uniform1i(this.ditheringUniforms.enabled, 0);

        gl.uniform2f(
            this.resolutionLocation,
            this.canvas.width,
            this.canvas.height
        );

        this.uploadCameraSettings(camera);

        this.uploadBackgroundSettings(level.background);
        
        this.uploadWorldDithering();


        // Background
        this.renderSprite({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: this.canvas.width,
            height: this.canvas.height,
            texture: this.darkTexture
        });


        

        // Background
        this.renderSprite(level.background, camera);
        
        

        // Orbs
        for (const orb of level.orbs) {

            this.renderShape(
                orb,
                camera,
                this.orbProgram,
                [0.8, 0.85, 0.9, 1.0]
            );
        }

        this.renderPlayer(player, camera);
        // Filament connection
        if (player.engaged && player.engagedOrb) {

            this.renderFilament(
                player,
                player.engagedOrb,
                camera
            );
        }


        

        // ============================================================
        // PASS 2: DITHER FRAMEBUFFER
        // ============================================================

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.viewport(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        gl.disable(gl.BLEND);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        gl.uniform2f(
            this.resolutionLocation,
            this.canvas.width,
            this.canvas.height
        );

        gl.uniform1i(
            this.ditheringUniforms.enabled,
            this.ditheringEnabled ? 1 : 0
        );


        // Draw framebuffer texture across entire screen
        this.renderSprite({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: this.canvas.width,
            height: this.canvas.height,
            texture: this.sceneTexture
        });
    }


}
