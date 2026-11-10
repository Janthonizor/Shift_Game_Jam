export class Camera {

    constructor(width, height) {

        this.x = 0;
        this.y = 0;

        this.targetX = 0;
        this.targetY = 0;

        this.smoothing = 9;

        this.zoom = 0.8;
        this.minZoom = 0.2;
        this.maxZoom = 3.0;
        this.zoomSpeed = 0.001;

        this.width = width;
        this.height = height;
        
    }
    adjust_zoom(delta) {

        this.zoom *= Math.exp(-delta * this.zoomSpeed);

        this.zoom = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, this.zoom)
        );

    }

    set_position(worldX, worldY){
        this.x = worldX,
        this.y = worldY
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
    }

    // World coordinates -> Screen coordinates

    worldToScreen(x, y) {
        const total_zoom = this.zoom;

        return {
            x: (x - this.x) * total_zoom + this.width / 2,
            y: (y - this.y) * total_zoom + this.height / 2
        };
    }


    // Screen coordinates -> World coordinates

    screenToWorld(x, y) {
        const total_zoom = this.zoom
        return {
            x: (x - this.width / 2) / total_zoom + this.x,
            y: (y - this.height / 2) / total_zoom + this.y
        };
    }
}