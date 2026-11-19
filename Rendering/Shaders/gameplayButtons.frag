#version 300 es

precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;

uniform float u_boundaryRadius;
uniform float u_horizontalOffset;
uniform float u_verticalOffset;

uniform bool u_hovered[4];
uniform bool u_pressed[4];

uniform int u_icons[4];

uniform float u_iconCircleRadius;
uniform vec2 u_iconPositions[4];

out vec4 outColor;


// edge smoothing

float softEdge(float distance, float threshold) {

    float softness = fwidth(distance) * 3.5;

    return 1.0 - smoothstep(
        threshold - softness,
        threshold + softness,
        distance
    );
}

// sdf primatives

float drawLine(vec2 uv, vec2 a, vec2 b, float thickness) {

    vec2 ab = b - a;

    float t = clamp(
        dot(uv - a, ab) / dot(ab, ab),
        0.0,
        1.0
    );

    vec2 closest = a + t * ab;

    float distanceToLine = length(uv - closest);

    return softEdge(distanceToLine, thickness);
}


float drawCircle(vec2 uv, float radius, float thickness) {

    float distanceToCenter = length(uv);

    float distanceToRing = abs(distanceToCenter - radius);

    return softEdge(distanceToRing, thickness);
}


float drawBox(vec2 uv, vec2 halfSize) {

    vec2 distance = abs(uv) - halfSize;

    float outsideDistance = length(max(distance, 0.0));
    float insideDistance = min(max(distance.x, distance.y), 0.0);

    return softEdge(
        outsideDistance + insideDistance,
        0.0
    );
}


float drawFilledTriangle(vec2 uv, vec2 a, vec2 b, vec2 c) {

    vec2 e0 = b - a;
    vec2 e1 = c - b;
    vec2 e2 = a - c;

    vec2 v0 = uv - a;
    vec2 v1 = uv - b;
    vec2 v2 = uv - c;

    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);

    float distanceToEdge = sqrt(min(
        min(dot(pq0, pq0), dot(pq1, pq1)),
        dot(pq2, pq2)
    ));

    float orientation = sign(
        e0.x * e1.y - e0.y * e1.x
    );

    float d0 = orientation * (e0.x * v0.y - e0.y * v0.x);
    float d1 = orientation * (e1.x * v1.y - e1.y * v1.x);
    float d2 = orientation * (e2.x * v2.y - e2.y * v2.x);

    float inside = min(min(d0, d1), d2);

    float signedDistance =
        distanceToEdge * (inside >= 0.0 ? -1.0 : 1.0);

    float softness = fwidth(signedDistance) * 3.5;

    return 1.0 - smoothstep(
        -softness,
        softness,
        signedDistance
    );
}


// icon functions

float drawMenuIcon(vec2 uv) {

    float icon = 0.0;

    icon = max(icon, drawLine(
        uv, vec2(-0.4, -0.25), vec2(0.4, -0.25), 0.055
    ));

    icon = max(icon, drawLine(
        uv, vec2(-0.4, 0.0), vec2(0.4, 0.0), 0.055
    ));

    icon = max(icon, drawLine(
        uv, vec2(-0.4, 0.25), vec2(0.4, 0.25), 0.055
    ));

    return icon;
}


float drawSettingsIcon(vec2 uv) {

    float distance = length(uv);

    float angle = atan(uv.x, uv.y);

    float wave = sin(angle * 6.0 + 1.571) * 0.06;

    float centerFade = smoothstep(0.12, 0.22, distance);

    float radius = 0.32 + wave * centerFade;

    return drawCircle(
        uv,
        radius,
        0.09
    );
}


float drawRestartIcon(vec2 uv) {

    float angle = atan(uv.y, uv.x);

    float gapCenter = -2.0;
    float gapWidth = 0.55;

    float angleDifference = atan(
        sin(angle - gapCenter),
        cos(angle - gapCenter)
    );

    float gapMask = smoothstep(
        gapWidth * 0.5 - 0.04,
        gapWidth * 0.5 + 0.04,
        abs(angleDifference)
    );

    float ring = drawCircle(uv, 0.32, 0.075) * gapMask;

    float triangle = drawFilledTriangle(
        uv,
        vec2(0.074, -0.11),
        vec2(0.074, -0.51),
        vec2(-0.16, -0.29)
    );

    return max(ring, triangle);
}


float drawPlayIcon(vec2 uv) {

    return drawFilledTriangle(
        uv,
        vec2(-0.22, -0.35),
        vec2(-0.22, 0.35),
        vec2(0.38, 0.0)
    );
}


float drawPauseIcon(vec2 uv) {

    float leftBar = drawBox(
        uv - vec2(-0.16, 0.0),
        vec2(0.055, 0.32)
    );

    float rightBar = drawBox(
        uv - vec2(0.16, 0.0),
        vec2(0.055, 0.32)
    );

    return max(leftBar, rightBar);
}


