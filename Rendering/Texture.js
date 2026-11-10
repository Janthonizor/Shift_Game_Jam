export function loadTexture(gl, path) {
    return new Promise((resolve, reject) => {
        const texture = gl.createTexture();
        const image = new Image();

        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image
            );

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.bindTexture(gl.TEXTURE_2D, null);

            resolve(texture);
        };

        image.onerror = (event) => {
            console.error("Texture failed to load:");
            console.error("Path:", path);
            console.error("Resolved URL:", image.src);
            console.error("Event:", event);

            gl.deleteTexture(texture);
            reject(new Error(`Failed to load texture: ${image.src}`));
        };

        image.src = path;
    });
}