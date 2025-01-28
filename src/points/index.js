import { createGLContext } from "../coreWebGl/createGLContext";
import { Matrix4 } from "../coreWebGl/Matrix4";
import { createShaderProgram } from "../coreWebGl/createShaderProgram";
import { fragmentShader } from './fragmentShader.glsl'
import { vertexShader } from './vertexShader.glsl'
import { SplatLoader } from "./SplatLoader";
import { Camera } from "gsplat";

const loader = new SplatLoader()

const gl = createGLContext()

const CANVAS_WIDTH = gl.canvas.width
const CANVAS_HEIGHT = gl.canvas.height

gl.clearColor(1.0, 1.0, 1.0, 1.0); // Белый фон
gl.clear(gl.COLOR_BUFFER_BIT);

const program = createShaderProgram(gl, vertexShader, fragmentShader)

gl.useProgram(program)

const projectionMatrix = Matrix4.projection(
  gl.canvas.clientWidth,
  gl.canvas.clientHeight
);

const matrixLocation = gl.getUniformLocation(program, "u_matrix");
gl.uniformMatrix4fv(matrixLocation, false, projectionMatrix);

// gl.drawArrays(gl.POINTS, 0, 1);

loader.onLoad = (splat) => {
  const camera = new Camera()

  camera.data.setSize(CANVAS_WIDTH, CANVAS_HEIGHT)
  camera.update()

  u_projection = gl.getUniformLocation(this.program, "projection");
  gl.uniformMatrix4fv(u_projection, false, this._camera.data.projectionMatrix.buffer);

  u_viewport = gl.getUniformLocation(this.program, "viewport");
  gl.uniform2fv(u_viewport, new Float32Array([canvas.width, canvas.height]));



  

  const positions = splat._data._positions
  console.log('positions :>> ', positions)
  console.log('splat :>> ', splat)

  const positionsBufferData = splat._data._positions
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positionsBufferData, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 4 * 3, 0);

  gl.drawArrays(gl.POINTS, 0, splat._data._vertexCount);
}