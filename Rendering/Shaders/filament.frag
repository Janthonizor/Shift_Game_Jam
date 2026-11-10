#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_size;
uniform vec2 u_start;
uniform vec2 u_end;

uniform float u_time;
uniform float u_zoom;

uniform vec4 u_color;

out vec4 outColor;


// ------------------------------------------------------------
// Lightning strand
// ------------------------------------------------------------

float strand(
    float across,
    float t,
    float baseOffset,
    float phase,
    float amplitude,
    float frequency,
    float thickness
) {

    // All strands converge at both endpoints.
    float envelope = sin(t * 3.14159265);

    // Multiple frequencies create irregular movement.
    float wave =
        sin(t * frequency + u_time * 5.0 + phase * 7.0) * 0.65
        +
        sin(t * frequency * 2.3 - u_time * 8.0 + phase) * 0.25;

    // Spread strands apart in the middle.
    float offset = envelope * (
        baseOffset + wave * amplitude
    );

    float d = abs(across - offset);

    // Taper the strand near its endpoints.
    float taper = mix(0.15, 1.0, envelope);

    return d - thickness * taper;
}


// ------------------------------------------------------------
// Fragment
// ------------------------------------------------------------

void main() {

    // Pixel coordinates, origin at top-left.
    vec2 p = vec2(
        v_texCoord.x * u_size.x,
        (1.0 - v_texCoord.y) * u_size.y
    );

    vec2 direction = u_end - u_start;
    float lengthLine = length(direction);

    if (lengthLine < 0.001) discard;

    direction /= lengthLine;

    vec2 normal = vec2(-direction.y, direction.x);

    vec2 relative = p - u_start;

    float along = dot(relative, direction) / lengthLine;
    float across = dot(relative, normal);

    if (along < -0.05 || along > 1.05) discard;

    float t = clamp(along, 0.0, 1.0);

    float zoomThickness = max(u_zoom, 0.5);

    float mainDistance = 1000.0;
    float bundleDistance = 1000.0;


    // --------------------------------------------------------
    // Main discharge
    // --------------------------------------------------------

    mainDistance = strand(
        across,
        t,
        0.0,
        0.0,
        3.0 * zoomThickness,
        30.0,
        1.2 * zoomThickness
    );


    // --------------------------------------------------------
    // Secondary filaments
    // --------------------------------------------------------

    for (int i = 0; i < 5; i++) {

        float fi = float(i);

        float phase = fi * 2.17;

        float side = mod(fi, 2.0) < 1.0 ? 1.0 : -1.0;

        float baseOffset =
            side * (5.0 + fi * 1.1) * zoomThickness;

        float amplitude =
            (3.0 + fi * 0.6) * zoomThickness;

        float frequency = 24.0 + fi * 8.0;

        float d = strand(
            across,
            t,
            baseOffset,
            phase,
            amplitude,
            frequency,
            (0.65 + 0.15 * mod(fi, 2.0)) * zoomThickness
        );

        bundleDistance = min(bundleDistance, d);
    }


    // --------------------------------------------------------
    // Outer glow
    // --------------------------------------------------------

    float glowDistance = min(
        mainDistance,
        bundleDistance
    );

    float glow = exp(
        -max(glowDistance, 0.0) / (8.0 * zoomThickness)
    );

    float core = 1.0 - smoothstep(
        0.0,
        1.8 * zoomThickness,
        mainDistance
    );

    float filaments = 1.0 - smoothstep(
        0.0,
        1.3 * zoomThickness,
        bundleDistance
    );


    // --------------------------------------------------------
    // Final color
    // --------------------------------------------------------

    float intensity =
        glow * 0.45
        +
        filaments * 0.85
        +
        core * 1.5;

    // Electrical pulses.
    float pulse = 0.85 + 0.15 * sin(
        u_time * 12.0 + t * 35.0
    );

    intensity *= pulse;

    vec3 color = mix(
        u_color.rgb * 0.85,
        vec3(1.0),
        core * 0.85
    );

    float alpha = clamp(
        intensity * u_color.a,
        0.0,
        1.0
    );

    if (alpha < 0.005) discard;

    outColor = vec4(color * intensity, alpha);
}
