export class ShaderProgram {
  glContext: WebGL2RenderingContext
  glProgram: WebGLProgram

  constructor(canvas: HTMLCanvasElement, vertexShaderSource: string, fragmentShaderSource: string) {
    this.glContext = canvas.getContext('webgl2') as WebGL2RenderingContext
    const gl = this.glContext
 
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    this.glProgram = gl.createProgram() as WebGLProgram
    const program = this.glProgram

    const vertexShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program)

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vertexShader));
    }

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fragmentShader));
    }

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }
  }
}