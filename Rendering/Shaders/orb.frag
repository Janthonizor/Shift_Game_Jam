#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_size;
uniform vec4 u_color;

uniform bool u_active;
uniform float u_alignment;
uniform float u_spinAngle;

out vec4 outColor;

void main() {

    vec2 p = (v_texCoord - 0.5) * u_size;

    float radius = min(u_size.x, u_size.y) * 0.42;

    float distance = length(p);

    // ============================================================
    // ORB OUTLINE
    // ============================================================

    float thickness = 5.0;

    float outer = 1.0 - smoothstep(
        radius - thickness,
        radius + thickness,
        distance
    );

    float inner = 1.0 - smoothstep(
        radius - thickness * 2.0,
        radius,
        distance
    );

    float outline = outer * (1.0 - inner);

    // ============================================================
    // SPINNING PATTERN
    // ============================================================

    float angle = atan(p.y, p.x);

    // Rotate according to player's angular movement
    angle += u_spinAngle;

    // Radial/angular pattern
    float pattern = cos(
        angle * 5.0 + distance * 0.08
    );

    float patternLine = smoothstep(
        -0.3,
        0.7,
        pattern
    );

    patternLine = pow(patternLine, 1.5);

    // Restrict pattern to orb interior
    float inside = 1.0 - smoothstep(
        radius - 2.0,
        radius,
        distance
    );

    // Pattern visibility controlled by active state
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

    vec3 color = mix(
        u_color.rgb,
        vec3(0.75),
        patternAlpha
    );

    outColor = vec4(
        color,
        u_color.a * alpha
    );
}
