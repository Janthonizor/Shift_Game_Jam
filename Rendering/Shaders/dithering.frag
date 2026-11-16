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
uniform float u_ditherScale;

uniform vec2 u_resolution;

uniform bool u_ditheringEnabled;

uniform bool u_cameraProjection;

uniform float u_compression;
uniform float u_viewRadius;

out vec4 outColor;


void main() {

    vec2 sampleUV = v_texCoord;

    if (u_cameraProjection) {

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

        // Match the texture orientation of createQuadVertices()
        sampleUV = vec2(worldUV.x, 1.0 - worldUV.y);

        if (
            sampleUV.x < 0.0 || sampleUV.x > 1.0 ||
            sampleUV.y < 0.0 || sampleUV.y > 1.0
        ) {
            discard;
        }
    }

    vec4 color = texture(u_texture, sampleUV);

    if (color.a <= 0.0) {
        discard;
    }

    if (!u_ditheringEnabled) {
        outColor = color;
        return;
    }

    // conversion to grayscale not really necessary now but maybe later
    float brightness = dot(
        color.rgb,
        vec3(0.299, 0.587, 0.114)
    );


    // ============================================================
    // DITHER COORDINATES
    // ============================================================

    // Screen coordinates, origin at top-left
    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );

    vec2 patternCoords = gl_FragCoord.xy;;

    if (u_worldDithering) {

        vec2 backgroundTopLeft =
            u_backgroundPosition - u_backgroundSize * 0.5;

        patternCoords =
            screenPosition +
            (u_cameraPosition - backgroundTopLeft) * u_zoom;
    }

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