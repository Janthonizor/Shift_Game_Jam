#version 300 es

precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;

uniform float u_boundaryRadius;
uniform float u_horizontalOffset;
uniform float u_verticalOffset;

uniform bool u_menuHovered;
uniform bool u_settingsHovered;
uniform bool u_restartHovered;
uniform bool u_pauseHovered;
uniform bool u_menuPressed;
uniform bool u_settingsPressed;
uniform bool u_restartPressed;
uniform bool u_pausePressed;

uniform float u_iconRadius;
uniform vec2 u_menuPosition;
uniform vec2 u_settingsPosition;
uniform vec2 u_restartPosition;
uniform vec2 u_pausePosition;

uniform bool u_isPaused;
uniform bool u_inSettings;
uniform bool u_inMainMenu;

out vec4 outColor;


float softEdge(float distance, float threshold) {

    float softness = fwidth(distance) * 3.5;

    return 1.0 - smoothstep(
        threshold - softness,
        threshold + softness,
        distance
    );
}


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

    float signedDistance = distanceToEdge * (inside >= 0.0 ? -1.0 : 1.0);

    float softness = fwidth(signedDistance) * 3.5;

    return 1.0 - smoothstep(
        -softness,
        softness,
        signedDistance
    );
}


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

    float outerRing = drawCircle(
        uv,
        radius,
        0.09
    );

    return outerRing;
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

    if (u_isPaused) {
        return drawPlayIcon(uv);
    }

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


void main() {

    // Convert fragment coordinates to top-left origin.
    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );

    vec2 offset = screenPosition - u_center;

    float dx = offset.x;
    float dy = offset.y;

    float distanceFromCenter = length(offset);

    // Identify button region.
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

    // Clip to canvas and outside gameplay circle.
    bool outsideCircle =
        distanceFromCenter >= u_boundaryRadius;

    bool insideCanvas =
        screenPosition.x >= 0.0 &&
        screenPosition.x <= u_resolution.x &&
        screenPosition.y >= 0.0 &&
        screenPosition.y <= u_resolution.y;

    if (!outsideCircle || !insideCanvas) {
        discard;
    }


    bool hovered;
    bool pressed;
    vec2 iconPosition;

    if (topLeft) {
        hovered = u_menuHovered;
        pressed = u_menuPressed;
        iconPosition = u_menuPosition;
    }
    else if (topRight) {
        hovered = u_settingsHovered;
        pressed = u_settingsPressed;
        iconPosition = u_settingsPosition;
    }
    else if (bottomLeft) {
        hovered = u_restartHovered;
        pressed = u_restartPressed;
        iconPosition = u_restartPosition;
    }
    else if (bottomRight) {
        hovered = u_pauseHovered;
        pressed = u_pausePressed;
        iconPosition = u_pausePosition;
    }
    else {
        discard;
    }


    float iconScale = clamp(
        1.0 + (40.0 / u_iconRadius) * 1.1,
        0.5,
        2.0
    );


    vec2 iconUV =
        (screenPosition - iconPosition) / (u_iconRadius * iconScale);


    float circleDistance = length(
        screenPosition - iconPosition
    );

    float distanceToButtonCircle =
        circleDistance - u_iconRadius;

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


    // Find nearest edge, excluding the button circle.
    float pressedEdgeDistance = min(
        distanceToCircle,
        min(
            min(distanceToOuterX, distanceToOuterY),
            min(distanceToInnerX, distanceToInnerY)
        )
    );

    // Include the button circle for full background shading.
    float edgeDistance = min(
        pressedEdgeDistance,
        distanceToButtonCircle
    );


    // --------------------------------------------------
    // Button background shading
    // --------------------------------------------------

    float edgeWidth = 28.0;

    float edgeStrength = 1.0 - smoothstep(
        0.0,
        edgeWidth,
        edgeDistance
    );

    float circleEdgeStrength = 1.0 - smoothstep(
        0.0,
        edgeWidth,
        distanceToButtonCircle
    );

    float fillStrength = hovered ? 0.45 : 0.25;
    vec3 fillColor = vec3(fillStrength);

    float edgeColor = hovered ? 0.5 : 0.35;

    vec3 finalColor = mix(
        fillColor,
        vec3(edgeColor),
        edgeStrength
    );

    // Darken toward the inner circle boundary.
    finalColor = mix(
        finalColor,
        vec3(0.0),
        circleEdgeStrength
    );


    // --------------------------------------------------
    // Procedural button icons
    // --------------------------------------------------

    float icon = 0.0;

    if (topLeft) {
        icon = drawMenuIcon(iconUV);
    }
    else if (topRight) {
        icon = drawSettingsIcon(iconUV);
    }
    else if (bottomLeft) {
        icon = drawRestartIcon(iconUV);
    }
    else if (bottomRight) {
        icon = drawPauseIcon(iconUV);
    }

    finalColor = mix(
        finalColor,
        vec3(0.85),
        icon
    );


    // --------------------------------------------------
    // Pressed border — draw last
    // --------------------------------------------------

    float pressedBorder = 0.0;

    if (pressed) {
        pressedBorder = 1.0 - smoothstep(
            0.0,
            8.0,
            pressedEdgeDistance
        );
        finalColor = mix(
            finalColor,
            vec3(0.0),
            pressedBorder
        );
    }

    


    // --------------------------------------------------
    // Output
    // --------------------------------------------------

    float alpha = mix(0.4, 0.85, edgeStrength);
    alpha = max(alpha, pressedBorder);

    outColor = vec4(finalColor, alpha);
}
