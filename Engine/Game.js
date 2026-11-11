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
            moveForce: 1000,
            drag: 25,
            bounciness: 0.9,

            vx: 100,
            vy: 100,

            speed: 0,
            direction: 0,

            ax: 0,
            ay: 0,

            prevVx: 0,
            prevVy: 0,

            orbRange: 450,
            engaged: false,
            engagedOrb: null,

            rippleDistance: 0,
            showBorder: false,
        };

        this.player.speed = Math.hypot(this.player.vx, this.player.vy);

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

            //testing level of randomly shifted 12 x 12 grid
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

            //eventually add checkpoints and potentially other interactive elements
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

                    if (this.input.shift) {
                        this.input.shift = false;
                    }

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

        this.level.background.texture = await this.renderer.load_render_texture(
            "./Assets/grid_background.png"
        );

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

        this.nearbyOrbs = this.orbGrid.getNearby(
            this.player.x,
            this.player.y,
            this.player.orbRange
        );


    }


    updateOrbInteractions(dt) {

        const speed = Math.hypot(this.player.vx, this.player.vy);

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

        this.camera.reset_size(this.renderer.canvas.width, this.renderer.canvas.height);

        this.camera.set_target_position(
            this.player.x - this.player.vx * this.camera.lookBehind,
            this.player.y - this.player.vy * this.camera.lookBehind
        );

        this.camera.move_toward_target_position(dt);
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

        this.updateCamera(dt);
    }


}

