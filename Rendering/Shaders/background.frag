#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_texture;

uniform vec2 u_cameraPosition;
uniform float u_zoom;

uniform vec2 u_backgroundPosition;
uniform vec2 u_backgroundSize;

uniform vec2 u_resolution;

uniform float u_compression;
uniform float u_viewRadius;

out vec4 outColor;

void main() {

    vec2 screenCenter = u_resolution * 0.5;

    // Screen coordinates, origin at top-left
    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );

    vec2 offset = screenPosition - screenCenter;

    float screenRadius = length(offset);

    if (screenRadius >= u_viewRadius) {
        discard;
    }

    float normalizedRadius = screenRadius / u_viewRadius;

    float worldDistance =
        u_compression * normalizedRadius /
        (u_zoom * (1.0 - normalizedRadius));

    vec2 worldPosition = u_cameraPosition;

    if (screenRadius > 0.0) {
        worldPosition += normalize(offset) * worldDistance;
    }

    vec2 backgroundTopLeft =
        u_backgroundPosition - u_backgroundSize * 0.5;

    vec2 worldUV =
        (worldPosition - backgroundTopLeft) / u_backgroundSize;

    vec2 sampleUV = vec2(worldUV.x, 1.0 - worldUV.y);

    if (
        sampleUV.x < 0.0 || sampleUV.x > 1.0 ||
        sampleUV.y < 0.0 || sampleUV.y > 1.0
    ) {
        discard;
    }

    outColor = texture(u_texture, sampleUV);
}
