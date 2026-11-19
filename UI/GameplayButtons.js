
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

        this.onButtonClick = null;

        // Geometry configuration
        this.boundaryMultiplier = 1.05;
        this.horizontalOffsetMultiplier = 0.05;
        this.verticalOffsetMultiplier = 0.05;

        // Mouse position (drawing-buffer coordinates)
        this.mouse = {
            x: -1,
            y: -1
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

        });

    }


    // --------------------------------------------------
    // Button configuration
    // --------------------------------------------------

    setLayout(layout) {

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

        this.clearHover();

    }


    // --------------------------------------------------
    // Mouse interaction
    // --------------------------------------------------

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


    // --------------------------------------------------
    // Button geometry
    // --------------------------------------------------

    calculateButtonCircle(width, height) {

        const centerX = width * 0.5;
        const centerY = height * 0.5;

        const boundaryRadius =
            Math.min(width, height) * 0.5 *
            this.boundaryMultiplier;

        const horizontalOffset =
            width * 0.5 *
            this.horizontalOffsetMultiplier;

        const verticalOffset =
            height * 0.5 *
            this.verticalOffsetMultiplier;

        let low = 0;

        let high = Math.min(
            (centerX - horizontalOffset) * 0.5,
            (centerY - verticalOffset) * 0.5
        );

        for (let i = 0; i < 40; i++) {

            const radius = (low + high) * 0.5;

            const distanceFromCenter = Math.hypot(
                centerX - radius,
                centerY - radius
            );

            const fits =
                distanceFromCenter >=
                boundaryRadius + radius;

            if (fits) {
                low = radius;
            }
            else {
                high = radius;
            }

        }

        return {
            x: low,
            y: low,
            radius: low
        };

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
            width * 0.5 * this.horizontalOffsetMultiplier;

        this.verticalOffset =
            height * 0.5 * this.verticalOffsetMultiplier;

        const circle = this.calculateButtonCircle(width, height);

        this.circles = {

            topLeft: {
                x: circle.x,
                y: circle.y,
                radius: circle.radius * 0.7
            },

            topRight: {
                x: width - circle.x,
                y: circle.y,
                radius: circle.radius * 0.7
            },

            bottomLeft: {
                x: circle.x,
                y: height - circle.y,
                radius: circle.radius * 0.7
            },

            bottomRight: {
                x: width - circle.x,
                y: height - circle.y,
                radius: circle.radius * 0.7
            }

        };

    }

}
