
import { loadTexture } from "./Texture.js";
import { ditheringSettings } from "./Dithering.js";
import {
    createFramebuffer,
    resizeFramebuffer,
    beginScene
} from "./Framebuffer.js";

import {
    calculateTangentPoints,
    createQuadVertices,
    createFullscreenQuad
} from "./Geometry.js";
import {
    loadShader,
    createProgram,
    uploadShaderSettings,
    uploadUniforms
} from "./Shader.js";


const [
    vertexShaderSource,
    ditheringVertexShaderSource,
    ditheringShaderSource,
    backgroundShaderSource,
    playerShaderSource,
    orbShaderSource,
    filamentShaderSource,
    gameplayButtonsShaderSource
] = await Promise.all([
    loadShader(new URL("./Shaders/vertex.vert", import.meta.url)),
    loadShader(new URL("./Shaders/dithering.vert", import.meta.url)),
    loadShader(new URL("./Shaders/dithering.frag", import.meta.url)),
    loadShader(new URL("./Shaders/background.frag", import.meta.url)),
    loadShader(new URL("./Shaders/player.frag", import.meta.url)),
    loadShader(new URL("./Shaders/orb.frag", import.meta.url)),
    loadShader(new URL("./Shaders/filament.frag", import.meta.url)),
    loadShader(new URL("./Shaders/gameplayButtons.frag", import.meta.url))
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

        this.ditheringProgram = createProgram(
            gl,
            ditheringVertexShaderSource,
            ditheringShaderSource
        );

        this.backgroundProgram = createProgram(
            gl,
            vertexShaderSource,
            backgroundShaderSource
        );

        this.playerProgram = createProgram(
            gl,
            vertexShaderSource,
            playerShaderSource
        );

        this.orbProgram = createProgram(
            gl,
            vertexShaderSource,
            orbShaderSource
        );

        this.filamentProgram = createProgram(
            gl,
            vertexShaderSource,
            filamentShaderSource
        );

        this.gameplayButtonsProgram = createProgram(
            gl,
            vertexShaderSource,
            gameplayButtonsShaderSource
        );

        this.ditheringEnabled = true;

        this.vertexBuffer = gl.createBuffer();

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

        this.gameplayButtonsSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:       { type: "2fv" },
                u_center:           { type: "2fv" },

                u_boundaryRadius:   { type: "1f" },
                u_horizontalOffset: { type: "1f" },
                u_verticalOffset:   { type: "1f" },

                u_menuHovered:      { type: "1i" },
                u_settingsHovered:  { type: "1i" },
                u_restartHovered:   { type: "1i" },
                u_pauseHovered:     { type: "1i" },

                u_menuPressed:      { type: "1i" },
                u_settingsPressed:  { type: "1i" },
                u_restartPressed:   { type: "1i" },
                u_pausePressed:     { type: "1i" },

                u_iconRadius:       { type: "1f" },

                u_menuPosition:     { type: "2fv" },
                u_settingsPosition: { type: "2fv" },
                u_restartPosition:  { type: "2fv" },
                u_pausePosition:    { type: "2fv" },

                u_isPaused:         { type: "1i" },
                u_inSettings:       { type: "1i" },
                u_inMainMenu:       { type: "1i" }
            }
        };

        uploadShaderSettings(
            gl,
            this.playerSettings,
            this.playerProgram
        );

        uploadShaderSettings(
            gl,
            this.orbSettings,
            this.orbProgram
        );

        uploadShaderSettings(
            gl,
            this.filamentSettings,
            this.filamentProgram
        );

        uploadShaderSettings(
            gl,
            this.backgroundSettings,
            this.backgroundProgram
        );

        uploadShaderSettings(
            gl,
            this.ditheringSettings,
            this.ditheringProgram
        );

        uploadShaderSettings(
            gl,
            this.gameplayButtonsSettings,
            this.gameplayButtonsProgram
        );

        this.framebuffer = createFramebuffer(gl, canvas);

        this.sceneFramebuffer = this.framebuffer.framebuffer;
        this.sceneTexture = this.framebuffer.texture;
    }



    load_render_texture(path) {

        return loadTexture(this.gl, path);
    }


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


    renderBackground(background, camera = null) {

        const gl = this.gl;
        const shader = this.backgroundProgram;


        const vertices = createQuadVertices(
            0,
            0,
            this.framebuffer.width,
            this.framebuffer.height
        );

        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.framebuffer.width,
                this.framebuffer.height
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
                background.x,
                background.y
            ],

            u_backgroundSize: [
                background.width,
                background.height
            ]
        });

        gl.activeTexture(gl.TEXTURE0);

        gl.bindTexture(
            gl.TEXTURE_2D,
            background.texture
        );

        this.renderQuad(shader, vertices);
    }


    renderPlayer(player, camera) {

        const shader = this.playerProgram;

        const cameraPosition = camera
            ? { x: camera.x, y: camera.y }
            : {
                x: this.framebuffer.width * 0.5,
                y: this.framebuffer.height * 0.5
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


        const vertices = createQuadVertices(
            0,
            0,
            this.framebuffer.width,
            this.framebuffer.height
        );


        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.framebuffer.width,
                this.framebuffer.height
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


        const vertices = createQuadVertices(
            0,
            0,
            this.framebuffer.width,
            this.framebuffer.height
        );


        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.framebuffer.width,
                this.framebuffer.height
            ],

            u_size: [
                this.framebuffer.width,
                this.framebuffer.height
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

    renderOrb(orb, camera) {

        const shader = this.orbProgram;

        const radius = Math.min(
            orb.width,
            orb.height
        ) * 0.42;


        const segments = 12;

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


        const padding = 20;

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


        const vertices = createQuadVertices(
            left,
            top,
            right,
            bottom
        );


        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.framebuffer.width,
                this.framebuffer.height
            ],

            u_size: [width, height],

            u_color: [0.8, 0.85, 0.9, 1.0],

            u_screenPosition: [
                center.x,
                center.y
            ],

            u_screenCenter: [
                this.framebuffer.width * 0.5,
                this.framebuffer.height * 0.5
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

        const vertices = createFullscreenQuad();


        uploadUniforms(this.gl, shader, {

            u_texture: 0,

            u_ditheringEnabled: this.ditheringEnabled ? 1 : 0,

            u_ditherScale: 1.0,

            u_resolution: [
                this.framebuffer.width,
                this.framebuffer.height
            ]

        });


        this.renderQuad(shader, vertices);

    }


    renderGameplay(level, player, camera) {

        this.renderBackground(level.background, camera);

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

    }

    renderGameplayButtons(buttons, gameState) {

        this.gameplayButtons = buttons;

        const shader = this.gameplayButtonsProgram;

        const vertices = createQuadVertices(
            0,
            0,
            this.framebuffer.width,
            this.framebuffer.height
        );


        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.framebuffer.width,
                this.framebuffer.height
            ],

            u_center: [
                this.framebuffer.width * 0.5,
                this.framebuffer.height * 0.5
            ],

            u_boundaryRadius: buttons.boundaryRadius,

            u_horizontalOffset: buttons.horizontalOffset,

            u_verticalOffset: buttons.verticalOffset,

            u_menuHovered: buttons.buttons.menu.hovered ? 1 : 0,

            u_menuPressed: buttons.buttons.menu.pressed ? 1 : 0,

            u_settingsHovered: buttons.buttons.settings.hovered ? 1 : 0,

            u_settingsPressed: buttons.buttons.settings.pressed ? 1 : 0,

            u_restartHovered: buttons.buttons.restart.hovered ? 1 : 0,

            u_restartPressed: buttons.buttons.restart.pressed ? 1 : 0,

            u_pauseHovered: buttons.buttons.pause.hovered ? 1 : 0,

            u_pausePressed: buttons.buttons.pause.pressed ? 1 : 0,

            u_iconRadius: buttons.circles.menu.radius,

            u_menuPosition: [
                buttons.circles.menu.x,
                buttons.circles.menu.y
            ],

            u_settingsPosition: [
                buttons.circles.settings.x,
                buttons.circles.settings.y
            ],

            u_restartPosition: [
                buttons.circles.restart.x,
                buttons.circles.restart.y
            ],

            u_pausePosition: [
                buttons.circles.pause.x,
                buttons.circles.pause.y
            ],

            u_isPaused: gameState === "PAUSED" ? 1 : 0,

            u_inSettings: gameState === "SETTINGS" ? 1 : 0,

            u_inMainMenu: gameState === "MAIN_MENU" ? 1 : 0,

        });

        this.renderQuad(shader, vertices);

    }

    renderPlaying(game) {

        this.renderGameplay(
            game.level,
            game.player,
            game.camera
        );

        this.renderGameplayButtons(
            game.gameplayButtons,
            game.stateManager.current
        );

    }


    renderMainMenu(game) {
        this.renderGameplayButtons(
            game.gameplayButtons,
            game.stateManager.current
        );

    }


    renderSettings(game) {
        this.renderGameplayButtons(
            game.gameplayButtons,
            game.stateManager.current
        );

    }


    renderLoading(game) {

    }


    renderPaused(game) {
        this.renderPlaying(game);

    }


    renderLevelFailed(game) {

    }


    renderLevelCompleted(game) {

    }

    render(game) {

        const width = this.framebuffer.width;
        const height = this.framebuffer.height;

        resizeFramebuffer(
            this.gl,
            this.canvas,
            this.framebuffer
        );

        if (
            width !== this.framebuffer.width ||
            height !== this.framebuffer.height
        ) {
            game.gameplayButtons.updateLayout();
        }

        beginScene(this.gl, this.framebuffer);

        switch (game.stateManager.current) {

            case "PLAYING":
                this.renderPlaying(game);
                break;

            case "MAIN_MENU":
                this.renderMainMenu(game);
                break;

            case "SETTINGS":
                this.renderSettings(game);
                break;

            case "LOADING":
                this.renderLoading(game);
                break;

            case "PAUSED":
                this.renderPaused(game);
                break;

            case "LEVEL_FAILED":
                this.renderLevelFailed(game);
                break;

            case "LEVEL_COMPLETED":
                this.renderLevelCompleted(game);
                break;
        }

        this.renderDithering();
    }

}
