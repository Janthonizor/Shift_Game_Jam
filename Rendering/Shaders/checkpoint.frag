#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_resolution;
uniform vec2 u_size;

uniform vec2 u_screenPosition;
uniform vec2 u_cameraPosition;
uniform vec2 u_checkpointPosition;

uniform float u_viewRadius;
uniform float u_compression;
uniform float u_zoom;
uniform float u_checkpointRadius;

uniform float u_playerDistance;
uniform float u_time;
uniform float u_rotation;
uniform vec2 u_screenCenter;
uniform bool u_checkpointUnlocked;

out vec4 outColor;


// ============================================================
// COLORS
// ============================================================

const vec3 light_color = vec3(0.45);
const vec3 dark_color  = vec3(0.20);


// ============================================================
// SOFT CIRCLE
// ============================================================

float softCircle(float distance, float radius) {

    float edge = max(fwidth(distance), 0.1);

    return 1.0 - smoothstep(
        radius - edge,
        radius + edge,
        distance
    );
}


// ============================================================
// MAIN
// ============================================================

void main() {

    // SCREEN POSITION

    vec2 screenPosition = u_screenPosition + vec2(
        (v_texCoord.x - 0.5) * u_size.x,
        (0.5 - v_texCoord.y) * u_size.y
    );

    vec2 screenDelta = screenPosition - u_screenCenter;

    float screenRadius = length(screenDelta);
    float normalizedRadius = screenRadius / u_viewRadius;

    if (normalizedRadius >= 1.0) {
        discard;
    }


    // ========================================================
    // INVERSE CAMERA PROJECTION
    // ========================================================

    float worldDistance =
        u_compression * normalizedRadius /
        (u_zoom * (1.0 - normalizedRadius));

    vec2 worldPosition = u_cameraPosition;

    if (screenRadius > 0.0001) {
        worldPosition +=
            screenDelta / screenRadius * worldDistance;
    }

    vec2 p = worldPosition - u_checkpointPosition;

    float distance = length(p);


    // ========================================================
    // OUTER CHECKPOINT RING
    // ========================================================

    float ring_thickness = 12.0;

    float ring_outer = softCircle(
        distance,
        u_checkpointRadius + ring_thickness * 0.5
    );

    float ring_inner = softCircle(
        distance,
        u_checkpointRadius - ring_thickness * 0.5
    );

    float outline = ring_outer - ring_inner;


    // ========================================================
    // CENTER CIRCLE
    // ========================================================

    float center_radius = u_checkpointRadius * 0.1;

    float center_circle = softCircle(
        distance,
        center_radius
    );


    // ========================================================
    // ORBITING DOTS
    // ========================================================

    float rotation = u_rotation;

    float orbit_radius = u_checkpointRadius * 0.3;
    float dot_radius = u_checkpointRadius * 0.03;

    float dots = 0.0;

    for (int i = 0; i < 6; i++) {

        float angle =
            float(i) * 6.28318530718 / 6.0 + rotation;

        vec2 dot_position = vec2(
            cos(angle),
            sin(angle)
        ) * orbit_radius;

        float dot_distance = length(p - dot_position);

        float dot = softCircle(
            dot_distance,
            dot_radius
        );

        dots = max(dots, dot);
    }


    // ============================================================
    // OUTPUT
    // ============================================================

    float inner_alpha = 0.0;

    if (u_checkpointUnlocked) {
        inner_alpha = max(center_circle, dots);
    }

    float shape_alpha = max(
        outline,
        inner_alpha
    );

    vec3 color = mix(
        dark_color,
        light_color,
        shape_alpha
    );

    outColor = vec4(color, shape_alpha);
}