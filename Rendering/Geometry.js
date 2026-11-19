export function calculateTangentPoints(player, camera) {

    const dx = camera.x - player.x;
    const dy = camera.y - player.y;

    const distance = Math.hypot(dx, dy);

    if (distance <= player.radius) {
        return {
            a: [player.x, player.y],
            b: [player.x, player.y],
            hasTail: 0
        };
    }

    const dirX = dx / distance;
    const dirY = dy / distance;

    const normalX = -dirY;
    const normalY = dirX;

    const h = player.radius * player.radius / distance;

    const v = player.radius * Math.sqrt(
        1.0 - (player.radius * player.radius) / (distance * distance)
    );

    return {
        a: [
            player.x + dirX * h + normalX * v,
            player.y + dirY * h + normalY * v
        ],

        b: [
            player.x + dirX * h - normalX * v,
            player.y + dirY * h - normalY * v
        ],

        hasTail: 1
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


export function calculateButtonCircleRadius(
    width, 
    height, 
    offsetMultiplierX, 
    offsetMultiplierY, 
    boundaryMultiplier
) 
{

    const R =
        Math.min(width, height) *
        0.5 *
        boundaryMultiplier;

    const b = -(width + height + 2 * R);

    const c =
        (width * width + height * height) * 0.25 -
        R * R;

    const discriminant = b * b - 4 * c;

    if (discriminant < 0) return 0;

    const geometricRadius = (
        -b - Math.sqrt(discriminant)
    ) * 0.5;

    const maxRadius = Math.min(
        width * 0.25 * (1 - offsetMultiplierX),
        height * 0.25 * (1 - offsetMultiplierY)
    );

    return Math.min(geometricRadius, maxRadius);
}

