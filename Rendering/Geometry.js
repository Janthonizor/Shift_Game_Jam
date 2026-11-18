
export function calculateTangentPoints(
    playerPosition,
    radius,
    markerPosition
) {

    const dx = markerPosition.x - playerPosition.x;
    const dy = markerPosition.y - playerPosition.y;

    const distance = Math.hypot(dx, dy);

    if (distance <= radius) {
        return null;
    }

    const dirX = dx / distance;
    const dirY = dy / distance;

    const normalX = -dirY;
    const normalY = dirX;

    const h = radius * radius / distance;

    const v = radius * Math.sqrt(
        1.0 - (radius * radius) / (distance * distance)
    );

    return {
        a: {
            x: playerPosition.x + dirX * h + normalX * v,
            y: playerPosition.y + dirY * h + normalY * v
        },

        b: {
            x: playerPosition.x + dirX * h - normalX * v,
            y: playerPosition.y + dirY * h - normalY * v
        },

        c: markerPosition
    };
}


export function createQuadVertices(left, top, right, bottom) {

    return new Float32Array([

        left,  top,       0, 1,
        right, top,       1, 1,
        left,  bottom,    0, 0,

        left,  bottom,    0, 0,
        right, top,       1, 1,
        right, bottom,    1, 0

    ]);
}

export function createFullscreenQuad() {

    return new Float32Array([

        -1,  1,  0, 1,
            1,  1,  1, 1,
        -1, -1,  0, 0,

        -1, -1,  0, 0,
            1,  1,  1, 1,
            1, -1,  1, 0

    ]);
}

