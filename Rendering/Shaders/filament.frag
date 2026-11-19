#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_resolution;

uniform vec2 u_cameraPosition;
uniform vec2 u_playerPosition;
uniform vec2 u_orbPosition;

uniform float u_time;
uniform float u_zoom;
uniform float u_compression;
uniform float u_viewRadius;

uniform vec4 u_color;

out vec4 outColor;


// camera projection

vec2 screenToWorld(vec2 screenPosition) {

    vec2 screenDelta =
        screenPosition - u_resolution * 0.5;

    float screenRadius = length(screenDelta);

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


//generate a waving strand

float strand(
    float perpendicularDistance,
    float t,
    float baseOffset,
    float phase,
    float amplitude,
    float frequency,
    float thickness
) {

    float bundleBulge = sin(t * 3.14159265);

    float wave =
        sin(t * frequency + u_time * 5.0 + phase * 7.0) * 0.65
        +
        sin(t * frequency * 2.3 - u_time * 8.0 + phase) * 0.25;

    float offset = bundleBulge * (
        baseOffset + wave * amplitude
    );

    float perpendicularDistanceToStrand = abs(perpendicularDistance - offset);

    float taper = mix(0.15, 1.0, bundleBulge);

    return perpendicularDistanceToStrand - thickness * taper;
}



void main() {

    // establish coordinates
    vec2 screenPosition = vec2(
        gl_FragCoord.x,
        u_resolution.y - gl_FragCoord.y
    );


    vec2 worldPosition = screenToWorld(screenPosition);


    vec2 filamentDirection = u_orbPosition - u_playerPosition;

    float filamentLength = length(filamentDirection);

    if (filamentLength < 0.001) discard;

    filamentDirection /= filamentLength;

    vec2 normal = vec2(
        -filamentDirection.y,
        filamentDirection.x
    );

    vec2 relative = worldPosition - u_playerPosition;

    float axialPosition = dot(relative, filamentDirection) / filamentLength;

    float perpendicularDistance = dot(relative, normal);

    if (axialPosition < 0.0 || axialPosition > 1.0) discard;

    float distanceToMainStrand = strand(
        perpendicularDistance,
        axialPosition,
        0.0,
        0.0,
        30.0,
        30.0,
        6.0
    );

    float distanceToStrandBundle = 1000.0;

    float filamentCore = 0.0;
    float filamentBody = 0.0;


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

        float distanceToBundleStrand = strand(
            perpendicularDistance,
            axialPosition,
            baseOffset,
            phase,
            amplitude,
            frequency,
            thickness
        );

        distanceToStrandBundle = min(distanceToStrandBundle, distanceToBundleStrand);

        float core = 1.0 - smoothstep(
            -0.5,
            0.5,
            distanceToBundleStrand
        );

        float body = 1.0 - smoothstep(
            0.0,
            thickness * 1.5,
            distanceToBundleStrand
        );

        filamentCore = max(filamentCore, core);
        filamentBody = max(filamentBody, body);
    }

    float distanceToClosestFilament = min(
        distanceToMainStrand,
        distanceToStrandBundle
    );

    // Visual effects
    float filamentGlow = exp(
        -max(distanceToClosestFilament, 0.0) / 8.0
    );

    float mainStrandCore = 1.0 - smoothstep(
        0.0,
        1.8,
        distanceToMainStrand
    );

    float strandBundleGradient = 1.0 - smoothstep(
        0.0,
        1.3,
        distanceToStrandBundle
    );

    // Combined brightness
    float filamentIntensity =
        filamentGlow * 0.45
        +
        strandBundleGradient * 0.85
        +
        mainStrandCore * 1.5;

    float pulse =
        0.65
        + 0.20 * sin(u_time * 10.0 + axialPosition * 35.0)
        + 0.10 * sin(u_time * 17.0 - axialPosition * 22.0)
        + 0.05 * sin(u_time * 6.0 + axialPosition * 60.0);

    filamentIntensity *= pulse;

    // Grayscale color
    float gray =
        0.02
        + filamentGlow * 0.08
        + strandBundleGradient * 0.08
        + filamentBody * 0.12
        + filamentCore * 0.10
        + mainStrandCore * 0.10;

    gray = clamp(gray, 0.0, 0.5);

    vec3 color = vec3(gray);

    // Transparency
    float alpha = clamp(
        filamentIntensity * u_color.a,
        0.0,
        1.0
    );

    if (alpha < 0.005) discard;

    outColor = vec4(color, alpha);
}
