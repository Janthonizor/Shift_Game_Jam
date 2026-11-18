
import { Camera } from "../Rendering/Camera.js";
import { Physics } from "./Physics.js";
import { OrbSpatialGrid } from "./OrbSpatialGrid.js";
import { GameState, GameStateManager } from "./GameState.js";
import { GameplayButtons } from "../UI/GameplayButtons.js";


export class Game {

    constructor(renderer) {

        this.renderer = renderer;
        this.stateManager = new GameStateManager();

        this.gameplayButtons = new GameplayButtons(renderer.canvas);
        this.gameplayButtons.onButtonClick = (id) => {
            this.handleGameplayButtonClick(id);
        };

        this.orb_texture = null;
        this.checkpoint_texture = null;

        this.performance = {
            frameTime: 0,
            frameInterval: 0,
            averageFrameTime: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0,
            fps: 0,
            totalFrameTime: 0,
            frameCount: 0,
        };

        this.targetFrameTime = 1000 / 60;
        this.lastFrameTime = null;

        this.player = {
            x: 32,
            y: 32,

            width: 128,
            height: 128,

            mass: 200,
            moveForce: 1000,
            drag: 15,
            bounciness: 0.9,
            maxSpeed: 1300,

            vx: 100,
            vy: 100,

            speed: 0,
            direction: 0,

            ax: 0,
            ay: 0,

            prevVx: 0,
            prevVy: 0,

            orbRange: 650,
            engaged: false,
            engagedOrb: null,

            rippleDistance: 0,
            showBorder: true,
        };

        this.player.speed = Math.hypot(
            this.player.vx,
            this.player.vy
        );

        this.camera = new Camera(
            renderer.canvas.width,
            renderer.canvas.height
        );

        this.camera.set_position(
            this.player.x,
            this.player.y
        );

        this.physics = new Physics();

        this.level = {

            background: {
                x: 5000,
                y: 5000,
                width: 10000,
                height: 10000,
                texture: null
            },

            // Testing level of randomly shifted 12 x 12 grid.
            orbs: Array.from({ length: 12 * 12 }, (_, i) => {

                const columns = 12;
                const spacing = 800;
                const offset = 400;

                const col = i % columns;
                const row = Math.floor(i / columns);

                return {
                    x: offset + col * spacing + (Math.random() * 200 - 100),
                    y: offset + row * spacing + (Math.random() * 200 - 100),

                    width: 200,
                    height: 200,

                    texture: null,
                    inRange: false,
                    alignment: 0,
                    spinAngle: 0
                };

            }),

            checkpoints: [],
        };

        this.orbGrid = new OrbSpatialGrid(256);
        this.orbGrid.build(this.level.orbs);

        this.nearbyOrbs = [];

        this.input = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
        };

        this.keys = {
            shiftPressed: false,
            gPressed: false,
        };

        this.renderer.ditheringEnabled = true;

        this.setupInput();

