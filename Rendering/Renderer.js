
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
    ditheringVertexShaderSource,
    ditheringShaderSource,
    backgroundShaderSource,
    playerShaderSource,
    orbShaderSource,
    filamentShaderSource
] = await Promise.all([
    loadShader(new URL("./Shaders/vertex.vert", import.meta.url)),
    loadShader(new URL("./Shaders/dithering.vert", import.meta.url)),
    loadShader(new URL("./Shaders/dithering.frag", import.meta.url)),
    loadShader(new URL("./Shaders/background.frag", import.meta.url)),
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


        // ========================================================
        // SHADER PROGRAMS
        // ========================================================

        this.ditheringProgram = this.createProgram(
            gl,
            ditheringVertexShaderSource,
            ditheringShaderSource
        );

        this.backgroundProgram = this.createProgram(
            gl,
            vertexShaderSource,
            backgroundShaderSource
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

        this.vertexBuffer = gl.createBuffer();


        // ========================================================
        // PLAYER SETTINGS
        // ========================================================

        this.playerSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:       { type: "2fv" },

                u_cameraPosition:   { type: "2fv" },
                u_playerPosition:   { type: "2fv" },

                u_tailA:            { type: "2fv" },
                u_tailB:            { type: "2fv" },
                u_tailC:            { type: "2fv" },

                u_zoom:             { type: "1f" },
                u_compression:      { type: "1f" },
                u_viewRadius:       { type: "1f" },

                u_playerRadius:     { type: "1f" },
                u_rippleDistance:   { type: "1f" },

                u_color:            { type: "4fv" },

                u_radialProjection: { type: "1i" },
                u_hasTail:          { type: "1i" }
            }
        };


        // ========================================================
        // ORB SETTINGS
        // ========================================================

        this.orbSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:      { type: "2fv" },
                u_size:            { type: "2fv" },
                u_color:           { type: "4fv" },
                u_time:            { type: "1f" },
                u_zoom:            { type: "1f" },
                u_active:          { type: "1i" },
                u_alignment:       { type: "1f" },
                u_spinAngle:       { type: "1f" },
                u_screenPosition:  { type: "2fv" },
                u_screenCenter:    { type: "2fv" },
                u_orbPosition:     { type: "2fv" },

                u_cameraPosition:  { type: "2fv" },

                u_viewRadius:      { type: "1f" },
                u_compression:     { type: "1f" },
                u_orbRadius:       { type: "1f" },
            }
        };


        // ========================================================
        // FILAMENT SETTINGS
        // ========================================================

        this.filamentSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:       { type: "2fv" },
                u_size:             { type: "2fv" },

                u_start:            { type: "2fv" },
                u_end:              { type: "2fv" },

                u_cameraPosition:   { type: "2fv" },
                u_zoom:             { type: "1f" },
                u_compression:      { type: "1f" },
                u_viewRadius:       { type: "1f" },
                u_radialProjection: { type: "1i" },

                u_time:             { type: "1f" },
                u_color:            { type: "4fv" }
            }
        };


        // ========================================================
        // BACKGROUND SETTINGS
        // ========================================================

        this.backgroundSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:          { type: "2fv" },
                u_texture:             { type: "1i" },

                u_cameraPosition:      { type: "2fv" },
                u_zoom:                { type: "1f" },

                u_backgroundPosition:  { type: "2fv" },
                u_backgroundSize:      { type: "2fv" },

                u_compression:         { type: "1f" },
                u_viewRadius:          { type: "1f" }
            }
        };


        // ========================================================
        // DITHERING SETTINGS
        // ========================================================

        this.ditheringSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_texture: {
                    type: "1i"
                },

                u_ditheringEnabled: {
                    type: "1i"
                },

                "u_bayerMatrix[0]": {
                    type: "1fv",
                    value: new Float32Array(
                        this.ditherObject.bayerMatrix
                    )
                },

                "u_backgroundPalette[0]": {
                    type: "3fv",
                    value: new Float32Array(
                        this.ditherObject.backgroundPalette
                            .flat()
                            .map(value => value / 255)
                    )
                },

                "u_foregroundPalette[0]": {
                    type: "3fv",
                    value: new Float32Array(
                        this.ditherObject.foregroundPalette
                            .flat()
                            .map(value => value / 255)
                    )
                },

                u_cutoffStrength: {
                    type: "1f",
                    value: this.ditherObject.cutoffStrength
                },

                u_ditherScale: {
                    type: "1f"
                },
                u_resolution: {
                    type: "2fv"
                }
            }
        };



        // ========================================================
        // UPLOAD SHADER SETTINGS
        // ========================================================

        this.uploadShaderSettings(
            this.playerSettings,
            this.playerProgram
        );

        this.uploadShaderSettings(
            this.orbSettings,
            this.orbProgram
        );

        this.uploadShaderSettings(
            this.filamentSettings,
            this.filamentProgram
        );

        this.uploadShaderSettings(
            this.backgroundSettings,
            this.backgroundProgram
        );

        this.uploadShaderSettings(
            this.ditheringSettings,
            this.ditheringProgram
        );


        this.darkTexture = this.createDarkTexture();

        this.createSceneFramebuffer();
    }


    // ============================================================
    // SHADER CREATION
    // ============================================================

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

        return {
            program,
            attributes: {},
            uniforms: {}
        };
    }


    // ============================================================
    // FRAMEBUFFER
    // ============================================================

    createSceneFramebuffer() {

        const gl = this.gl;

        this.sceneFramebuffer = gl.createFramebuffer();
        this.sceneTexture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.NEAREST
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            gl.NEAREST
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            gl.CLAMP_TO_EDGE
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            gl.CLAMP_TO_EDGE
        );

        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            this.sceneFramebuffer
        );

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

        const dpr = window.devicePixelRatio || 1;

        const width = Math.round(rect.width * dpr);
        const height = Math.round(rect.height * dpr);

        if (width <= 0 || height <= 0) return;


        const sizeChanged =
            this.sceneWidth !== width ||
            this.sceneHeight !== height;


        // Always synchronize canvas backing dimensions.
        if (
            this.canvas.width !== width ||
            this.canvas.height !== height
        ) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        if (!sizeChanged) return;


        // Resize scene texture.
        gl.bindTexture(
            gl.TEXTURE_2D,
            this.sceneTexture
        );

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


        // Verify framebuffer.
        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            this.sceneFramebuffer
        );

        if (
            gl.checkFramebufferStatus(gl.FRAMEBUFFER) !==
            gl.FRAMEBUFFER_COMPLETE
        ) {
            throw new Error("Scene framebuffer is incomplete.");
        }


        gl.bindFramebuffer(gl.FRAMEBUFFER, null);


        this.sceneWidth = width;
        this.sceneHeight = height;


        gl.viewport(
            0,
            0,
            this.sceneWidth,
            this.sceneHeight
        );
    }


    // ============================================================
    // UNIFORMS
    // ============================================================

    uploadShaderSettings(settings, shader) {

        const gl = this.gl;

        for (const attribute of settings.attributes) {

            shader.attributes[attribute] =
                gl.getAttribLocation(
                    shader.program,
                    attribute
                );
        }

        for (const [name, config] of Object.entries(settings.uniforms)) {

            shader.uniforms[name] = {

                location: gl.getUniformLocation(
                    shader.program,
                    name
                ),

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


    // ============================================================
    // TEXTURES
    // ============================================================

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
            new Uint8Array([0, 0, 0, 255])
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.NEAREST
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            gl.NEAREST
        );

        return texture;
    }


    // ============================================================
    // GEOMETRY
    // ============================================================

    renderQuad(shader, vertices) {

        const gl = this.gl;

        gl.useProgram(shader.program);

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            this.vertexBuffer
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.DYNAMIC_DRAW
        );

        const position = shader.attributes.a_position;
        const texCoord = shader.attributes.a_texCoord;

        gl.enableVertexAttribArray(position);

        gl.vertexAttribPointer(
            position,
            2,
            gl.FLOAT,
            false,
            16,
            0
        );

        gl.enableVertexAttribArray(texCoord);

        gl.vertexAttribPointer(
            texCoord,
            2,
            gl.FLOAT,
            false,
            16,
            8
        );

        gl.drawArrays(
            gl.TRIANGLES,
            0,
            6
        );
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


    createFullscreenQuad() {

        return new Float32Array([

            -1,  1,  0, 1,
             1,  1,  1, 1,
            -1, -1,  0, 0,

            -1, -1,  0, 0,
             1,  1,  1, 1,
             1, -1,  1, 0

        ]);
    }


    // ============================================================
    // BACKGROUND
    // ============================================================

    renderSprite(sprite, camera = null) {

        const gl = this.gl;
        const shader = this.backgroundProgram;

        if (!sprite.texture) return;

        const vertices = this.createQuadVertices(
            0,
            0,
            this.sceneWidth,
            this.sceneHeight
        );

        this.uploadUniforms(shader, {

            u_resolution: [
                this.sceneWidth,
                this.sceneHeight
            ],

            u_texture: 0,

            u_cameraPosition: camera
                ? [camera.x, camera.y]
                : [0, 0],

            u_zoom: camera ? camera.zoom : 1,

            u_compression: camera
                ? camera.compression
                : 1,

            u_viewRadius: camera
                ? camera.viewRadius
                : 1,

            u_backgroundPosition: [
                sprite.x,
                sprite.y
            ],

            u_backgroundSize: [
                sprite.width,
                sprite.height
            ]
        });

        gl.activeTexture(gl.TEXTURE0);

        gl.bindTexture(
            gl.TEXTURE_2D,
            sprite.texture
        );

        this.renderQuad(shader, vertices);
    }


    // ============================================================
    // PLAYER
    // ============================================================

    renderPlayer(player, camera) {

        const shader = this.playerProgram;

        const cameraPosition = camera
            ? { x: camera.x, y: camera.y }
            : {
                x: this.sceneWidth * 0.5,
                y: this.sceneHeight * 0.5
            };

        const zoom = camera ? camera.zoom : 1.0;

        const compression = camera
            ? camera.compression
            : 1.0;

        const viewRadius = camera
            ? camera.viewRadius
            : 1.0;

        const radialProjection = camera
            ? camera.radialProjection
            : false;


        const radius = Math.min(
            player.width,
            player.height
        ) * 0.42;

        const position = {
            x: player.x,
            y: player.y
        };


        const tail = calculateTangentPoints(
            position,
            radius,
            cameraPosition
        );

        const tailA = tail
            ? [tail.a.x, tail.a.y]
            : [position.x, position.y];

        const tailB = tail
            ? [tail.b.x, tail.b.y]
            : [position.x, position.y];

        const tailC = [
            cameraPosition.x,
            cameraPosition.y
        ];


        const vertices = this.createQuadVertices(
            0,
            0,
            this.sceneWidth,
            this.sceneHeight
        );


        this.uploadUniforms(shader, {

            u_resolution: [
                this.sceneWidth,
                this.sceneHeight
            ],

            u_cameraPosition: [
                cameraPosition.x,
                cameraPosition.y
            ],

            u_playerPosition: [
                position.x,
                position.y
            ],

            u_tailA: tailA,
            u_tailB: tailB,
            u_tailC: tailC,

            u_zoom: zoom,
            u_compression: compression,
            u_viewRadius: viewRadius,

            u_playerRadius: radius,
            u_rippleDistance: player.rippleDistance,

            u_color: [1.0, 1.0, 1.0, 1.0],

            u_radialProjection: radialProjection ? 1 : 0,
            u_hasTail: tail ? 1 : 0
        });


        this.renderQuad(shader, vertices);
    }


    // ============================================================
    // FILAMENT
    // ============================================================

    renderFilament(player, orb, camera) {

        const shader = this.filamentProgram;

        const start = {
            x: player.x,
            y: player.y
        };

        const end = {
            x: orb.x,
            y: orb.y
        };


        const vertices = this.createQuadVertices(
            0,
            0,
            this.sceneWidth,
            this.sceneHeight
        );


        this.uploadUniforms(shader, {

            u_resolution: [
                this.sceneWidth,
                this.sceneHeight
            ],

            u_size: [
                this.sceneWidth,
                this.sceneHeight
            ],

            u_start: [start.x, start.y],
            u_end: [end.x, end.y],

            u_cameraPosition: [camera.x, camera.y],

            u_zoom: camera.zoom,
            u_compression: camera.compression,
            u_viewRadius: camera.viewRadius,

            u_radialProjection: camera.radialProjection ? 1 : 0,

            u_time: performance.now() * 0.001,

            u_color: [0.45, 0.75, 1.0, 1.0]
        });


        this.renderQuad(shader, vertices);
    }


    // ============================================================
    // ORBS
    // ============================================================

    renderOrb(orb, camera) {

        const shader = this.orbProgram;

        const radius = Math.min(
            orb.width,
            orb.height
        ) * 0.42;


        const segments = 48;

        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;


        for (let i = 0; i < segments; i++) {

            const angle = (i / segments) * Math.PI * 2;

            const worldX = orb.x + Math.cos(angle) * radius;
            const worldY = orb.y + Math.sin(angle) * radius;

            const screen = camera.worldToScreen(
                worldX,
                worldY
            );

            left = Math.min(left, screen.x);
            right = Math.max(right, screen.x);

            top = Math.min(top, screen.y);
            bottom = Math.max(bottom, screen.y);
        }


        const padding = 8;

        left -= padding;
        right += padding;
        top -= padding;
        bottom += padding;


        const width = right - left;
        const height = bottom - top;

        const center = {
            x: (left + right) * 0.5,
            y: (top + bottom) * 0.5
        };


        const vertices = this.createQuadVertices(
            left,
            top,
            right,
            bottom
        );


        this.uploadUniforms(shader, {

            u_resolution: [
                this.sceneWidth,
                this.sceneHeight
            ],

            u_size: [width, height],

            u_color: [0.8, 0.85, 0.9, 1.0],

            u_screenPosition: [
                center.x,
                center.y
            ],

            u_screenCenter: [
                this.sceneWidth * 0.5,
                this.sceneHeight * 0.5
            ],

            u_cameraPosition: [
                camera.x,
                camera.y
            ],

            u_viewRadius: camera.viewRadius,
            u_compression: camera.compression,
            u_zoom: camera.zoom,

            u_orbRadius: radius,

            u_time: performance.now() * 0.001,

            u_active: orb.inRange ? 1 : 0,
            u_alignment: orb.alignment,
            u_spinAngle: orb.spinAngle,

            u_orbPosition: [
                orb.x,
                orb.y
            ]
        });


        this.renderQuad(shader, vertices);
    }


    // ============================================================
    // FINAL DITHERING PASS
    // ============================================================

    renderDithering() {

        const gl = this.gl;
        const shader = this.ditheringProgram;

        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;


        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            null
        );

        gl.viewport(
            0,
            0,
            width,
            height
        );

        gl.disable(gl.BLEND);

        gl.clearColor(0, 0, 0, 1);

        gl.clear(gl.COLOR_BUFFER_BIT);



        gl.activeTexture(gl.TEXTURE0);

        gl.bindTexture(
            gl.TEXTURE_2D,
            this.sceneTexture
        );

        const vertices = this.createFullscreenQuad();


        this.uploadUniforms(shader, {

            u_texture: 0,

            u_ditheringEnabled: this.ditheringEnabled ? 1 : 0,

            u_ditherScale: 1.0,

            u_resolution: [
                this.sceneWidth,
                this.sceneHeight
            ]

        });


        this.renderQuad(shader, vertices);

    }



    render(level, player, camera) {

        const gl = this.gl;

        const rect = this.canvas.getBoundingClientRect();

        const dpr = window.devicePixelRatio || 1;

        const width = Math.round(rect.width * dpr);

        const height = Math.round(rect.height * dpr);

        if (
            this.sceneWidth !== width ||
            this.sceneHeight !== height
        ) {
            this.resizeSceneFramebuffer();
        }

        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            this.sceneFramebuffer
        );

        gl.viewport(
            0,
            0,
            this.sceneWidth,
            this.sceneHeight
        );

        gl.enable(gl.BLEND);

        gl.blendFunc(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_SRC_ALPHA
        );

        gl.clearColor(0, 0, 0, 1);

        gl.clear(gl.COLOR_BUFFER_BIT);


        this.renderSprite(
            level.background,
            camera
        );


        for (const orb of level.orbs) {

            this.renderOrb(
                orb,
                camera
            );
        }


        this.renderPlayer(
            player,
            camera
        );


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
