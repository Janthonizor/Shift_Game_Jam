#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_texture;
uniform vec2 u_resolution;

uniform bool u_ditheringEnabled;
uniform float u_bayerMatrix[64];

uniform vec3 u_backgroundPalette[8];
uniform vec3 u_foregroundPalette[8];

uniform float u_cutoffStrength;
uniform float u_ditherScale;

out vec4 outColor;

void main()
{
    // ========================================================
    // FRAMEBUFFER PIXEL QUANTIZATION
    // ========================================================

    float scale = max(u_ditherScale, 1.0);

    // Identify the lower-left corner of the current pixel block.
    vec2 pixelBlock = floor(
        gl_FragCoord.xy / scale
    );

    // Sample from the center of that block.
    vec2 samplePosition =
        (pixelBlock + 0.5) * scale;

    vec2 sampleUV = samplePosition / u_resolution;

    // Clamp edge samples to the framebuffer.
    sampleUV = clamp(
        sampleUV,
        vec2(0.5) / u_resolution,
        vec2(1.0) - vec2(0.5) / u_resolution
    );

    vec4 color = texture(u_texture, sampleUV);

    if (!u_ditheringEnabled) {
        outColor = color;
        return;
    }

    // ========================================================
    // BAYER MATRIX
    // ========================================================

    ivec2 pixel = ivec2(pixelBlock);

    int x = pixel.x % 4;
    int y = pixel.y % 4;

    int index = y * 4 + x;

    float threshold = (
        u_bayerMatrix[index] + 0.5
    ) / 16.0;

    // ========================================================
    // LUMINANCE
    // ========================================================

    float luminance = dot(
        color.rgb,
        vec3(0.299, 0.587, 0.114)
    );

    bool foreground = luminance >= 0.5;

    float localLuminance = foreground
        ? (luminance - 0.5) * 2.0
        : luminance * 2.0;

    // ========================================================
    // PALETTE SELECTION
    // ========================================================

    float palettePosition = localLuminance * 7.0;

    int lowerIndex = int(floor(palettePosition));
    int upperIndex = min(lowerIndex + 1, 7);

    float blend = fract(palettePosition);

    int paletteIndex = blend > threshold
        ? upperIndex
        : lowerIndex;

    vec3 result = foreground
        ? u_foregroundPalette[paletteIndex]
        : u_backgroundPalette[paletteIndex];

    outColor = vec4(result, color.a);
}
