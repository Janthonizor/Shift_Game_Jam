import { Camera } from "../Rendering/Camera.js";
import { Physics } from "./Physics.js";
import { OrbSpatialGrid } from "./OrbSpatialGrid.js";
import { GameState, GameStateManager } from "./GameState.js";
import { GameplayButtons } from "../UI/GameplayButtons.js";
import { ButtonLayouts } from "../UI/ButtonLayouts.js";
import { LevelManager } from "../Levels/LevelManager.js";
import { Levels } from "../Levels/levels.js";


export class Game {

    constructor(renderer) {
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;
        this.renderer = renderer;
        this.stateManager = new GameStateManager();

        this.settingsOpen = false;

        this.gameplayButtons = new GameplayButtons(renderer.canvas);
        this.checkpointRotation = 0

        this.gameplayButtons.onButtonClick = (id, action) => {
            this.handleGameplayButtonClick(id, action);

        };

        this.updateButtonConfig();

        this.orb_texture = null;
        this.checkpoint_texture = null;



        this.player = {
            x: null,
            y: null,

            radius: 45,

            mass: 200,
            moveForce: 10000,
            drag: 45,
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

        this.menuLevelSpacing = 300


        this.physics = null;
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

    updateFPS(dt) {

        this.frameCount++;
        this.fpsTimer += dt;

        if (this.fpsTimer >= 1) {

            this.fps = this.frameCount / this.fpsTimer;

            console.log(`FPS: ${this.fps.toFixed(1)}`);

            this.frameCount = 0;
            this.fpsTimer = 0;
        }

    }

    handleGameplayButtonClick(id, action) {
        console.log("Button clicked:", id, action);
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
                this.changeSelectedLevel(-1);
                break;

            case "nextMenu":
                this.changeSelectedLevel(1);
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
            
            if (this.stateManager.is(GameState.MAIN_MENU)){
                return;
            }

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

        if (nextState === GameState.MAIN_MENU) {
            this.camera.zoom = 1.0;
            this.camera.set_position(0,0);
        }

        this.clearGameplayInput();

        this.stateManager.change(nextState);

        this.updateButtonConfig();

        if (this.stateManager.isPlaying) {
            this.input.shift = this.keys.shiftPressed;
        }

    }
   

    startLevel(levelId) {

        if (!this.levelManager.isUnlocked(levelId)) {
            return;
        }

        const level = this.levelManager.createLevel(levelId);

        if (!level) return;

        this.level = level;

        this.levelManager.setCurrentLevel(levelId);

        this.physics = new Physics();
        this.checkpointRotation = 0

        // Background texture
        this.level.background.texture = this.backgroundTexture;

        // Ending checkpoint
        this.checkpointPosition = this.level.checkpoint_position;
        this.checkpointRadius = this.level.checkpoint_radius ?? 150;

        this.physics.checkpointDistance = Infinity;

        // Rebuild the orb spatial grid
        this.orbGrid = new OrbSpatialGrid(256);
        this.orbGrid.build(this.level.orbs);

        const start = this.level.start;

        // Reset player position and velocity
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

        // Reset nearby orb tracking
        this.nearbyOrbs = [];
        this.updateValidOrbs();

        // Reset camera
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

        this.updateFPS(elapsed / 1000);


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


    updateCamera(dt) {

        this.camera.reset_size(
            this.renderer.canvas.width,
            this.renderer.canvas.height
        );

        if (this.stateManager.isPlaying) {

            this.camera.set_target_position(
                this.player.x - this.player.vx * this.camera.lookBehind,
                this.player.y - this.player.vy * this.camera.lookBehind
            );

            this.camera.move_toward_target_position(dt);

        } else if (this.stateManager.current === GameState.MAIN_MENU) {

            const selectedIndex = this.levelManager.levels.findIndex(
                level => level.id === this.selectedLevelId
            );

            if (selectedIndex >=0 && selectedIndex < this.levelManager.levels.length) {

                this.camera.set_target_position(
                    selectedIndex * this.menuLevelSpacing,
                    0
                );
                this.camera.move_toward_target_position(dt, 20.0);

            }

        } else {
            return;
        }

        

    }


    updateButtonConfig() {

        const layout = {
            ...(ButtonLayouts[this.stateManager.current] ?? {})
        };

        if (this.settingsOpen) {

            if (this.stateManager.current == GameState.MAIN_MENU){
                layout.topLeft = {
                    icon: "menu",
                    action: "toggleSettings"
                };
            }


            layout.bottomLeft = {
                icon: "previous",
                action: "previousMenu"
            };

            layout.bottomRight = {
                icon: "next",
                action: "nextMenu"
            };

        }

        this.gameplayButtons.configureButtons(layout);

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

        this.updateButtonConfig();

    }


    changeSelectedLevel(direction) {

        const levels = this.levelManager.levels;

        const currentIndex = levels.findIndex(
            level => level.id === this.selectedLevelId
        );

        if (currentIndex === -1) return;

        const nextIndex = currentIndex + direction;

        if (nextIndex < 0 || nextIndex >= levels.length) return;

        this.selectedLevelId = levels[nextIndex].id;

    }


    update(dt) {

        this.updateValidOrbs();

        //checkpoin 

        const checkpointReached = this.physics.update(
            this.player,
            this.input,
            this.level.background,
            this.nearbyOrbs,
            dt,
            this.checkpointPosition,
            this.checkpointRadius,
            this.level.orbs.every(orb => orb.engagedOnce)
        );

        this.updateValidOrbs();

        this.updateOrbInteractions(dt);

        const dx = this.player.x - this.checkpointPosition[0];
        const dy = this.player.y - this.checkpointPosition[1];

        const playerDistance = Math.hypot(dx, dy);

        const proximity = Math.max(
            0,
            Math.min(1, 1 - playerDistance / this.checkpointRadius)
        );

        const rotationSpeed = 40.0 * proximity * (1.0 - proximity);

        this.checkpointRotation += rotationSpeed * dt;

        // Check for level completion
        if (checkpointReached) {

            this.levelManager.completeLevel(
                this.levelManager.currentLevelId
            );

            this.changeState(GameState.LEVEL_COMPLETED);
            return;
        }

    }

}
