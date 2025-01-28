import { ShaderProgram } from "./ShaderProgram";
import { Camera, Scene, RenderData } from "gsplat";

export class RenderPorgram extends ShaderProgram {
  splatTexture: WebGLTexture
  transformsTexture: WebGLTexture
  transformIndicesTexture: WebGLTexture
  colorTransformsTexture: WebGLTexture
  colorTransformIndicesTexture: WebGLTexture

  camera: Camera

  u_projection: WebGLUniformLocation
  u_view: WebGLUniformLocation
  positionAttribute: number
  indexAttribute: number

  vertexBuffer: WebGLBuffer
  indexBuffer: WebGLBuffer

  depthIndex: Uint32Array

  constructor(camera: Camera, canvas: HTMLCanvasElement, vertexShader: string, fragmentShader: string) {
    super(canvas, vertexShader, fragmentShader)

    const gl = this.glContext
    const program = this.glProgram
    this.camera = camera

    this.u_projection = gl.getUniformLocation(program, "projection") as WebGLUniformLocation;
    gl.uniformMatrix4fv(this.u_projection, false, camera.data.projectionMatrix.buffer);

    const u_viewport = gl.getUniformLocation(program, "viewport") as WebGLUniformLocation;
    gl.uniform2fv(u_viewport, new Float32Array([canvas.width, canvas.height]));

    const u_focal = gl.getUniformLocation(program, "focal") as WebGLUniformLocation;
    gl.uniform2fv(u_focal, new Float32Array([camera.data.fx, camera.data.fy]));

    this.u_view = gl.getUniformLocation(program, "view") as WebGLUniformLocation;
    gl.uniformMatrix4fv(this.u_view, false, camera.data.viewMatrix.buffer);

    const u_outlineThickness = gl.getUniformLocation(program, "outlineThickness") as WebGLUniformLocation;
    gl.uniform1f(u_outlineThickness, 1.0);

    const u_outlineColor = gl.getUniformLocation(program, "outlineColor") as WebGLUniformLocation;
    gl.uniform4fv(u_outlineColor, new Float32Array([0.0, 0.0, 0.0, 1]));

    this.splatTexture = gl.createTexture() as WebGLTexture;
    const u_texture = gl.getUniformLocation(program, "u_texture") as WebGLUniformLocation;
    gl.uniform1i(u_texture, 0);

    this.transformsTexture = gl.createTexture() as WebGLTexture;
    const u_transforms = gl.getUniformLocation(program, "u_transforms") as WebGLUniformLocation;
    gl.uniform1i(u_transforms, 1);

    this.transformIndicesTexture = gl.createTexture() as WebGLTexture;
    const u_transformIndices = gl.getUniformLocation(program, "u_transformIndices") as WebGLUniformLocation;
    gl.uniform1i(u_transformIndices, 2);

    this.colorTransformsTexture = gl.createTexture() as WebGLTexture;
    const u_colorTransforms = gl.getUniformLocation(program, "u_colorTransforms") as WebGLUniformLocation;
    gl.uniform1i(u_colorTransforms, 3);

    this.colorTransformIndicesTexture = gl.createTexture() as WebGLTexture;
    const u_colorTransformIndices = gl.getUniformLocation(program, "u_colorTransformIndices") as WebGLUniformLocation;
    gl.uniform1i(u_colorTransformIndices, 4);

    this.vertexBuffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]), gl.STATIC_DRAW);

    this.positionAttribute = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(this.positionAttribute);
    gl.vertexAttribPointer(this.positionAttribute, 2, gl.FLOAT, false, 0, 0);

    this.indexBuffer = gl.createBuffer() as WebGLBuffer;
    this.indexAttribute = gl.getAttribLocation(program, "index");
    gl.enableVertexAttribArray(this.indexAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
  }
  
  render(scene: Scene) {
    const gl = this.glContext

    const renderData = new RenderData(scene);

    this.clearCanvas()
    this.updateViewPort()

    this.renderSplateTexture(renderData)
    this.renderTransformTexture(renderData)
    this.renderTransformIndicesTexture(renderData)
    this.renderColorTransformIndiciesTexture(renderData)
    this.renderColorTransformTexture(renderData)

    const detachedPositions = new Float32Array(renderData.positions.slice().buffer);
    const detachedTransforms = new Float32Array(renderData.transforms.slice().buffer);
    const detachedTransformIndices = new Uint32Array(renderData.transformIndices.slice().buffer);
    // тут должна быть передача в воркер

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA, gl.ONE, gl.ONE_MINUS_DST_ALPHA, gl.ONE);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

    gl.uniformMatrix4fv(this.u_projection, false, this.camera.data.projectionMatrix.buffer);
    gl.uniformMatrix4fv(this.u_view, false, this.camera.data.viewMatrix.buffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(this.positionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.depthIndex, gl.STATIC_DRAW);
    gl.vertexAttribIPointer(this.indexAttribute, 1, gl.INT, 0, 0);
    gl.vertexAttribDivisor(this.indexAttribute, 1);

    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this.depthIndex.length);
  }

  private updateViewPort() {
    this.glContext.viewport(0, 0, this.glContext.canvas.width, this.glContext.canvas.height);
  }

  private clearCanvas() {
    const gl = this.glContext
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private renderSplateTexture(renderData: RenderData) {
    const gl = this.glContext

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.splatTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32UI,
      renderData.width,
      renderData.height,
      0,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_INT,
      renderData.data,
    );
  }

  private renderTransformTexture(renderData: RenderData) {
    const gl = this.glContext

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.transformsTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      renderData.transformsWidth,
      renderData.transformsHeight,
      0,
      gl.RGBA,
      gl.FLOAT,
      renderData.transforms,
    );
  }

  private renderTransformIndicesTexture(renderData: RenderData) {
    const gl = this.glContext

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.transformIndicesTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32UI,
      renderData.transformIndicesWidth,
      renderData.transformIndicesHeight,
      0,
      gl.RED_INTEGER,
      gl.UNSIGNED_INT,
      renderData.transformIndices,
    );
  }

  private renderColorTransformTexture(renderData: RenderData) {
    const gl = this.glContext

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTransformsTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      renderData.colorTransformsWidth,
      renderData.colorTransformsHeight,
      0,
      gl.RGBA,
      gl.FLOAT,
      renderData.colorTransforms,
    );
  }

  private renderColorTransformIndiciesTexture(renderData: RenderData) {
    const gl = this.glContext

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTransformIndicesTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32UI,
      renderData.colorTransformIndicesWidth,
      renderData.colorTransformIndicesHeight,
      0,
      gl.RED_INTEGER,
      gl.UNSIGNED_INT,
      renderData.colorTransformIndices,
    );
  }
}