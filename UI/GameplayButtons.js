import {calculateButtonCircleRadius} from "../Rendering/Geometry.js";

export class GameplayButtons {

    constructor(canvas) {

        this.canvas = canvas;

        this.buttons = {

            topLeft: {
                id: "topLeft",
                icon: null,
                action: null,
                hovered: false,
                pressed: false,
                enabled: false
            },

            topRight: {
                id: "topRight",
                icon: null,
                action: null,
                hovered: false,
                pressed: false,
                enabled: false
            },

            bottomLeft: {
                id: "bottomLeft",
                icon: null,
                action: null,
                hovered: false,
                pressed: false,
                enabled: false
            },

            bottomRight: {
                id: "bottomRight",
                icon: null,
                action: null,
                hovered: false,
                pressed: false,
                enabled: false
            }

        };

        this.iconIDs = {
            menu: 1,
            settings: 2,
            restart: 3,
            play: 4,
            pause: 5,
            previous: 6,
            next: 7
        };


        this.onButtonClick = null;

        // Geometry configuration
        this.boundaryMultiplier = 1.05;
        this.OffsetMultiplierX = 0.05;
        this.OffsetMultiplierY = 0.05;

        // Mouse position (drawing-buffer coordinates)
        this.mouse = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };

        this.updateLayout();

        // Mouse events
        this.canvas.addEventListener("mousemove", (event) => {
            this.updateMousePosition(event);
        });

        this.canvas.addEventListener("mouseleave", () => {
            this.clearHover();
        });

        this.canvas.addEventListener("click", (event) => {

            this.updateMousePosition(event);

            for (const button of Object.values(this.buttons)) {

                if (!button.enabled || !button.hovered) continue;

                this.onButtonClick?.(
                    button.id,
                    button.action
                );

                break;

            }

        });

        this.canvas.addEventListener("mousedown", (event) => {

            this.updateMousePosition(event);

            for (const button of Object.values(this.buttons)) {
                button.pressed = button.enabled && button.hovered;
            }

        });

        window.addEventListener("mouseup", () => {

            for (const button of Object.values(this.buttons)) {
                button.pressed = false;
            }

            this.updateHover();

        });

    }


    configureButtons(layout) {

        for (const [id, button] of Object.entries(this.buttons)) {

            const config = layout[id];

            button.icon = config?.icon ?? null;
            button.action = config?.action ?? null;
            button.enabled = config !== undefined &&
                 config.enabled !== false;

            // Clear interaction state when changing layouts.
            button.hovered = false;
            button.pressed = false;

        }

        this.updateHover();

    }


    updateMousePosition(event) {

        const rect = this.canvas.getBoundingClientRect();

        this.mouse.x =
            (event.clientX - rect.left) *
            (this.canvas.width / rect.width);

        this.mouse.y =
            (event.clientY - rect.top) *
            (this.canvas.height / rect.height);

        this.updateHover();

    }


    isInsideRegion(x, y, corner) {

        const dx = x - this.centerX;
        const dy = y - this.centerY;

        const outsideCircle =
            dx * dx + dy * dy >=
            this.boundaryRadius * this.boundaryRadius;

        if (!outsideCircle) return false;

        switch (corner) {

            case "topLeft":
                return dx <= -this.horizontalOffset &&
                       dy <= -this.verticalOffset;

            case "topRight":
                return dx >= this.horizontalOffset &&
                       dy <= -this.verticalOffset;

            case "bottomLeft":
                return dx <= -this.horizontalOffset &&
                       dy >= this.verticalOffset;

            case "bottomRight":
                return dx >= this.horizontalOffset &&
                       dy >= this.verticalOffset;

        }

        return false;

    }


    updateHover() {

        for (const [id, button] of Object.entries(this.buttons)) {

            button.hovered =
                button.enabled &&
                this.isInsideRegion(
                    this.mouse.x,
                    this.mouse.y,
                    id
                );

        }

    }


    clearHover() {

        for (const button of Object.values(this.buttons)) {
            button.hovered = false;
        }

    }


    updateLayout() {

        const width = this.canvas.width;
        const height = this.canvas.height;

        this.centerX = width / 2;
        this.centerY = height / 2;

        this.boundaryRadius =
            Math.min(width, height) * 0.5 *
            this.boundaryMultiplier;

        this.horizontalOffset =
            width * 0.5 * this.OffsetMultiplierX;

        this.verticalOffset =
            height * 0.5 * this.OffsetMultiplierY;

        const circleRadius = calculateButtonCircleRadius(
            width, 
            height,
            this.OffsetMultiplierX,
            this.OffsetMultiplierY,
            this.boundaryMultiplier
        );

        this.circles = {

            topLeft: {
                x: circleRadius,
                y: circleRadius,
                radius: circleRadius * 0.7
            },

            topRight: {
                x: width - circleRadius,
                y: circleRadius,
                radius: circleRadius * 0.7
            },

            bottomLeft: {
                x: circleRadius,
                y: height - circleRadius,
                radius: circleRadius * 0.7
            },

            bottomRight: {
                x: width - circleRadius,
                y: height - circleRadius,
                radius: circleRadius * 0.7
            }

        };

    }

}

