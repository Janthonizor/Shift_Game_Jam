#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_resolution;

uniform vec2 u_cameraPosition;
uniform vec2 u_start;
uniform vec2 u_end;

uniform float u_time;
uniform float u_zoom;
uniform float u_compression;
uniform float u_viewRadius;

uniform vec4 u_color;

uniform bool u_radialProjection;

out vec4 outColor;


// ============================================================
// INVERSE CAMERA PROJECTION
// ============================================================

vec2 screenToWorld(vec2 screenPosition) {

    vec2 screenDelta =
        screenPosition - u_resolution * 0.5;

    float screenRadius = length(screenDelta);

    // Linear camera projection.
    if (!u_radialProjection) {

        return u_cameraPosition +
            screenDelta / max(u_zoom, 0.001);
    }

    // Radial camera projection.
    float normalizedRadius =
        screenRadius / u_viewRadius;

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
// LIGHTNING STRAND
// ============================================================

float strand(
    float across,
    float t,
    float baseOffset,
    float phase,
    float amplitude,
    float frequency,
    float thickness
) {

    float envelope = sin(t * 3.14159265);

    float wave =
        sin(t * frequency + u_time * 5.0 + phase * 7.0) * 0.65
        +
        sin(t * frequency * 2.3 - u_time * 8.0 + phase) * 0.25;

    float offset = envelope * (
        baseOffset + wave * amplitude
    );

    float d = abs(across - offset);

    float taper = mix(0.15, 1.0, envelope);

    return d - thickness * taper;
}


// ============================================================
// MAIN
// ============================================================

void main() {

    // ========================================================
    // SCREEN TO WORLD
    // ========================================================

    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );

    vec2 p = screenToWorld(screenPosition);

    if (p.x > 1e19) discard;


    // ========================================================
    // WORLD-SPACE FILAMENT GEOMETRY
    // ========================================================

    vec2 direction = u_end - u_start;

    float lengthLine = length(direction);

    if (lengthLine < 0.001) discard;

    direction /= lengthLine;

    vec2 normal = vec2(
        -direction.y,
        direction.x
    );

    vec2 relative = p - u_start;

    float along = dot(relative, direction) / lengthLine;
    float across = dot(relative, normal);

    if (along < -0.05 || along > 1.05) discard;

    float t = clamp(along, 0.0, 1.0);


    // ========================================================
    // MAIN DISCHARGE
    // ========================================================

    float mainDistance = strand(
        across,
        t,
        0.0,
        0.0,
        30.0,
        30.0,
        6.0
    );

    float bundleDistance = 1000.0;

    float filamentCore = 0.0;
    float filamentBody = 0.0;


    // ========================================================
    // SECONDARY FILAMENTS
    // ========================================================

    for (int i = 0; i < 4; i++) {

        float fi = float(i);

        float phase = fi * 2.17;

        float side = mod(fi, 2.0) < 1.0 ? 1.0 : -1.0;

        float baseOffset =
            side * (4.0 + fi * 2.8);

        float amplitude =
            7.0 + fi * 4.0;

        float frequency =
            14.0 + fi * 8.0;

        float thickness =
            3.0 + 0.7 * mod(fi, 2.0);

        float d = strand(
            across,
            t,
            baseOffset,
            phase,
            amplitude,
            frequency,
            thickness
        );

        bundleDistance = min(bundleDistance, d);

        float core = 1.0 - smoothstep(
            -0.5,
            0.5,
            d
        );

        float body = 1.0 - smoothstep(
            0.0,
            thickness * 1.5,
            d
        );

        filamentCore = max(filamentCore, core);
        filamentBody = max(filamentBody, body);
    }


    // ========================================================
    // OUTER GLOW
    // ========================================================

    float glowDistance = min(
        mainDistance,
        bundleDistance
    );

    float glow = exp(
        -max(glowDistance, 0.0) / 8.0
    );

    float core = 1.0 - smoothstep(
        0.0,
        1.8,
        mainDistance
    );

    float filaments = 1.0 - smoothstep(
        0.0,
        1.3,
        bundleDistance
    );

    // ========================================================
    // FINAL COLOR
    // ========================================================

    float intensity =
        glow * 0.45
        +
        filaments * 0.85
        +
        core * 1.5;

    float pulse = 0.85 + 0.15 * sin(
        u_time * 12.0 + t * 35.0
    );

    intensity *= pulse;


    // ========================================================
    // FOREGROUND GRAYSCALE
    // ========================================================
    
    float gray =
        0.02
        + glow * 0.08
        + filaments * 0.08
        + filamentBody * 0.12
        + filamentCore * 0.10
        + core * 0.10;

    gray = clamp(gray, 0.0, 0.5);

    vec3 color = vec3(gray);

    float alpha = clamp(
        intensity * u_color.a,
        0.0,
        1.0
    );

    if (alpha < 0.005) discard;

    outColor = vec4(color, alpha);
}
