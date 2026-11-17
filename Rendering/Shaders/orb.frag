#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_size;
uniform vec4 u_color;

uniform vec2 u_screenPosition;
uniform vec2 u_cameraPosition;
uniform vec2 u_orbPosition;

uniform float u_viewRadius;
uniform float u_compression;
uniform float u_zoom;
uniform float u_orbRadius;

uniform bool u_active;
uniform float u_alignment;
uniform float u_spinAngle;
uniform vec2 u_screenCenter;

out vec4 outColor;


void main() {

    // ============================================================
    // SCREEN POSITION
    // ============================================================

    vec2 screenPosition = u_screenPosition + vec2(
        (v_texCoord.x - 0.5) * u_size.x,
        (0.5 - v_texCoord.y) * u_size.y
    );

    vec2 screenDelta = screenPosition - u_screenCenter;

    float screenRadius = length(screenDelta);
    float normalizedRadius = screenRadius / u_viewRadius;
    
    // Camera projection has an asymptote at the view boundary
    if (normalizedRadius >= 1.0) {
        discard;
    }

    // ============================================================
    // INVERSE CAMERA PROJECTION
    // ============================================================

    float worldDistance =
        u_compression * normalizedRadius /
        (u_zoom * (1.0 - normalizedRadius));

    vec2 worldPosition = u_cameraPosition;

    if (screenRadius > 0.0001) {
        worldPosition +=
            screenDelta / screenRadius * worldDistance;
    }

    // Position relative to orb center
    vec2 p = worldPosition - u_orbPosition;

    float distance = length(p);

    // ============================================================
    // ORB OUTLINE
    // ============================================================

    float thickness = 20.0;

    float outer = 1.0 - smoothstep(
        u_orbRadius - thickness,
        u_orbRadius + thickness,
        distance
    );

    float inner = 1.0 - smoothstep(
        u_orbRadius - thickness * 2.0,
        u_orbRadius,
        distance
    );

    float outline = outer * (1.0 - inner);

    // ============================================================
    // SPINNING PATTERN
    // ============================================================

    float angle = atan(p.y, p.x);

    angle -= u_spinAngle;

    float normalizedDistance = distance / u_orbRadius;

    float pattern = cos(
        angle * 5.0 + normalizedDistance * 3.0
    );

    float patternLine = smoothstep(
        -0.3,
        0.7,
        pattern
    );

    patternLine = pow(patternLine, 1.5);

    float inside = 1.0 - smoothstep(
        u_orbRadius - 2.0,
        u_orbRadius,
        distance
    );

    float patternAlpha =
        patternLine *
        inside *
        (u_active ? 1.0 : 0.0);


    // ============================================================
    // OUTPUT
    // ============================================================

    float alpha = max(
        outline,
        patternAlpha
    );

    // Foreground palette.
    float outlineBrightness = 0.75;
    float bladeBrightness = 0.9;

    float brightness = mix(
        outlineBrightness,
        bladeBrightness,
        patternAlpha
    );

    vec3 color = vec3(brightness);

    outColor = vec4(
        color,
        u_color.a * alpha
    );
}
