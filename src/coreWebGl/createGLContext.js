export const createGLContext = () => {
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return gl;
};