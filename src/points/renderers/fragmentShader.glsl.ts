export const fragmentShaderSource = /*glsl*/`#version 300 es
  precision highp float;

  uniform float outlineThickness;
  uniform vec4 outlineColor;

  in vec4 vColor;
  in vec2 vPosition;
  in float vSize;
  in float vSelected;

  out vec4 fragColor;

  void main () {
    float A = -dot(vPosition, vPosition);

    if (A < -4.0) discard;

    if (vSelected < 0.5) {
      float B = exp(A) * vColor.a;
      fragColor = vec4(B * vColor.rgb, B);
      return;
    }

    float outlineThreshold = -4.0 + (outlineThickness / vSize);

    if (A < outlineThreshold) {
      fragColor = outlineColor;
      return;
    } 

    float B = exp(A) * vColor.a;
    fragColor = vec4(B * vColor.rgb, B);
  }
`