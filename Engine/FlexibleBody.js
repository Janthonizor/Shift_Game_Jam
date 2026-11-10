export class FlexibleBody {

    constructor() {

        this.time = 0;

        this.frequency = 4.0;
        this.amplitude = 35.0;

        this.points = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 }
        ];
    }

    update(player, anchor, dt) {

        this.time += dt;

        const dx = anchor.x - player.x;
        const dy = anchor.y - player.y;

        const length = Math.hypot(dx, dy);

        if (length < 0.001) return;

        // Direction toward anchor
        const dirX = dx / length;
        const dirY = dy / length;

        // Perpendicular direction
        const perpX = -dirY;
        const perpY = dirX;

        // Wiggle
        const speed = Math.hypot(player.vx, player.vy);

        const amplitude = Math.min(
            speed * 0.08,
            this.amplitude
        );

        const wiggle =
            Math.sin(this.time * this.frequency) * amplitude;

        // Position control points
        this.points[0] = {
            x: player.x,
            y: player.y
        };

        this.points[1] = {
            x: player.x + dirX * length * 0.5 + perpX * wiggle,
            y: player.y + dirY * length * 0.5 + perpY * wiggle
        };

        this.points[2] = {
            x: anchor.x,
            y: anchor.y
        };
    }

    getPoints() {
        return this.points;
    }
}