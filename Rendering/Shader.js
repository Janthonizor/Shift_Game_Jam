
export async function loadShader(path) {

    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Failed to load shader: ${path}`);
    }

    return response.text();
}


export function createShader(gl, type, source) {

    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        const error = gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error(error);
    }

    return shader;
}


export function createProgram(gl, vertexSource, fragmentSource) {

    const vertexShader = createShader(
        gl,
        gl.VERTEX_SHADER,
        vertexSource
    );

    const fragmentShader = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentSource
    );

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

        const error = gl.getProgramInfoLog(program);

        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        throw new Error(error);
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return {
        program,
        attributes: {},
        uniforms: {}
    };
}


export function uploadShaderSettings(gl, settings, shader) {

    for (const attribute of settings.attributes) {

        shader.attributes[attribute] =
            gl.getAttribLocation(
                shader.program,
                attribute
            );
    }

    for (const [name, config] of Object.entries(settings.uniforms)) {

        shader.uniforms[name] = {

            location: gl.getUniformLocation(
                shader.program,
                name
            ),

            type: config.type
        };

        if (config.value !== undefined) {

            uploadUniforms(gl, shader, {
                [name]: config.value
            });
        }
    }
}


export function uploadUniforms(gl, program, values) {

    gl.useProgram(program.program);

    for (const [name, value] of Object.entries(values)) {

        const uniform = program.uniforms[name];

        if (!uniform || uniform.location === null) continue;

        gl[`uniform${uniform.type}`](
            uniform.location,
            value
        );
    }
}