        this.running = false;
    }


    handleGameplayButtonClick(id) {

        if (id !== "pause") return;

        if (this.stateManager.is(GameState.PLAYING)) {
            this.changeState(GameState.PAUSED);
        }
        else if (this.stateManager.is(GameState.PAUSED)) {
            this.changeState(GameState.PLAYING);
        }

    }


    setupInput() {

        window.addEventListener("keydown", (event) => {

            const key = event.key.toLowerCase();

            if (key === "g") {

                if (!this.keys.gPressed) {
                    this.renderer.ditheringEnabled =
                        !this.renderer.ditheringEnabled;

                    this.keys.gPressed = true;
                }

                event.preventDefault();
                return;
            }

            if (key === "shift") {
                this.input.shift = true;
                this.keys.shiftPressed = true;

                event.preventDefault();
                return;
            }

            if (key in this.input) {
                this.input[key] = true;
                event.preventDefault();
            }

        });


        window.addEventListener("keyup", (event) => {

            const key = event.key.toLowerCase();

            if (key === "shift") {

                this.keys.shiftPressed = false;
                this.input.shift = false;

                event.preventDefault();
                return;
            }

            if (key === "g") {

                this.keys.gPressed = false;

                event.preventDefault();
                return;
            }

            if (key in this.input) {
                this.input[key] = false;
                event.preventDefault();
            }

        });


        this.renderer.canvas.addEventListener("wheel", (event) => {

            event.preventDefault();

            this.camera.adjust_zoom(event.deltaY);

        }, { passive: false });

    }


    clearGameplayInput() {

        for (const key of Object.keys(this.input)) {
            this.input[key] = false;
        }

    }


    changeState(nextState) {

        if (this.stateManager.is(nextState)) return;

        this.clearGameplayInput();

        this.stateManager.change(nextState);

        if (this.stateManager.isPlaying) {
            this.input.shift = this.keys.shiftPressed;
        }

    }


    async start() {

        this.level.background.texture =
            await this.renderer.load_render_texture(
                "./Assets/grid_background.png"
            );

        // Temporary: start directly in gameplay until the main menu exists.
        this.changeState(GameState.PLAYING);

        this.running = true;
        this.lastFrameTime = null;

        requestAnimationFrame(this.loop);

    }


    recordFrameTime(executionTime, frameInterval) {

        const p = this.performance;

        p.frameTime = executionTime;
        p.frameInterval = frameInterval;

        p.totalFrameTime += executionTime;
        p.frameCount++;

        p.averageFrameTime =
            p.totalFrameTime / p.frameCount;

        p.minFrameTime = Math.min(
            p.minFrameTime,
            executionTime
        );

        p.maxFrameTime = Math.max(
            p.maxFrameTime,
            executionTime
        );

        p.fps = frameInterval > 0
            ? 1000 / frameInterval
            : 0;

    }


    loop = (timestamp) => {

        if (!this.running) return;

        if (this.lastFrameTime === null) {
            this.lastFrameTime = timestamp;
            requestAnimationFrame(this.loop);
            return;
        }

        const frameStart = performance.now();

        const elapsed = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;


        if (this.stateManager.isPlaying) {
            this.update(elapsed/1000);
        }
        this.updateCamera(
            elapsed / 1000,
            this.stateManager.isPlaying
        );

        this.renderer.render(this);

        const executionTime = performance.now() - frameStart;

        this.recordFrameTime(executionTime, elapsed);

        requestAnimationFrame(this.loop);

    };




    updateValidOrbs() {

        this.nearbyOrbs = this.orbGrid.getNearby(
            this.player.x,
            this.player.y,
            this.player.orbRange
        );

    }


    updateOrbInteractions(dt) {

        const speed = Math.hypot(
            this.player.vx,
            this.player.vy
        );

        for (const orb of this.level.orbs) {
            orb.inRange = false;
            orb.alignment = 0;
        }

        let activeOrb = this.physics.engagedOrb;

        if (activeOrb === null) {

            let closestDistanceSq = Infinity;

            for (const entry of this.nearbyOrbs) {

                const dx = this.player.x - entry.orb.x;
                const dy = this.player.y - entry.orb.y;

                const distanceSq = dx * dx + dy * dy;

                if (distanceSq < closestDistanceSq) {
                    closestDistanceSq = distanceSq;
                    activeOrb = entry.orb;
                }

            }

        }

        if (activeOrb === null) return;

        const dx = this.player.x - activeOrb.x;
        const dy = this.player.y - activeOrb.y;

        const distance = Math.hypot(dx, dy);

        if (distance < 0.001) return;

        activeOrb.inRange = true;

        const tangentialVelocity =
            this.player.vx * -dy / distance +
            this.player.vy * dx / distance;

        activeOrb.alignment = speed > 0.001
            ? Math.abs(tangentialVelocity) / speed
            : 0;

        const angularVelocity = tangentialVelocity / distance;

        activeOrb.spinAngle += angularVelocity * dt;

    }


    updateCamera(dt, followPlayer = true) {

        this.camera.reset_size(
            this.renderer.canvas.width,
            this.renderer.canvas.height
        );
        if (followPlayer) {
            this.camera.set_target_position(
                this.player.x - this.player.vx * this.camera.lookBehind,
                this.player.y - this.player.vy * this.camera.lookBehind
            );
            this.camera.move_toward_target_position(dt);
        }

        

    }


    update(dt) {

        this.updateValidOrbs();

        this.physics.update(
            this.player,
            this.input,
            this.level.background,
            this.nearbyOrbs,
            dt
        );

        this.updateValidOrbs();

        this.updateOrbInteractions(dt);

    }

}
