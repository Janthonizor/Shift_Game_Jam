import { Camera } from "../Rendering/Camera.js";
import {Physics } from "./Physics.js"
import { OrbSpatialGrid } from "./OrbSpatialGrid.js";


export class Game {

    constructor(renderer) {

        this.renderer = renderer;
        this.orb_texture = null;
        this.checkpoint_texture = null;

        this.player = {
            x: 32,
            y: 32,
            width: 128,
            height: 128,

            mass: 150,
            moveForce: 5000,
            drag: 10,
            bounciness: 0.9,

            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,

            prevVx: 0,
            prevVy: 0,
            texture: null,
            orbRange: 400,
            direction: 0,
            radius: 12,
            showBorder: false,
            engaged: false,
            engagedOrb: null,
        };

        this.camera = new Camera(renderer.canvas.width, renderer.canvas.height);
        this.camera.set_position(this.player.x, this.player.y);

        this.physics = new Physics()

        this.level = {
            background: {
                x: 5000,
                y: 5000, 
                width: 10000,
                height: 10000
            },
            orbs: Array.from({ length: 12 * 12 }, (_, i) => {

                const columns = 12;
                const spacing = 800;
                const offset = 400;

                const col = i % columns;
                const row = Math.floor(i / columns);

                return {
                    x: offset + col * spacing + (Math.random() * 200 - 100),
                    y: offset + row * spacing + (Math.random() * 200 - 100),

                    width: 128,
                    height: 128,
                    texture: null,
                    inRange: false,
                    alignment: 0,
                    tangentialVelocity: 0,
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
            g: false,
        }

        let shiftPressed = false;
        let gPressed = false;

        window.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();

            if (key === "shift") {

                if (!shiftPressed) {

                    // Disengage if already engaged
                    if (this.input.shift) {
                        this.input.shift = false;
                    }

                    // Only engage if nearby orbs exist
                    else if (this.nearbyOrbs.length > 0) {
                        this.input.shift = true;
                    }

                    shiftPressed = true;
                }

                event.preventDefault();
                return;
            }
            if (key == "g"){
                if (!gPressed) {
                    this.input.g = !this.input.g;
                    gPressed = true
                }
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
                shiftPressed = false;
                event.preventDefault();
                return;
            }
            if (key === "g") {
                gPressed = false;
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

        this.running = false;
    }
    

    async start() {

        this.player.texture = await this.renderer.load_render_texture(
            "./Assets/Player.png"
        );
        this.level.background.texture = await this.renderer.load_render_texture(
            "./Assets/grid_background.png"
        )
        this.orb_texture = await this.renderer.load_render_texture(
            "./Assets/orb.png"
        )
        for (const orb of this.level.orbs) {
            orb.texture = this.orb_texture;
        }
        console.log("Textures loaded:", this.player.texture);


        this.running = true;

        requestAnimationFrame(this.loop);
    }

    loop = (timestamp) => {

        if (!this.running) return;

        if (!this.lastTime) {
            this.lastTime = timestamp;
        }

        const dt = Math.min(
            (timestamp - this.lastTime) / 1000,
            0.05
        );

        this.lastTime = timestamp;

        this.update(dt);
        this.renderer.ditheringEnabled = !this.input.g;

        this.renderer.render(
            this.level,
            this.player,
            this.camera
        );

        requestAnimationFrame(this.loop);
    }


    updateValidOrbs() {

        const player = this.player;

        this.nearbyOrbs = this.orbGrid.getNearby(
            player.x,
            player.y,
            player.orbRange
        );


    }

    updateOrbInteractions(dt) {

        const player = this.player;

        const speed = Math.hypot(
            player.vx,
            player.vy
        );

        // Reset interaction states
        for (const orb of this.level.orbs) {
            orb.inRange = false;
            orb.alignment = 0;
            orb.tangentialVelocity = 0;
        }

        // Collect nearby orbs
        const orbsToUpdate = new Set(
            this.nearbyOrbs.map(entry => entry.orb)
        );

        // Always include the engaged orb
        if (this.physics.engagedOrb !== null) {
            orbsToUpdate.add(this.physics.engagedOrb);
            
        }

        for (const orb of orbsToUpdate) {

            const dx = player.x - orb.x;
            const dy = player.y - orb.y;

            const distance = Math.hypot(dx, dy);

            if (distance < 0.001) continue;

            orb.inRange = true;

            // Radial direction: orb -> player
            const radialX = dx / distance;
            const radialY = dy / distance;

            // Tangential direction
            const tangentX = -radialY;
            const tangentY = radialX;

            // Project player velocity onto tangent
            const tangentialVelocity =
                player.vx * tangentX +
                player.vy * tangentY;

            orb.tangentialVelocity = tangentialVelocity;

            // Alignment
            orb.alignment = speed > 0.001
                ? Math.abs(tangentialVelocity) / speed
                : 0;

            // Angular velocity
            const angularVelocity = tangentialVelocity / distance;

            // Accumulate rotation
            orb.spinAngle += angularVelocity * dt;
        }
    }


    updateCamera(dt) {

        const player = this.player;
        const lookBehind = 0.15;
        this.camera.reset_size(this.renderer.canvas.width, this.renderer.canvas.height);

        this.camera.set_target_position(
            player.x - player.vx * lookBehind,
            player.y - player.vy * lookBehind
        );

        this.camera.move_toward_target_position(dt);
    }

    //update loop
    update(dt) {

        // Find orbs for physics interactions
        this.updateValidOrbs();

        // Update physics
        this.physics.update(
            this.player,
            this.input,
            this.level.background,
            this.nearbyOrbs,
            dt
        );

        // Refresh nearby orbs using updated player position
        this.updateValidOrbs();

        // Calculate visual interaction state
        this.updateOrbInteractions(dt);

        // Update camera
        this.updateCamera(dt);
    }

}