float drawArrowIcon(vec2 uv, bool pointsRight) {

    if (pointsRight) {

        float shaft = drawLine(
            uv,
            vec2(-0.38, 0.0),
            vec2(0.22, 0.0),
            0.055
        );

        float head = drawFilledTriangle(
            uv,
            vec2(0.05, -0.28),
            vec2(0.05, 0.28),
            vec2(0.38, 0.0)
        );

        return max(shaft, head);

    }
    else {

        float shaft = drawLine(
            uv,
            vec2(0.38, 0.0),
            vec2(-0.22, 0.0),
            0.055
        );

        float head = drawFilledTriangle(
            uv,
            vec2(-0.05, -0.28),
            vec2(-0.05, 0.28),
            vec2(-0.38, 0.0)
        );

        return max(shaft, head);

    }
}


// icon decoding

float drawIcon(vec2 uv, int iconType) {

    if (iconType == 1) {
        return drawMenuIcon(uv);
    }

    if (iconType == 2) {
        return drawSettingsIcon(uv);
    }

    if (iconType == 3) {
        return drawRestartIcon(uv);
    }

    if (iconType == 4) {
        return drawPlayIcon(uv);
    }

    if (iconType == 5) {
        return drawPauseIcon(uv);
    }

    if (iconType == 6) {
        return drawArrowIcon(uv, false);
    }

    if (iconType == 7) {
        return drawArrowIcon(uv, true);
    }

    return 0.0;
}


void main() {

    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );

    // get radial coordinates from center

    vec2 offset = screenPosition - u_center;

    float dx = offset.x;
    float dy = offset.y;

    float distanceFromCenter = length(offset);


    // identify the four button square button regions

    bool topLeft =
        dx <= -u_horizontalOffset &&
        dy <= -u_verticalOffset;

    bool topRight =
        dx >= u_horizontalOffset &&
        dy <= -u_verticalOffset;

    bool bottomLeft =
        dx <= -u_horizontalOffset &&
        dy >= u_verticalOffset;

    bool bottomRight =
        dx >= u_horizontalOffset &&
        dy >= u_verticalOffset;

    // assign an index to each button region

    int buttonIndex = -1;

    if (topLeft) {
        buttonIndex = 0;
    }
    else if (topRight) {
        buttonIndex = 1;
    }
    else if (bottomLeft) {
        buttonIndex = 2;
    }
    else if (bottomRight) {
        buttonIndex = 3;
    }
    else {
        discard;
    }


    // cut the gameplay circle out of the 4 square button regions
    // u_boundaryRadius is slightly larger than the gameplay area    
    bool outsideCircle =
        distanceFromCenter >= u_boundaryRadius;

    if (!outsideCircle) {
        discard;
    }

    // read input for pressed and hovered button regions
    bool hovered = u_hovered[buttonIndex];
    bool pressed = u_pressed[buttonIndex];

    // read which icon to draw in each button region
    int iconType = u_icons[buttonIndex];

    // get a coordinate system centered on each icon circle
    vec2 iconPosition = u_iconPositions[buttonIndex];


    float iconScale = 1.7;

    vec2 iconUV =
        (screenPosition - iconPosition) /
        (u_iconCircleRadius * iconScale);


    float circleDistance = length(
        screenPosition - iconPosition
    );

    //prepare for gradients around button edges and the icon circle edge
    float distanceToButtonCircle =
        circleDistance - u_iconCircleRadius;

    float distanceToCircle =
        distanceFromCenter - u_boundaryRadius;

    float distanceToOuterX =
        dx < 0.0
            ? screenPosition.x
            : u_resolution.x - screenPosition.x;

    float distanceToOuterY =
        dy < 0.0
            ? screenPosition.y
            : u_resolution.y - screenPosition.y;

    float distanceToInnerX =
        abs(dx) - u_horizontalOffset;

    float distanceToInnerY =
        abs(dy) - u_verticalOffset;


    // get the outer edge of the button
    float outerEdgeDistance = min(
        distanceToCircle,
        min(
            min(distanceToOuterX, distanceToOuterY),
            min(distanceToInnerX, distanceToInnerY)
        )
    );

    // Include the button circle for full button shading.
    float edgeDistance = min(
        outerEdgeDistance,
        distanceToButtonCircle
    );


    // establish button gradients
    float edgeWidth = 28.0;

    float edgeGradient = 1.0 - smoothstep(
        0.0,
        edgeWidth,
        edgeDistance
    );

    float circleEdgeGradient = 1.0 - smoothstep(
        0.0,
        edgeWidth,
        distanceToButtonCircle
    );

    // lighten the button when hovered
    float fillValue = hovered ? 0.20 : 0.15;

    vec3 fillColor = vec3(fillValue);

    float edgeColor = hovered ? 0.45 : 0.35;

    vec3 finalColor = mix(
        fillColor,
        vec3(edgeColor),
        edgeGradient
    );

    // Darken toward the inner circle boundary.
    finalColor = mix(
        finalColor,
        vec3(0.0),
        circleEdgeGradient
    );

    // actually draw each icon using the coordinates centered on the icon circle
    float icon = drawIcon(iconUV, iconType);

    finalColor = mix(
        finalColor,
        vec3(0.85),
        icon
    );

    //darken the outer button edge when clicked
    float pressedBorderValue = 0.0;
    if (pressed) {

        pressedBorderValue = 1.0 - smoothstep(
            0.0,
            8.0,
            outerEdgeDistance
        );

        finalColor = mix(
            finalColor,
            vec3(0.0),
            pressedBorderValue
        );

    }

    outColor = vec4(finalColor, 1.0);

}
