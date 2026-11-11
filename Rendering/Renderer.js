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
    loadShader(new URL("./Shaders/dithering.frag", import.meta.url)),
    loadShader(new URL("./Shaders/player.frag", import.meta.url)),
    loadShader(new URL("./Shaders/orb.frag", import.meta.url)),
    loadShader(new URL("./Shaders/filament.frag", import.meta.url))
]);


export class Renderer {


    constructor(canvas) {

        this.ditherObject = ditheringSettings;

        this.canvas = canvas;

        this.gl = canvas.getContext("webgl2");

        if (!this.gl) {
            throw new Error("WebGL 2 initialization failed.");
        }

        const gl = this.gl;

        gl.viewport(0, 0, canvas.width, canvas.height);



        this.ditheringProgram = this.createProgram(
            gl,
            vertexShaderSource,
            fragmentShaderSource
        );

        this.playerProgram = this.createProgram(
            gl,
            vertexShaderSource,
            playerShaderSource
        );

        this.orbProgram = this.createProgram(
            gl,
            vertexShaderSource,
            orbShaderSource
        );

        this.filamentProgram = this.createProgram(
            gl,
            vertexShaderSource,
            filamentShaderSource
        );


        this.ditheringEnabled = true;

        this.worldDithering = true;

        this.vertexBuffer = gl.createBuffer();


        this.playerSettings = {
            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:      { type: "2fv" },
                u_size:            { type: "2fv" },
                u_color:           { type: "4fv" },
                u_playerPosition:  { type: "2fv" },
                u_centerPosition:  { type: "2fv" },
                u_playerRadius:    { type: "1f" },
                u_rippleDistance:  { type: "1f" },
                u_zoom:            { type: "1f" },
                u_tailA:           { type: "2fv" },
                u_tailB:           { type: "2fv" },
                u_tailC:           { type: "2fv" },
                u_hasTail:         { type: "1i" },
                u_speed:           { type: "1f" },
                u_time:            { type: "1f" },
                u_showBorder:      { type: "1i" }
            }
        };

