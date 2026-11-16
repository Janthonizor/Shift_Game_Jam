#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_texture;

uniform bool u_ditheringEnabled;
uniform int u_matrixSize;
uniform float u_bayerMatrix[64];

uniform vec3 u_palette[5];
uniform float u_cutoffs[4];

uniform float u_cutoffStrength;
uniform float u_ditherScale;

out vec4 outColor;

void main()
{
    vec4 color = texture(u_texture, v_texCoord);

    if (!u_ditheringEnabled) {
        outColor = color;
        return;
    }

    ivec2 pixel = ivec2(
        floor(gl_FragCoord.xy / u_ditherScale)
    );

    int x = pixel.x % u_matrixSize;
    int y = pixel.y % u_matrixSize;

    int index = y * u_matrixSize + x;

    float threshold = u_bayerMatrix[index] / 64.0;

    float luminance = dot(
        color.rgb,
        vec3(0.299, 0.587, 0.114)
    );

    float adjusted = luminance + 
        (threshold - 0.5) * u_cutoffStrength;

    int paletteIndex = 0;

    for (int i = 0; i < 4; i++) {
        if (adjusted > u_cutoffs[i]) {
            paletteIndex = i + 1;
        }
    }

    outColor = vec4(
        u_palette[paletteIndex],
        color.a
    );
}