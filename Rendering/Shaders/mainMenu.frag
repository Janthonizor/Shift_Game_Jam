#version 300 es

precision highp float;

uniform vec2 u_resolution;

uniform int u_levelCount;
uniform int u_levelUnlocked[32];

uniform vec2 u_cameraPosition;
uniform float u_zoom;
uniform float u_compression;
uniform float u_viewRadius;

uniform float u_levelSpacing;

out vec4 fragColor;

float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}
// Circle

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}


// Box

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;

    return length(max(d, 0.0))
         + min(max(d.x, d.y), 0.0);
}


// Rounded box

float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;

    return length(max(q, 0.0))
         + min(max(q.x, q.y), 0.0) - r;
}


// Line segment

float sdSegment(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;

    float h = clamp(
        dot(pa, ba) / dot(ba, ba),
        0.0,
        1.0
    );

    return length(pa - ba * h) - r;
}


// Padlock body and shackle

float sdLock(vec2 p) {

    // Semicircular shackle
    float outer = sdCircle(
        p - vec2(0.0, -0.3),
        0.35
    );

    float inner = sdCircle(
        p - vec2(0.0, -0.3),
        0.2
    );

    float ring = max(outer, -inner);

    // Clip the bottom half
    float shackle = max(ring, 0.4 + p.y);

    // Vertical connecting lines
    float leftSide = sdSegment(
        p,
        vec2(-0.275, -0.3),
        vec2(-0.275, 0.4),
        0.07
    );

    float rightSide = sdSegment(
        p,
        vec2(0.275, -0.3),
        vec2(0.275, 0.4),
        0.07
    );

    // Lock body
    float body = sdRoundedBox(
        p - vec2(0.0, 0.25),
        vec2(0.5, 0.35),
        0.08
    );

    float sides = smin(leftSide, rightSide, 0.04);
    float upper = smin(shackle, sides, 0.04);

    return smin(body, upper, 0.04);
}


// Draw a gradient-filled circle

float drawCircle(vec2 position, vec2 center, float radius) {

    float distanceFromCenter = length(position - center);

    return 1.0 - smoothstep(
        0.0,
        radius,
        distanceFromCenter
    );
}


void main() {

    // Circular menu boundary

    vec2 screenCenter = u_resolution * 0.5;

    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );

    float distanceFromCenter = length(
        screenPosition - screenCenter
    );

    if (distanceFromCenter > u_viewRadius) {
        discard;
    }


    // Background gradient

    float distanceFromEdge =
        u_viewRadius - distanceFromCenter;

    float gradient = smoothstep(
        0.0,
        20.0,
        distanceFromEdge
    );

    float shade = mix(
        0.0,
        0.1,
        gradient
    );


    // Level masks

    float levelMask = 0.0;
    float lockMask = 0.0;


    // Level circles

    for (int i = 0; i < u_levelCount; i++) {

        // World position

        vec2 worldPosition = vec2(
            float(i) * u_levelSpacing,
            0.0
        );


        // Camera-relative position

        vec2 delta = worldPosition - u_cameraPosition;

        float distance = length(delta);


        // Radial camera projection

        float scaledDistance = distance * u_zoom;

        float denominator =
            scaledDistance + u_compression;

        float screenRadius =
            u_viewRadius *
            scaledDistance /
            denominator;

        float projectionScale =
            screenRadius / max(distance, 0.0001);

        vec2 projectedPosition =
            screenCenter + delta * projectionScale;


        // Radial projection scale

        float radialScale =
            u_viewRadius *
            u_zoom *
            u_compression /
            (denominator * denominator);


        // Circle size

        float circleRadius = 150.0 * radialScale;


        // Fade near projection boundary

        float visibility = 1.0 - smoothstep(
            u_viewRadius * 0.95,
            u_viewRadius,
            screenRadius
        );


        // Draw circle

        float circle = drawCircle(
            screenPosition,
            projectedPosition,
            circleRadius
        );

        levelMask = max(
            levelMask,
            circle * visibility
        );


        // Check whether this level is locked

        if (u_levelUnlocked[i] == 0) {

            // Normalize icon coordinates

            vec2 iconPosition =
                (screenPosition - projectedPosition) /
                max(circleRadius * 0.75, 0.001);


            // Calculate lock shape

            float lockDistance = sdLock(iconPosition);


            // Soft edge: 8 world units

            float edgeWidth = 16.0 / 112.5;

            float lock = 1.0 - smoothstep(
                0.0,
                edgeWidth,
                lockDistance
            );


            // Lock visibility

            lockMask = max(
                lockMask,
                lock * visibility
            );
        }
    }


    // Final color

    vec3 backgroundColor = vec3(shade);
    vec3 iconColor = vec3(0.4);

    vec3 finalColor = mix(
        backgroundColor,
        iconColor,
        levelMask
    );


    // Lock color

    vec3 lockColor = vec3(0.61);

    finalColor = mix(
        finalColor,
        lockColor,
        lockMask
    );

    fragColor = vec4(finalColor, 1.0);
}
