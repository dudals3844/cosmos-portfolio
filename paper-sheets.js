'use strict';
// Draws the papers as filled, translucent sheets with rows of text on the black hole's WebGL canvas.
// Each sheet is two triangles whose corners paper-blackhole.js works out every frame.
(root => {
  // x, y, then the sheet coordinate (-1..1 across and down), then colour and alpha.
  const FLOATS_PER_VERTEX = 8;
  const CORNERS = Object.freeze([[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]);
  const VERTICES_PER_SHEET = CORNERS.length;
  // Attribute slots both programs may use; each binds only its own and switches the rest off.
  const ATTRIBUTE_SLOTS = 8;

  const VERTEX = `attribute vec2 position;attribute vec2 uv;attribute vec4 tint;uniform vec2 resolution;
  varying vec2 sheet;varying vec4 shade;
  void main(){
    gl_Position=vec4(position.x/resolution.x*2.-1.,1.-position.y/resolution.y*2.,0.,1.);
    sheet=uv;shade=tint;
  }`;
  // Nine rows of text inside a margin, the last one short, and a slightly brighter rim.
  const FRAGMENT = `precision mediump float;varying vec2 sheet;varying vec4 shade;
  void main(){
    vec2 p=abs(sheet);
    float rim=smoothstep(.82,1.,max(p.x,p.y));
    float along=(sheet.y+.72)/1.44*9.;
    float row=floor(along);
    float inside=step(p.x,.72)*step(p.y,.72)*(row<8.?1.:step(sheet.x,.05));
    float text=inside*step(fract(along),.42);
    float alpha=shade.a*min(1.,.66+.3*text+.5*rim);
    gl_FragColor=vec4(shade.rgb*(.6+.32*text+.3*rim)*alpha,alpha);
  }`;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader) || 'shader compilation failed');
    return shader;
  }
  function link(gl, vertex, fragment) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program) || 'program link failed');
    return program;
  }
  // Points one program's attributes at its buffer, and switches every other slot off so the programs never clash.
  function bindLayout(gl, program, buffer, layout, stride) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (let slot = 0; slot < ATTRIBUTE_SLOTS; slot++) gl.disableVertexAttribArray(slot);
    const bytes = Float32Array.BYTES_PER_ELEMENT;
    for (const [name, size, offset] of layout) {
      const location = gl.getAttribLocation(program, name);
      if (location < 0) continue;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride * bytes, offset * bytes);
    }
  }

  function create(gl, capacity) {
    const data = new Float32Array(capacity * VERTICES_PER_SHEET * FLOATS_PER_VERTEX);
    const layout = [['position', 2, 0], ['uv', 2, 2], ['tint', 4, 4]];
    let program = null, buffer = null, resolution = null, count = 0;
    function setup() {
      program = link(gl, VERTEX, FRAGMENT);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
      resolution = gl.getUniformLocation(program, 'resolution');
    }
    function begin() { count = 0; }
    // A sheet centred on (x, y), spanning ±a across and ±b down, in the given colour. Invisible sheets are skipped.
    function add(x, y, ax, ay, bx, by, look) {
      if (!(look.a > .003) || count >= capacity) return;
      let o = count * VERTICES_PER_SHEET * FLOATS_PER_VERTEX;
      for (const [u, v] of CORNERS) {
        data[o] = x + u * ax + v * bx; data[o + 1] = y + u * ay + v * by;
        data[o + 2] = u; data[o + 3] = v;
        data[o + 4] = look.r; data[o + 5] = look.g; data[o + 6] = look.b; data[o + 7] = look.a;
        o += FLOATS_PER_VERTEX;
      }
      count++;
    }
    function draw(width, height) {
      if (!count) return;
      bindLayout(gl, program, buffer, layout, FLOATS_PER_VERTEX);
      gl.uniform2f(resolution, width, height);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * VERTICES_PER_SHEET * FLOATS_PER_VERTEX));
      // Ordinary transparency, so overlapping sheets stack up into a paler grey instead of burning white.
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, count * VERTICES_PER_SHEET);
    }
    return Object.freeze({ setup, begin, add, draw });
  }

  root.PaperSheets = Object.freeze({ create, link, bindLayout });
})(window);