        this.orbSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:  { type: "2fv" },
                u_size:        { type: "2fv" },
                u_color:       { type: "4fv" },
                u_time:        { type: "1f" },
                u_zoom:        { type: "1f" },
                u_active:      { type: "1i" },
                u_alignment:   { type: "1f" },
                u_spinAngle:   { type: "1f" }
            }
        };

        this.filamentSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution: { type: "2fv" },
                u_size:       { type: "2fv" },
                u_start:      { type: "2fv" },
                u_end:        { type: "2fv" },
                u_zoom:       { type: "1f" },
                u_time:       { type: "1f" },
                u_color:      { type: "4fv" }
            }
        };

        this.ditheringSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:          { type: "2fv" },
                u_texture:             { type: "1i" },
                u_ditheringEnabled:    { type: "1i" },

                u_matrixSize:          { type: "1i", value: this.ditherObject.matrixSize },
                "u_bayerMatrix[0]":    { type: "1fv", value: new Float32Array(this.ditherObject.bayerMatrix) },
                "u_palette[0]":        { type: "3fv", value: new Float32Array(this.ditherObject.palette.flat().map(value => value / 255)) },
                "u_cutoffs[0]":        { type: "1fv", value: new Float32Array(this.ditherObject.cutoffs) },
                u_cutoffStrength:      { type: "1f", value: this.ditherObject.cutoffStrength },

                u_worldDithering:      { type: "1i" },
                u_backgroundPosition:  { type: "2fv" },
                u_backgroundSize:      { type: "2fv" },

                u_cameraPosition:      { type: "2fv" },
                u_zoom:                { type: "1f" }
            }
        };

        this.uploadShaderSettings(this.playerSettings, this.playerProgram);
        this.uploadShaderSettings(this.orbSettings, this.orbProgram);
        this.uploadShaderSettings(this.filamentSettings, this.filamentProgram);
        this.uploadShaderSettings(this.ditheringSettings, this.ditheringProgram);


        this.darkTexture = this.createDarkTexture();

        this.createSceneFramebuffer();
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
        };

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return {
            program,
            attributes: {},
            uniforms:{}
        };
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


    uploadShaderSettings(settings, shader) {

        const gl = this.gl;

        for (const attribute of settings.attributes) {
            shader.attributes[attribute] =
                gl.getAttribLocation(shader.program, attribute);
        }

        for (const [name, config] of Object.entries(settings.uniforms)) {

            shader.uniforms[name] = {
                location: gl.getUniformLocation(shader.program, name),
                type: config.type
            };

            if (config.value !== undefined) {
                this.uploadUniforms(shader, {
                    [name]: config.value
                });
            }
        }
    }


    uploadUniforms(program, values) {

        const gl = this.gl;

        gl.useProgram(program.program);

        for (const [name, value] of Object.entries(values)) {

            const uniform = program.uniforms[name];

            if (!uniform || uniform.location === null) continue;

            gl[`uniform${uniform.type}`](
                uniform.location,
                value
            );
        }
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
            new Uint8Array([0,0,0,255])
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        return texture;
    }


    renderQuad(shader, vertices) {

        const gl = this.gl;

        gl.useProgram(shader.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.DYNAMIC_DRAW
        );

        const position = shader.attributes.a_position;
        const texCoord = shader.attributes.a_texCoord;

        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(
            position, 2, gl.FLOAT, false, 16, 0
        );

        gl.enableVertexAttribArray(texCoord);
        gl.vertexAttribPointer(
            texCoord, 2, gl.FLOAT, false, 16, 8
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }


    createQuadVertices(left, top, right, bottom) {

        return new Float32Array([
            left,  top,       0, 1,
            right, top,       1, 1,
            left,  bottom,    0, 0,

            left,  bottom,    0, 0,
            right, top,       1, 1,
            right, bottom,    1, 0
        ]);
    }


    renderSprite(sprite, camera = null) {

        const gl = this.gl;
        const shader = this.ditheringProgram;

        if (!sprite.texture) return;

        const position = camera
            ? camera.worldToScreen(sprite.x, sprite.y)
            : { x: sprite.x, y: sprite.y };

        const zoom = camera ? camera.zoom : 1;

        const width = sprite.width * zoom;
        const height = sprite.height * zoom;

        const left = position.x - width / 2;
        const top = position.y - height / 2;

        const vertices = this.createQuadVertices(
            left,
            top,
            left + width,
            top + height
        );

        this.uploadUniforms(shader, {
            u_resolution: [this.canvas.width, this.canvas.height],
            u_texture: 0
        });

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sprite.texture);

        this.renderQuad(shader, vertices);
    }


    renderPlayer(player, camera) {

        const shader = this.playerProgram;

        const position = camera
            ? camera.worldToScreen(player.x, player.y)
            : { x: player.x, y: player.y };

        const zoom = camera ? camera.zoom : 1;

        const radius = Math.min(
            player.width,
            player.height
        ) * zoom * 0.42;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const center = {
            x: centerX,
            y: centerY
        };

        const tail = calculateTangentPoints(
            position,
            radius,
            center
        );

        const left = Math.min(position.x - radius, centerX);
        const right = Math.max(position.x + radius, centerX);

        const top = Math.min(position.y - radius, centerY);
        const bottom = Math.max(position.y + radius, centerY);

        const width = right - left;
        const height = bottom - top;

        const toLocal = (point) => [
            (point.x - left) / width,
            1.0 - (point.y - top) / height
        ];

        const playerLocalPosition = toLocal(position);
        const centerLocalPosition = toLocal(center);

        const tailA = tail ? toLocal(tail.a) : centerLocalPosition;
        const tailB = tail ? toLocal(tail.b) : centerLocalPosition;

        const vertices = this.createQuadVertices(
            left,
            top,
            right,
            bottom
        );

        const speed = Math.hypot(player.vx, player.vy);

        this.uploadUniforms(shader, {
            u_resolution: [this.canvas.width, this.canvas.height],
            u_size: [width, height],
            u_color: [1.0, 1.0, 1.0, 1.0],

            u_playerPosition: playerLocalPosition,
            u_centerPosition: centerLocalPosition,

            u_playerRadius: radius,
            u_rippleDistance: player.rippleDistance,
            u_zoom: zoom,

            u_tailA: tailA,
            u_tailB: tailB,
            u_tailC: centerLocalPosition,

            u_hasTail: tail ? 1 : 0,
            u_speed: speed,
            u_time: performance.now() * 0.001,
            u_showBorder: player.showBorder ? 1 : 0
        });

        this.renderQuad(shader, vertices);
    }


    renderFilament(player, orb, camera) {

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

        const vertices = this.createQuadVertices(
            left,
            top,
            right,
            bottom
        );

        this.uploadUniforms(shader, {
            u_resolution: [this.canvas.width, this.canvas.height],
            u_size: [width, height],

            u_start: localPosition(start),
            u_end: localPosition(end),

            u_zoom: zoom,
            u_time: performance.now() * 0.001,

            u_color: [0.45, 0.75, 1.0, 1.0]
        });

        this.renderQuad(shader, vertices);
    }


    renderOrb(orb, camera) {

        const shader = this.orbProgram;

        const position = camera
            ? camera.worldToScreen(orb.x, orb.y)
            : { x: orb.x, y: orb.y };

        const zoom = camera ? camera.zoom : 1;

        const width = orb.width * zoom;
        const height = orb.height * zoom;

        const left = position.x - width / 2;
        const top = position.y - height / 2;

        const vertices = this.createQuadVertices(
            left,
            top,
            left + width,
            top + height
        );

        this.uploadUniforms(shader, {
            u_resolution: [this.canvas.width, this.canvas.height],
            u_size: [width, height],
            u_color: [0.8, 0.85, 0.9, 1.0],

            u_time: performance.now() * 0.001,
            u_zoom: zoom,

            u_active: orb.inRange ? 1 : 0,
            u_alignment: orb.alignment,
            u_spinAngle: orb.spinAngle
        });

        this.renderQuad(shader, vertices);
    }


    renderDithering() {

        const gl = this.gl;

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

        this.uploadUniforms(this.ditheringProgram, {

            u_ditheringEnabled: this.ditheringEnabled ? 1 : 0

        });

        this.renderSprite({

            x: this.canvas.width / 2,
            y: this.canvas.height / 2,

            width: this.canvas.width,
            height: this.canvas.height,

            texture: this.sceneTexture
        });
    }


    render(level, player, camera) {

        const gl = this.gl;

        const rect = this.canvas.getBoundingClientRect();

        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        if (
            this.sceneWidth !== width ||
            this.sceneHeight !== height
        ) {
            this.resizeSceneFramebuffer();
        }


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


        this.uploadUniforms(this.ditheringProgram, {
            u_ditheringEnabled: 0
        });

        // Upload world-space dithering information
        this.uploadUniforms(this.ditheringProgram, {

            u_cameraPosition: [camera.x, camera.y],
            u_zoom: camera.zoom,

            u_backgroundPosition: [
                level.background.x,
                level.background.y
            ],

            u_backgroundSize: [
                level.background.width,
                level.background.height
            ],

            u_worldDithering: this.worldDithering ? 1 : 0
        });

        this.renderSprite({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: this.canvas.width,
            height: this.canvas.height,
            texture: this.darkTexture
        });

        this.renderSprite(level.background, camera);

        for (const orb of level.orbs) {
            this.renderOrb(orb, camera);
        }

        this.renderPlayer(player, camera);

        if (player.engaged && player.engagedOrb) {
            this.renderFilament(
                player,
                player.engagedOrb,
                camera
            );
        }

        this.renderDithering();
    }


}

