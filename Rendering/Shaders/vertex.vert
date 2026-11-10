#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

uniform vec2 u_resolution;

out vec2 v_texCoord;

void main() {

    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;

    gl_Position = vec4(
        clipSpace.x,
        -clipSpace.y,
        0.0,
        1.0
    );

    v_texCoord = a_texCoord;
}