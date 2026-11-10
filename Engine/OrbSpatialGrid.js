
export class OrbSpatialGrid {

    constructor(cellSize = 256) {

        this.cellSize = cellSize;
        this.cells = new Map();

    }

    getCellKey(x, y) {

        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);

        return `${cellX},${cellY}`;

    }

    build(orbs) {

        this.cells.clear();

        for (const orb of orbs) {

            const key = this.getCellKey(orb.x, orb.y);

            if (!this.cells.has(key)) {
                this.cells.set(key, []);
            }

            this.cells.get(key).push(orb);

        }

    }

    getNearby(x, y, radius) {

        const nearby = [];

        const minX = Math.floor((x - radius) / this.cellSize);
        const maxX = Math.floor((x + radius) / this.cellSize);

        const minY = Math.floor((y - radius) / this.cellSize);
        const maxY = Math.floor((y + radius) / this.cellSize);

        const radiusSquared = radius * radius;

        for (let cy = minY; cy <= maxY; cy++) {

            for (let cx = minX; cx <= maxX; cx++) {

                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);

                if (!cell) continue;

                for (const orb of cell) {

                    const dx = orb.x - x;
                    const dy = orb.y - y;

                    const distanceSquared = dx * dx + dy * dy;

                    if (distanceSquared <= radiusSquared) {

                        nearby.push({
                            orb,
                            distanceSquared
                        });

                    }

                }

            }

        }

        return nearby;

    }

}
