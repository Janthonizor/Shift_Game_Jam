#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_resolution;

uniform vec2 u_cameraPosition;
uniform vec2 u_playerPosition;

uniform vec2 u_tailA;
uniform vec2 u_tailB;
uniform vec2 u_tailC;

uniform float u_zoom;
uniform float u_compression;
uniform float u_viewRadius;

uniform float u_playerRadius;
uniform float u_rippleDistance;


uniform bool u_hasTail;

out vec4 outColor;


// ============================================================
// LINE SDF
// ============================================================

float sdLine(vec2 p, vec2 a, vec2 b, vec2 insidePoint) {

    vec2 edge = b - a;

    float d = (
        edge.x * (p.y - a.y) -
        edge.y * (p.x - a.x)
    ) / length(edge);

    float referenceSide = (
        edge.x * (insidePoint.y - a.y) -
        edge.y * (insidePoint.x - a.x)
    );

    return -sign(referenceSide) * d;
}


// ============================================================
// INVERSE CAMERA PROJECTION
// ============================================================

vec2 screenToWorld(vec2 screenPosition) {

    vec2 screenDelta =
        screenPosition - u_resolution * 0.5;

    float screenRadius = length(screenDelta);

    // Radial camera projection.
    float normalizedRadius =
        screenRadius / u_viewRadius;

    // Projection asymptote.
    if (normalizedRadius >= 1.0) {
        return vec2(1e20);
    }

    float worldDistance =
        u_compression * normalizedRadius /
        (u_zoom * (1.0 - normalizedRadius));

    vec2 worldPosition = u_cameraPosition;

    if (screenRadius > 0.0001) {

        worldPosition +=
            screenDelta / screenRadius * worldDistance;
    }

    return worldPosition;
}


// ============================================================
// MAIN
// ============================================================

void main() {

    // ========================================================
    // SCREEN TO WORLD
    // ========================================================

    // gl_FragCoord has a bottom-left origin.
    // Convert to the top-left screen coordinates used by Camera.

    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );

    vec2 worldPosition = screenToWorld(screenPosition);

    // Discard fragments outside the radial projection.
    if (worldPosition.x > 1e19) {
        discard;
    }


    // ========================================================
    // PLAYER GEOMETRY
    // ========================================================

    // Everything from this point onward is world-space.

    vec2 p = worldPosition - u_playerPosition;

    float circleSDF =
        length(p) - u_playerRadius;

    float playerSDF = circleSDF;


    // ========================================================
    // PLAYER TAIL
    // ========================================================

    if (u_hasTail) {

        // Tail coordinates relative to player center.
        vec2 tailA = u_tailA - u_playerPosition;
        vec2 tailB = u_tailB - u_playerPosition;
        vec2 tailC = u_tailC - u_playerPosition;


        // Tail boundaries.
        float lineAC = sdLine(
            p, tailA, tailC, vec2(0.0)
        );

        float lineBC = sdLine(
            p, tailB, tailC, vec2(0.0)
        );

        float lineAO = sdLine(
            p, tailA, vec2(0.0), tailC
        );

        float lineBO = sdLine(
            p, tailB, vec2(0.0), tailC
        );


        // Tail wedge.
        float tailSDF = max(lineAC, lineBC);

        bool insideTail =
            lineAC <= 0.0 &&
            lineBC <= 0.0 &&
            lineAO <= 0.0 &&
            lineBO <= 0.0;


        if (insideTail) {
            playerSDF = tailSDF;
        }
        else {
            playerSDF = circleSDF;
        }
    }


    // ========================================================
    // PLAYER ALPHA
    // ========================================================

    float playerAlpha = 1.0 - smoothstep(
        -1.0,
        1.0,
        playerSDF
    );


    // ========================================================
    // CONTOUR-FOLLOWING RIPPLES
    // ========================================================

    // The SDF is already in world-space units.
    float worldDistance = playerSDF;

    // Fixed world-space ripple spacing.
    float rippleSpacing = u_playerRadius * 0.5;

    // Generate outward-moving waves.
    float wave = 0.5 + 0.5 * cos(
        (worldDistance - u_rippleDistance)
        * 6.28318530718 / rippleSpacing
    );

    float brightness = mix(0.6, 0.9, wave);
    float transparency = wave;


    // ========================================================
    // OUTPUT
    // ========================================================

    float alpha = playerAlpha * transparency;

    outColor = vec4(
        vec3(brightness),
        alpha
    );
}