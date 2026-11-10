#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform vec2 u_size;
uniform vec2 u_playerPosition;
uniform vec2 u_centerPosition;
uniform float u_playerRadius;
uniform bool u_showBorder;
uniform vec4 u_color;

uniform vec2 u_tailA;
uniform vec2 u_tailB;
uniform vec2 u_tailC;
uniform bool u_hasTail;
uniform float u_time;
uniform float u_speed;
uniform float u_zoom;

out vec4 outColor;



float sdLine(vec2 p, vec2 a, vec2 b, vec2 insidePoint) {

    vec2 edge = b - a;

    float d = (
        edge.x * (p.y - a.y) -
        edge.y * (p.x - a.x)
    ) / length(edge);

    float referenceSide = (
        edge.x * (insidePoint.y - a.y) -
        edge.y * (insidePoint.x - a.x)
    );

    return -sign(referenceSide) * d;
}


void main() {

   

    vec2 pixelPosition = v_texCoord * u_size;
    vec2 playerPixelPosition = u_playerPosition * u_size;

    vec2 p = pixelPosition - playerPixelPosition;


    float circleSDF = length(p) - u_playerRadius;

    float playerSDF = circleSDF;

    if (u_hasTail) {

        vec2 tailA = (u_tailA - u_playerPosition) * u_size;
        vec2 tailB = (u_tailB - u_playerPosition) * u_size;
        vec2 tailC = (u_tailC - u_playerPosition) * u_size;


        // Orient the two tail boundaries toward the center point.
        float lineAC = sdLine(p, tailA, tailC, vec2(0.0));
        float lineBC = sdLine(p, tailB, tailC, vec2(0.0));
        float lineAO = sdLine(p, tailA, vec2(0.0), tailC);
        float lineBO = sdLine(p, tailB, vec2(0.0), tailC);

        // Tail wedge: inside both lines and in front of the player.
        float tailSDF = max(lineAC, lineBC);

        // Is the pixel inside the wedge?
        bool insideTail =
            lineAC <= 0.0 &&
            lineBC <= 0.0 &&
            lineAO <= 0.0 && 
            lineBO <= 0.0;

        // Select the appropriate SDF.
        if (insideTail) {
            playerSDF = tailSDF;
        }
        else {
            playerSDF = circleSDF;
        }
    }


    // ============================================================
    // PLAYER ALPHA
    // ============================================================

    float playerAlpha = 1.0 - smoothstep(
        -1.0,
        1.0,
        playerSDF
    );


    // ============================================================
    // BOUNDING BOX OUTLINE
    // ============================================================

    float boxEdge = 0.0;

    if (u_showBorder) {

        float edgeThickness = 2.0;

        boxEdge = 1.0 - step(
            edgeThickness,
            min(
                min(v_texCoord.x * u_size.x, (1.0 - v_texCoord.x) * u_size.x),
                min(v_texCoord.y * u_size.y, (1.0 - v_texCoord.y) * u_size.y)
            )
        );
    }


    // ============================================================
    // CENTER MARKER
    // ============================================================

    vec2 centerOffset =
        (v_texCoord - u_centerPosition) * u_size;

    float centerMarker = 1.0 - smoothstep(
        1.5,
        2.5,
        length(centerOffset)
    );


    // ============================================================
    // COMBINED ALPHA
    // ============================================================

    float alpha = max(
        max(playerAlpha, boxEdge),
        centerMarker
    );

    // ============================================================
    // CONTOUR-FOLLOWING RIPPLES
    // ============================================================

    float rippleSpacing = 20.0;

   


    // Propagation speed proportional to player displacement
    float rippleSpeed = 1.0 * 0.005;

    // Convert SDF distance into world-space distance
    float r = playerSDF / max(u_zoom, 0.001);

    // Animate ripples outward
    float wave = 0.5 + 0.5 * cos(
        (r - u_time * rippleSpeed)
        * 6.28318530718 / rippleSpacing
    );

    float brightness = mix(
        0.15,
        0.85,
        wave
    );


    // ============================================================
    // OUTPUT
    // ============================================================

    outColor = vec4(vec3(brightness), alpha);
}
