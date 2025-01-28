export const vertexShaderSource = /*glsl*/`#version 300 es
  precision highp float;
  precision highp int;

  uniform highp usampler2D u_texture;
  uniform highp sampler2D u_transforms;
  uniform highp usampler2D u_transformIndices;
  uniform highp sampler2D u_colorTransforms;
  uniform highp usampler2D u_colorTransformIndices;
  uniform mat4 projection, view;
  uniform vec2 focal;
  uniform vec2 viewport;

  uniform bool useDepthFade;
  uniform float depthFade;

  in vec2 position;
  in int index;

  out vec4 vColor;
  out vec2 vPosition;
  out float vSize;
  out float vSelected;

  void main () {
    uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & 0x3ffu) << 1, uint(index) >> 10), 0);
    float selected = float((cen.w >> 24) & 0xffu);

    uint transformIndex = texelFetch(u_transformIndices, ivec2(uint(index) & 0x3ffu, uint(index) >> 10), 0).x;
    mat4 transform = mat4(
      texelFetch(u_transforms, ivec2(0, transformIndex), 0),
      texelFetch(u_transforms, ivec2(1, transformIndex), 0),
      texelFetch(u_transforms, ivec2(2, transformIndex), 0),
      texelFetch(u_transforms, ivec2(3, transformIndex), 0)
    );

    if (selected < 0.5) {
      selected = texelFetch(u_transforms, ivec2(4, transformIndex), 0).x;
    }

    mat4 viewTransform = view * transform;

    vec4 cam = viewTransform * vec4(uintBitsToFloat(cen.xyz), 1);
    vec4 pos2d = projection * cam;

    float clip = 1.2 * pos2d.w;
    if (pos2d.z < -pos2d.w || pos2d.z > pos2d.w || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      return;
    }

    uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) << 1) | 1u, uint(index) >> 10), 0);
    vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    mat3 J = mat3(
      focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z), 
      0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z), 
      0., 0., 0.
    );

    mat3 T = transpose(mat3(viewTransform)) * J;
    mat3 cov2d = transpose(T) * Vrk * T;

    //ref: https://github.com/graphdeco-inria/diff-gaussian-rasterization/blob/main/cuda_rasterizer/forward.cu#L110-L111
    cov2d[0][0] += 0.3;
    cov2d[1][1] += 0.3;

    float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
    float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if (lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
    vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    uint colorTransformIndex = texelFetch(u_colorTransformIndices, ivec2(uint(index) & 0x3ffu, uint(index) >> 10), 0).x;
    mat4 colorTransform = mat4(
      texelFetch(u_colorTransforms, ivec2(0, colorTransformIndex), 0),
      texelFetch(u_colorTransforms, ivec2(1, colorTransformIndex), 0),
      texelFetch(u_colorTransforms, ivec2(2, colorTransformIndex), 0),
      texelFetch(u_colorTransforms, ivec2(3, colorTransformIndex), 0)
    );

    vec4 color = vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
    vColor = colorTransform * color;

    vPosition = position;
    vSize = length(majorAxis);
    vSelected = selected;

    float scalingFactor = 1.0;

    if (useDepthFade) {
      float depthNorm = (pos2d.z / pos2d.w + 1.0) / 2.0;
      float near = 0.1; float far = 100.0;
      float normalizedDepth = (2.0 * near) / (far + near - depthNorm * (far - near));
      float start = max(normalizedDepth - 0.1, 0.0);
      float end = min(normalizedDepth + 0.1, 1.0);
      scalingFactor = clamp((depthFade - start) / (end - start), 0.0, 1.0);
    }

    vec2 vCenter = vec2(pos2d) / pos2d.w;
    
    gl_Position = vec4(
        vCenter 
        + position.x * majorAxis * scalingFactor / viewport
        + position.y * minorAxis * scalingFactor / viewport, 0.0, 1.0);
}
`