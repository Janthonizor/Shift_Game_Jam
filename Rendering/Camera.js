
export class Camera {

    constructor(width, height) {

        this.x = 0;
        this.y = 0;

        this.targetX = 0;
        this.targetY = 0;

        this.smoothing = 10;
        this.lookBehind = 0.15;

        this.zoom = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 2.5;
        this.zoomSpeed = 0.001;

        this.compression = 700;

        this.width = width;
        this.height = height;

        this.radialProjection = true;

        this.viewRadius = Math.min(width, height) / 2;

    }


    adjust_zoom(delta) {

        this.zoom *= Math.exp(-delta * this.zoomSpeed);

        this.zoom = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, this.zoom)
        );

    }


    set_position(worldX, worldY) {
        this.x = worldX;
        this.y = worldY;
    }


    set_target_position(worldX, worldY) {
        this.targetX = worldX;
        this.targetY = worldY;
    }


    move_toward_target_position(dt) {

        const alpha = 1 - Math.exp(-this.smoothing * dt);

        this.x += (this.targetX - this.x) * alpha;
        this.y += (this.targetY - this.y) * alpha;

    }


    reset_size(width, height) {

        this.width = width;
        this.height = height;

        this.viewRadius = Math.min(width, height) / 2;

    }

    worldToScreen(x, y) {

        const dx = x - this.x;
        const dy = y - this.y;

        // Standard linear camera
        if (!this.radialProjection) {
            return {
                x: this.width / 2 + dx * this.zoom,
                y: this.height / 2 + dy * this.zoom
            };
        }

        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            return {
                x: this.width / 2,
                y: this.height / 2
            };
        }

        const scaledDistance = distance * this.zoom;

        const screenRadius =
            this.viewRadius *
            scaledDistance /
            (scaledDistance + this.compression);

        const scale = screenRadius / distance;

        return {
            x: this.width / 2 + dx * scale,
            y: this.height / 2 + dy * scale
        };

    }


    screenToWorld(x, y) {

        const dx = x - this.width / 2;
        const dy = y - this.height / 2;

        // Standard linear camera
        if (!this.radialProjection) {
            return {
                x: this.x + dx / this.zoom,
                y: this.y + dy / this.zoom
            };
        }

        const screenRadius = Math.hypot(dx, dy);

        if (screenRadius === 0) {
            return {
                x: this.x,
                y: this.y
            };
        }

        const normalizedRadius =
            screenRadius / this.viewRadius;

        if (normalizedRadius >= 1) {
            return null;
        }

        const worldDistance =
            this.compression * normalizedRadius /
            (this.zoom * (1 - normalizedRadius));

        const scale = worldDistance / screenRadius;

        return {
            x: this.x + dx * scale,
            y: this.y + dy * scale
        };

    }

    getProjectionScale(worldX, worldY) {

        // Standard linear camera
        if (!this.radialProjection) {
            return {
                radial: this.zoom,
                tangential: this.zoom
            };
        }

        const dx = worldX - this.x;
        const dy = worldY - this.y;

        const distance = Math.hypot(dx, dy);

        const scaledDistance = distance * this.zoom;

        const denominator =
            scaledDistance + this.compression;

        const tangentialScale =
            this.viewRadius * this.zoom / denominator;

        const radialScale =
            this.viewRadius *
            this.zoom *
            this.compression /
            (denominator * denominator);

        return {
            radial: radialScale,
            tangential: tangentialScale
        };

    }
    


}
