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
uniform float u_rippleDistance;
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

    float edgeThickness = 3.0 ;

    float boxEdge = 0.0;

    if (u_showBorder) {
        vec2 pixel = v_texCoord * u_size;

        boxEdge = float(
            pixel.x < edgeThickness ||
            pixel.y < edgeThickness ||
            pixel.x >= u_size.x - edgeThickness ||
            pixel.y >= u_size.y - edgeThickness
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
    /*
    float alpha = max(
        max(playerAlpha, boxEdge),
        centerMarker
    );
    */
    float alpha = max(
        playerAlpha, 
        boxEdge
    );

    // ============================================================
    // CONTOUR-FOLLOWING RIPPLES
    // ============================================================

    float rippleSpacing = 30.0;

   


    // Propagation speed proportional to player displacement
    float rippleSpeed = u_speed * 0.008;

    // Convert SDF distance into world-space distance
    float r = playerSDF / max(u_zoom, 0.001);

    // Animate ripples outward
    float wave = 0.5 + 0.5 * cos(
        (r -  u_rippleDistance)
        * 6.28318530718 / rippleSpacing
    );

    float brightness = mix(
        0.35,
        0.75,
        wave
    );


    // ============================================================
    // OUTPUT
    // ============================================================
    float greyval = 0.5;
    vec3 borderColor = vec3(greyval);

    vec3 finalColor = mix(
        vec3(brightness),
        borderColor,
        boxEdge
    );

    outColor = vec4(finalColor, alpha);
}
