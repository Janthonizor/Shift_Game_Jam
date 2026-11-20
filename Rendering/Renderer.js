
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
    checkpointShaderSource,
    filamentShaderSource,
    gameplayButtonsShaderSource,
    mainMenuShaderSource,
] = await Promise.all([
    loadShader(new URL("./Shaders/vertex.vert", import.meta.url)),
    loadShader(new URL("./Shaders/dithering.vert", import.meta.url)),
    loadShader(new URL("./Shaders/dithering.frag", import.meta.url)),
    loadShader(new URL("./Shaders/background.frag", import.meta.url)),
    loadShader(new URL("./Shaders/player.frag", import.meta.url)),
    loadShader(new URL("./Shaders/orb.frag", import.meta.url)),
    loadShader(new URL("./Shaders/checkpoint.frag", import.meta.url)),
    loadShader(new URL("./Shaders/filament.frag", import.meta.url)),
    loadShader(new URL("./Shaders/gameplayButtons.frag", import.meta.url)),
    loadShader(new URL("./Shaders/mainMenu.frag", import.meta.url))
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

        this.checkpointProgram = createProgram(
            gl,
            vertexShaderSource,
            checkpointShaderSource
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

        this.mainMenuProgram = createProgram(
            gl,
            vertexShaderSource,
            mainMenuShaderSource
        );

        
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
                u_engagedOnce:     { type: "1i" },
            }
        };

        this.checkpointSettings = {

            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:          { type: "2fv" },
                u_size:                { type: "2fv" },
                u_color:               { type: "4fv" },

                u_screenPosition:      { type: "2fv" },
                u_cameraPosition:      { type: "2fv" },
                u_checkpointPosition:  { type: "2fv" },

                u_viewRadius:          { type: "1f"  },
                u_compression:         { type: "1f"  },
                u_zoom:                { type: "1f"  },
                u_checkpointRadius:    { type: "1f"  },

                u_playerDistance:      { type: "1f"  },
                u_time:                { type: "1f"  },
                u_rotation:            { type: "1f"  },
                u_screenCenter:        { type: "2fv" },
                u_checkpointUnlocked:  { type: "1i"  },
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

                u_playerPosition:   { type: "2fv" },
                u_orbPosition:      { type: "2fv" },

                u_cameraPosition:   { type: "2fv" },
                u_zoom:             { type: "1f" },
                u_compression:      { type: "1f" },
                u_viewRadius:       { type: "1f" },
                
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
                u_resolution:           { type: "2fv" },
                u_center:               { type: "2fv" },

                u_boundaryRadius:       { type: "1f" },
                u_horizontalOffset:     { type: "1f" },
                u_verticalOffset:       { type: "1f" },

                u_iconCircleRadius:     { type: "1f" },

                "u_enabled[0]":         { type: "1iv" },
                "u_hovered[0]":         { type: "1iv" },
                "u_pressed[0]":         { type: "1iv" },
                "u_icons[0]":           { type: "1iv" },

                "u_iconPositions[0]":   { type: "2fv" }
            }

        };

        this.mainMenuSettings = {
            attributes: [
                "a_position",
                "a_texCoord"
            ],

            uniforms: {
                u_resolution:       { type: "2fv" },
                u_levelCount:       { type: "1i" },
                u_levelUnlocked:    { type: "1iv" },
                u_levelCompleted: { type: "1iv" },

                u_cameraPosition:   { type: "2fv" },
                u_zoom:             { type: "1f" },
                u_compression:      { type: "1f" },
                u_viewRadius:       { type: "1f" },

                u_levelSpacing:     { type: "1f" }
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
            this.checkpointSettings,
            this.checkpointProgram
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

        uploadShaderSettings(
            gl,
            this.mainMenuSettings,
            this.mainMenuProgram
        );

        this.ditheringEnabled = true;

        this.vertexBuffer = gl.createBuffer();

        this.framebuffer = createFramebuffer(gl, canvas);

        this.sceneTexture = this.framebuffer.texture;
        
        this.checkpointRotation = 0;
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
            this.gl.drawingBufferWidth,
            this.gl.drawingBufferHeight
        );

        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
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

        const tailPoints = calculateTangentPoints(
            player,
            camera
        );

        const vertices = createQuadVertices(
            0,
            0,
            this.gl.drawingBufferWidth,
            this.gl.drawingBufferHeight
        );


        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
            ],

            u_cameraPosition: [
                camera.x,
                camera.y
            ],

            u_playerPosition: [
                player.x,
                player.y
            ],

            u_tailA: tailPoints.a,
            u_tailB: tailPoints.b,
            u_tailC: [
                camera.x,
                camera.y
            ],

            u_zoom: camera.zoom,
            u_compression: camera.compression,
            u_viewRadius: camera.viewRadius,

            u_playerRadius: player.radius,
            u_rippleDistance: player.rippleDistance,

            u_hasTail: tailPoints.hasTail
        });


        this.renderQuad(shader, vertices);
    }


    renderFilament(player, orb, camera) {

        const shader = this.filamentProgram;

        const vertices = createQuadVertices(
            0,
            0,
            this.gl.drawingBufferWidth,
            this.gl.drawingBufferHeight
        );


        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
            ],

            u_size: [
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
            ],

            u_playerPosition: [player.x, player.y],
            u_orbPosition: [orb.x, orb.y],

            u_cameraPosition: [camera.x, camera.y],

            u_zoom: camera.zoom,
            u_compression: camera.compression,
            u_viewRadius: camera.viewRadius,


            u_time: performance.now() * 0.001,

            u_color: [0.45, 0.75, 1.0, 1.0]
        });


        this.renderQuad(shader, vertices);
    }


    renderOrb(orb, camera) {

        const shader = this.orbProgram;

        const segments = 12;

        let left = 1000.0;
        let right = -1000.0;
        let top = 1000.0;
        let bottom = -1000.0;

        let angle = 0.0;
        let worldX = 0.0;
        let worldY = 0.0;
        let screen = { x: 0.0, y: 0.0 };


        for (let i = 0; i < segments; i++) {

            angle = (i / segments) * Math.PI * 2;

            worldX = orb.x + Math.cos(angle) * orb.radius;
            worldY = orb.y + Math.sin(angle) * orb.radius;

            screen = camera.worldToScreen(
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
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
            ],

            u_size: [width, height],

            u_color: [0.3, 0.3, 0.3, 1.0],

            u_screenPosition: [
                center.x,
                center.y
            ],

            u_screenCenter: [
                this.gl.drawingBufferWidth * 0.5,
                this.gl.drawingBufferHeight * 0.5
            ],

            u_cameraPosition: [
                camera.x,
                camera.y
            ],

            u_viewRadius: camera.viewRadius,
            u_compression: camera.compression,
            u_zoom: camera.zoom,

            u_orbRadius: orb.radius,

            u_time: performance.now() * 0.001,

            u_active: orb.inRange ? 1 : 0,
            u_alignment: orb.alignment,
            u_spinAngle: orb.spinAngle,

            u_orbPosition: [
                orb.x,
                orb.y
            ],

            u_engagedOnce: orb.engagedOnce ? 1 : 0

        });


        this.renderQuad(shader, vertices);
    }


    renderCheckpoint(position, radius, player, camera, checkpointRotation, checkpointUnlocked) {

        const gl = this.gl;
        const shader = this.checkpointProgram;


        

        const screenPosition = camera.worldToScreen(
            position[0],
            position[1]
        );

        const screenRadius = radius * camera.zoom + 30;

        const left = screenPosition.x - screenRadius;
        const right = screenPosition.x + screenRadius;
        const top = screenPosition.y - screenRadius;
        const bottom = screenPosition.y + screenRadius;

        const width = right - left;
        const height = bottom - top;

        const playerDistance = Math.hypot(
            player.x - position[0],
            player.y - position[1]
        );

        const vertices = createQuadVertices(
            left,
            top,
            right,
            bottom
        );



        uploadUniforms(gl, shader, {

            u_resolution: [
                gl.drawingBufferWidth,
                gl.drawingBufferHeight
            ],

            u_size: [width, height],
            u_color: [1.0, 1.0, 1.0, 1.0],

            u_screenPosition: [
                screenPosition.x,
                screenPosition.y
            ],

            u_cameraPosition: [
                camera.x,
                camera.y
            ],

            u_checkpointPosition: position,

            u_viewRadius: camera.viewRadius,
            u_compression: camera.compression,
            u_zoom: camera.zoom,

            u_checkpointRadius: radius,
            u_playerDistance: playerDistance,

            u_time: performance.now() * 0.001,
            u_rotation: checkpointRotation,

            u_screenCenter: [
                gl.drawingBufferWidth * 0.5,
                gl.drawingBufferHeight * 0.5
            ],
            u_checkpointUnlocked: checkpointUnlocked ? 1 : 0,
        });

        this.renderQuad(shader, vertices);
    }

    
    renderDithering() {

        const gl = this.gl;
        const shader = this.ditheringProgram;


        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            null
        );

        gl.viewport(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight
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
                gl.drawingBufferWidth,
                gl.drawingBufferHeight
            ]

        });


        this.renderQuad(shader, vertices);

    }


    renderGameplay(level, player, camera, checkpointRotation, checkpointUnlocked) {

        this.renderBackground(level.background, camera);

        

        for (const orb of level.orbs) {
            this.renderOrb(orb, camera);
        }

        this.renderCheckpoint(
            level.checkpoint_position,
            level.checkpoint_radius,
            player,
            camera,
            checkpointRotation,
            checkpointUnlocked
        );

        this.renderPlayer(player, camera);

        if (player.engaged && player.engagedOrb) {
            this.renderFilament(
                player,
                player.engagedOrb,
                camera
            );
        }
        
    }


    renderGameplayButtons(gameplayButtons) {

        const shader = this.gameplayButtonsProgram;

        const vertices = createQuadVertices(
            0,
            0,
            this.gl.drawingBufferWidth,
            this.gl.drawingBufferHeight
        );


        const enabled = [];
        const hovered = [];
        const pressed = [];
        const icons = [];
        const positions = [];
        let button, circle = null;

        for (const id of Object.keys(gameplayButtons.buttons)) {

            button = gameplayButtons.buttons[id];
            circle = gameplayButtons.circles[id];

            enabled.push(button.enabled ? 1 : 0);
            hovered.push(button.hovered ? 1 : 0);
            pressed.push(button.pressed ? 1 : 0);

            icons.push(gameplayButtons.iconIDs[button.icon] ?? 0);

            positions.push(
                circle.x,
                circle.y
            );

        }

        uploadUniforms(this.gl, shader, {

            u_resolution: [
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
            ],

            u_center: [
                this.gl.drawingBufferWidth * 0.5,
                this.gl.drawingBufferHeight * 0.5
            ],

            u_boundaryRadius: gameplayButtons.boundaryRadius,
            u_horizontalOffset: gameplayButtons.horizontalOffset,
            u_verticalOffset: gameplayButtons.verticalOffset,

            u_iconCircleRadius: gameplayButtons.circles.topLeft.radius,

            "u_enabled[0]": new Int32Array(enabled),
            "u_hovered[0]": new Int32Array(hovered),
            "u_pressed[0]": new Int32Array(pressed),
            "u_icons[0]": new Int32Array(icons),

            "u_iconPositions[0]": new Float32Array(positions)

        });


        this.renderQuad(shader, vertices);

    }


    renderPlaying(game) {

        this.renderGameplay(
            game.level,
            game.player,
            game.camera,
            game.checkpointRotation,
            game.level.orbs.every(orb => orb.engagedOnce)
        );

        this.renderGameplayButtons(
            game.gameplayButtons
        );
        

    }


    renderMainMenu(game) {

        const gl = this.gl;
        const shader = this.mainMenuProgram

        const levels = game.levelManager.levels;
        const levelUnlocked = new Int32Array(
            levels.map(level =>
                game.levelManager.isUnlocked(level.id)?1:0
            )
        )
        const levelCompleted = new Int32Array(
            levels.map(level => 
                game.levelManager.isCompleted(level.id)?1:0   
            )
        )

        uploadUniforms(gl, shader, {
            u_resolution: [
                gl.drawingBufferWidth,   
                gl.drawingBufferHeight
            ],

            u_levelCount: levels.length,                        
            u_levelUnlocked: levelUnlocked,
            u_levelCompleted: levelCompleted,

            u_cameraPosition: [
                game.camera.x,
                game.camera.y
            ],

            u_zoom: game.camera.zoom,
            u_compression: game.camera.compression,
            u_viewRadius: game.camera.viewRadius,

            u_levelSpacing: game.menuLevelSpacing
        });

        const vertices = createQuadVertices(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight
        );

        this.renderQuad(shader, vertices)

        this.renderGameplayButtons(
            game.gameplayButtons
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
        this.renderGameplayButtons(
            game.gameplayButtons
        );
    }


    render(game) {
        console.log("Current game state:", game.stateManager.current);
        if (resizeFramebuffer(this.gl, this.canvas, this.framebuffer)) {
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

