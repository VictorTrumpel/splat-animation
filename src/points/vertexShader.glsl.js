export const vertexShader = /*glsl*/ `#version 300 es
  uniform mat4 projection;
  uniform vec2 viewport;

  in vec4 a_position;
  uniform mat4 u_matrix;

  void main() {
    gl_PointSize = 10.0;
    gl_Position = u_matrix * a_position;
  }
`;