export function createFramebuffer(gl, canvas) {

    const framebuffer = gl.createFramebuffer();
    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
    );

    const target = {
        framebuffer,
        texture,
        width: 0,
        height: 0
    };

    resizeFramebuffer(gl, canvas, target);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return target;
}


export function resizeFramebuffer(gl, canvas, target) {

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    if (width <= 0 || height <= 0) return;

    if (target.width === width && target.height === height) return;

    canvas.width = width;
    canvas.height = height;

    gl.bindTexture(gl.TEXTURE_2D, target.texture);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("Scene framebuffer is incomplete.");
    }

    target.width = width;
    target.height = height;
}


export function beginScene(gl,target) {

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);

    gl.viewport(0, 0, target.width, target.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}