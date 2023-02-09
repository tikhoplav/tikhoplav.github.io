const canvas = document.querySelector('canvas')
const gl = canvas.getContext("webgl2")

const vertexSource = `#version 300 es

uniform vec2 uResolution;
uniform vec2 uTarget;

layout (location = 0) in vec2 aPosition;
layout (location = 1) in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  float targetRatio = uTarget.x / uTarget.y;
  float screenRatio = uResolution.x / uResolution.y;

  float xScale = 1.0;
  float yScale = screenRatio / targetRatio;

  if (uResolution.x < 1600.0) {
    yScale = 1.0;
    xScale = targetRatio / screenRatio;
  }

  gl_Position = vec4(aPosition.x * xScale, aPosition.y * yScale, 0, 1);

  vTexCoord = aTexCoord;
}`;

const fragmentSource = `#version 300 es
precision highp float;

uniform float time;
uniform sampler2D uRipple;
uniform sampler2D uImage;

in vec2 vTexCoord;

out vec4 fragColor;

void main() {
  vec4 nCol = texture(uRipple, 1.6 * vTexCoord + time * 0.0001 * vec2(0.01, -0.2));
  vec4 n = normalize(2.0 * nCol - 1.0);

  vec2 displaced = vTexCoord + vec2(n.r - .1 * n.b, n.g - 0.5 * n.b) * 0.02;

  fragColor = texture(uImage, displaced);
}`;

(async () => {
  const program = makeShader(gl, vertexSource, fragmentSource)
  gl.useProgram(program)

  const ripple = createTexture(gl)
  const bg = createTexture(gl)

  await new Promise(resolve => {
    const img = new Image()
    img.src = '/ripple.jpg'
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, ripple)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      resolve()
    }
  })

  await new Promise(resolve => {
    const img = new Image()
    img.src = '/bg.jpg'
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, bg)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.uniform2f(
        gl.getUniformLocation(program, "uTarget"),
        img.width,
        img.height,
      )
      resolve()
    }
  })

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, ripple)
  gl.uniform1i(gl.getUniformLocation(program, "uRipple"), 0)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, bg)
  gl.uniform1i(gl.getUniformLocation(program, "uImage"), 1)

  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  0, 1,
     1, -1,  1, 1,
     1,  1,  1, 0,
    -1,  1,  0, 0,
  ]), gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8)
  gl.enableVertexAttribArray(1)

  const onresize = () => {
    const { innerWidth: width, innerHeight: height} = window
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
    gl.uniform2f(
      gl.getUniformLocation(program, "uResolution"),
      width,
      height,
    )
  }

  window.onresize = onresize
  onresize()

  const draw = (time) => {
    gl.uniform1f(gl.getUniformLocation(program, 'time'), time)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
    requestAnimationFrame(draw)
  }

  draw()
})()

function makeShader(gl, vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  const prog = gl.createProgram()
  if (!prog || !vs || !fs) throw new Error("Failed to create program resources")
  gl.shaderSource(vs, vsSource)
  gl.shaderSource(fs, fsSource)
  gl.compileShader(vs)
  gl.compileShader(fs)
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  gl.validateProgram(prog)
  if (!gl.getProgramParameter(prog, gl.VALIDATE_STATUS)) {
    const msg = `Program link failed:\n${
      gl.getProgramInfoLog(prog)
    }\n${
      gl.getShaderInfoLog(vs)
    }\n${gl.getShaderInfoLog(fs)}`
    gl.deleteProgram(prog)
    throw new Error(msg)
  }
  return prog;
};

function createTexture(gl) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture
}