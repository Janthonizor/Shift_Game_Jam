
export class GameplayButtons {

    constructor(canvas) {

        this.canvas = canvas;

        this.buttons = {

            menu: {
                id: "menu",
                hovered: false,
                pressed: false,
                enabled: true
            },

            settings: {
                id: "settings",
                hovered: false,
                pressed: false,
                enabled: true
            },

            restart: {
                id: "restart",
                hovered: false,
                pressed: false,
                enabled: true
            },

            pause: {
                id: "pause",
                hovered: false,
                pressed: false,
                enabled: true
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

                this.onButtonClick?.(button.id);

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

        const regions = {
            menu: "topLeft",
            settings: "topRight",
            restart: "bottomLeft",
            pause: "bottomRight"
        };

        for (const [id, corner] of Object.entries(regions)) {

            const button = this.buttons[id];

            button.hovered =
                button.enabled &&
                this.isInsideRegion(
                    this.mouse.x,
                    this.mouse.y,
                    corner
                );

        }

    }


    clearHover() {

        for (const button of Object.values(this.buttons)) {
            button.hovered = false;
        }

    }

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

        // Maximum radius allowed by the cross boundaries.
        let low = 0;

        let high = Math.min(
            (centerX - horizontalOffset) * 0.5,
            (centerY - verticalOffset) * 0.5
        );

        // Find the largest radius that also clears
        // the outer gameplay circle.
        for (let i = 0; i < 40; i++) {

            const radius = (low + high) * 0.5;

            // Center is positioned at (radius, radius),
            // making the circle tangent to the canvas edges.
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

            menu: {
                x: circle.x,
                y: circle.y,
                radius: circle.radius * 0.7
            },

            settings: {
                x: width - circle.x,
                y: circle.y,
                radius: circle.radius * 0.7
            },

            restart: {
                x: circle.x,
                y: height - circle.y,
                radius: circle.radius * 0.7
            },

            pause: {
                x: width - circle.x,
                y: height - circle.y,
                radius: circle.radius * 0.7
            }

        };

    }
}
