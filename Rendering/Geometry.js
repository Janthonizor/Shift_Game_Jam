
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
