export class Camera {

    constructor(width, height) {

        this.x = 0;
        this.y = 0;

        this.targetX = 0;
        this.targetY = 0;

        this.smoothing = 9;
        this.lookBehind = 0.15;

        this.zoom = 0.4;
        this.minZoom = 0.15;
        this.maxZoom = 1.5;
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
    }


    worldToScreen(x, y) {
        return {
            x: (x - this.x) * this.zoom + this.width / 2,
            y: (y - this.y) * this.zoom + this.height / 2
        };
    }


    screenToWorld(x, y) {
        return {
            x: (x - this.width / 2) / this.zoom + this.x,
            y: (y - this.height / 2) / this.zoom + this.y
        };
    }

}

