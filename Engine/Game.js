import { Camera } from "../Rendering/Camera.js";
import { Physics } from "./Physics.js";
import { OrbSpatialGrid } from "./OrbSpatialGrid.js";
import { GameState, GameStateManager } from "./GameState.js";
import { GameplayButtons } from "../UI/GameplayButtons.js";
import { ButtonLayouts } from "../UI/ButtonLayouts.js";
import { LevelManager } from "../Levels/LevelManager.js";
import { Levels } from "../Levels/levels.js";
import { createLevelData } from "../Levels/LevelData.js";


export class Game {

    constructor(renderer) {

        this.renderer = renderer;
        this.stateManager = new GameStateManager();

        this.settingsOpen = false;

        this.gameplayButtons = new GameplayButtons(renderer.canvas);

        this.gameplayButtons.onButtonClick = (id, action) => {
            this.handleGameplayButtonClick(id, action);
        };

        this.updateButtonLayout();

        this.orb_texture = null;
        this.checkpoint_texture = null;



        this.player = {
            x: null,
            y: null,

            width: 128,
            height: 128,

            mass: 200,
            moveForce: 1000,
            drag: 15,
            bounciness: 0.9,
            maxSpeed: 1300,

            vx: null,
            vy: null,

            speed: null,
            direction: null,

            ax: null,
            ay: null,

            prevVx: null,
            prevVy: null,

            orbRange: 650,
            engaged: false,
            engagedOrb: null,

            rippleDistance: 0,
            showBorder: true,
        };


        this.camera = new Camera(
            renderer.canvas.width,
            renderer.canvas.height
        );


        this.physics = new Physics();

        this.levelManager = new LevelManager(Levels);

        // Default main-menu selection.
        this.selectedLevelId = Levels[0]?.id ?? null;

        // No level is loaded until one is selected.
        this.level = null;
        this.orbGrid = null;
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


    handleGameplayButtonClick(id, action) {

        switch (action) {

            case "toggleSettings":
                this.toggleSettings();
                break;

            case "openMenu":
                this.settingsOpen = false;
                this.changeState(GameState.MAIN_MENU);
                break;

            case "pause":
                this.changeState(GameState.PAUSED);
                break;

            case "resume":
                this.changeState(GameState.PLAYING);
                break;

            case "startLevel":
                this.startLevel(this.selectedLevelId);
                break;

            case "restartLevel":
                this.startLevel(this.levelManager.currentLevelId);
                break;

            case "nextLevel": {

                const nextLevelId = this.levelManager.getNextLevelId();

                if (nextLevelId !== null) {
                    this.startLevel(nextLevelId);
                }

                break;
            }

            case "previousMenu":
                // Implement menu navigation later.
                break;

            case "nextMenu":
                // Implement menu navigation later.
                break;

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

        this.updateButtonLayout();

        if (this.stateManager.isPlaying) {
            this.input.shift = this.keys.shiftPressed;
        }

    }

    startLevel(levelId) {
        
        if (!this.levelManager.isUnlocked(levelId)) {
            return;
        }

        const definition = this.levelManager.getLevel(levelId);

        if (!definition) {
            console.error(`Could not find level with ID: ${levelId}`);
            return;
        }

        this.levelManager.setCurrentLevel(levelId);

        // Create a fresh runtime copy of the level.
        this.level = createLevelData(definition);

        this.level.background.texture = this.backgroundTexture;

        // Rebuild the orb spatial grid for this level.
        this.orbGrid = new OrbSpatialGrid(256);
        this.orbGrid.build(this.level.orbs);

        const start = this.level.start;

        // Reset player position and velocity.
        this.player.x = start.position.x;
        this.player.y = start.position.y;

        this.player.vx = start.speed.x;
        this.player.vy = start.speed.y;

        this.player.speed = Math.hypot(
            this.player.vx,
            this.player.vy
        );

        this.player.ax = 0;
        this.player.ay = 0;

        this.player.prevVx = this.player.vx;
        this.player.prevVy = this.player.vy;

        this.player.engaged = false;
        this.player.engagedOrb = null;
        this.player.rippleDistance = 0;

        this.physics.engagedOrb = null;

        // Reset nearby orb tracking.
        this.nearbyOrbs = [];
        this.updateValidOrbs();

        // Reset camera.
        this.camera.set_position(
            this.player.x,
            this.player.y
        );

        this.clearGameplayInput();
        this.settingsOpen = false;

        this.changeState(GameState.PLAYING);

    }


    async start() {

        this.backgroundTexture =
            await this.renderer.load_render_texture(
                "./Assets/grid_background.png"
            );

        this.changeState(GameState.MAIN_MENU);

        this.running = true;
        this.lastFrameTime = null;

        requestAnimationFrame(this.loop);

    }





    loop = (timestamp) => {

        if (!this.running) return;

        if (this.lastFrameTime === null) {
            this.lastFrameTime = timestamp;
            requestAnimationFrame(this.loop);
            return;
        }

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


    updateButtonLayout() {

        const layout = {
            ...(ButtonLayouts[this.stateManager.current] ?? {})
        };

        if (this.settingsOpen) {

            layout.topLeft = {
                icon: "menu",
                action: "toggleSettings"
            };

            layout.bottomLeft = {
                icon: "previous",
                action: "previousMenu"
            };

            layout.bottomRight = {
                icon: "next",
                action: "nextMenu"
            };

        }

        this.gameplayButtons.setLayout(layout);

    }

    toggleSettings() {

        this.settingsOpen = !this.settingsOpen;

        // Opening settings pauses active gameplay.
        if (
            this.settingsOpen &&
            this.stateManager.isPlaying
        ) {
            this.changeState(GameState.PAUSED);
            return;
        }

        this.updateButtonLayout();

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
