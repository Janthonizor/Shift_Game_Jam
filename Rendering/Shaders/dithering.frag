#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_texture;

uniform int u_matrixSize;
uniform float u_bayerMatrix[64];

uniform vec3 u_palette[5];
uniform float u_cutoffs[4];

uniform float u_cutoffStrength;

uniform vec2 u_cameraPosition;
uniform float u_zoom;

uniform vec2 u_backgroundPosition;
uniform vec2 u_backgroundSize;

uniform bool u_worldDithering;

uniform vec2 u_resolution;

uniform bool u_ditheringEnabled;

out vec4 outColor;


void main() {

    vec4 color = texture(u_texture, v_texCoord);

    if (color.a <= 0.0) {
        discard;
    }

    // Dithering disabled
    if (!u_ditheringEnabled) {
        outColor = color;
        return;
    }


    // ============================================================
    // BRIGHTNESS
    // ============================================================

    float brightness = dot(
        color.rgb,
        vec3(0.299, 0.587, 0.114)
    );


    // ============================================================
    // DITHER COORDINATES
    // ============================================================

    ivec2 dimensions = textureSize(u_texture, 0);

    // Screen coordinates, origin at top-left
    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        float(dimensions.y) - gl_FragCoord.y
    );

    vec2 patternCoords = screenPosition;

    if (u_worldDithering) {

        vec2 backgroundTopLeft =
            u_backgroundPosition - u_backgroundSize * 0.5;

        // World-anchored phase, but screen-space cell size
        patternCoords =
            screenPosition +
            (u_cameraPosition - backgroundTopLeft) * u_zoom;
    }

    ivec2 pixel = ivec2(floor(patternCoords));

    ivec2 patternPos = ivec2(
        mod(
            mod(vec2(pixel), float(u_matrixSize))
            + float(u_matrixSize),
            float(u_matrixSize)
        )
    );

    // ============================================================
    // BAYER MATRIX
    // ============================================================

    int index =
        patternPos.x +
        patternPos.y * u_matrixSize;

    float matrixCount =
        float(u_matrixSize * u_matrixSize);

    float threshold =
        (u_bayerMatrix[index] + 0.5) / matrixCount;


    // ============================================================
    // DITHERING
    // ============================================================

    float ditheredBrightness =
        brightness + (threshold - 0.5) * u_cutoffStrength;

    int paletteIndex = 0;

    for (int i = 0; i < 4; i++) {

        if (ditheredBrightness > u_cutoffs[i]) {
            paletteIndex = i + 1;
        }
    }


    // ============================================================
    // OUTPUT
    // ============================================================

    outColor = vec4(
        u_palette[paletteIndex],
        color.a
    );
}