#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_texture;

uniform int u_matrixSize;
uniform float u_bayerMatrix[64];

uniform vec3 u_palette[5];
uniform float u_cutoffs[4];

uniform float u_cutoffStrength;

uniform bool u_worldDithering;
uniform float u_ditherScale;

uniform bool u_ditheringEnabled;

out vec4 outColor;

void main() {

    vec4 color = texture(u_texture, v_texCoord);

    if (color.a <= 0.0) {
        discard;
    }

    if (!u_ditheringEnabled) {
        outColor = color;
        return;
    }

    float brightness = dot(
        color.rgb,
        vec3(0.299, 0.587, 0.114)
    );

    // Dither coordinates
    vec2 patternCoords = gl_FragCoord.xy;

    ivec2 pixel = ivec2(
        floor(patternCoords * u_ditherScale)
    );

    ivec2 patternPos = ivec2(
        mod(
            mod(vec2(pixel), float(u_matrixSize))
            + float(u_matrixSize),
            float(u_matrixSize)
        )
    );

    int index =
        patternPos.x +
        patternPos.y * u_matrixSize;

    float matrixCount =
        float(u_matrixSize * u_matrixSize);

    float threshold =
        (u_bayerMatrix[index] + 0.5) / matrixCount;

    float ditheredBrightness =
        brightness + (threshold - 0.5) * u_cutoffStrength;

    int paletteIndex = 0;

    for (int i = 0; i < 4; i++) {
        if (ditheredBrightness > u_cutoffs[i]) {
            paletteIndex = i + 1;
        }
    }

    outColor = vec4(
        u_palette[paletteIndex],
        color.a
    );
}
