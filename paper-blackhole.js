'use strict';
// Papers drawn as particles float all over the screen; as the page scrolls the same particles spiral in and settle into a black hole.
(() => {
  const scene = document.querySelector('.paper-hole');
  if (!scene) return;
  const orbit = window.PaperOrbit;
  const stage = scene.querySelector('.paper-stage');
  const canvas = stage.querySelector('canvas');
  const beats = [...scene.querySelectorAll('[data-paper-beat]')];
  const steps = [...scene.querySelectorAll('.paper-steps li')];
  const results = [...scene.querySelectorAll('.paper-results li')];
  const labelLayer = scene.querySelector('.paper-labels');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const SOURCES = ['SSRN', 'Journal of Finance', 'arXiv'];
  const COMPACT = innerWidth < 760;
  const PAPER_COUNT = COMPACT ? 64 : 140;
  const POINTS_PER_PAPER = COMPACT ? 60 : 80;
  const DUST_COUNT = COMPACT ? 9000 : 20000;
  const LABEL_COUNT = SOURCES.length * (COMPACT ? 2 : 3);
  const LABEL_EVERY = Math.floor(PAPER_COUNT / LABEL_COUNT);
  const TOTAL = PAPER_COUNT * POINTS_PER_PAPER + DUST_COUNT;
  const TAU = Math.PI * 2;
  const STRIDE = 7;
  const MAX_PIXEL_RATIO = 2;
  const MAX_FRAME_SECONDS = .05;
  // Share of a full fall a particle may cover per second, so a fast scroll still plays out as a plunge.
  const FALL_SPEED = .5;
  // Hole centre as a share of the stage height, and its radius as a share of the shorter side.
  const HOLE_Y = .56, HOLE_SIZE = .085, HOLE_SIZE_PORTRAIT = .105, HOLE_MIN = 30, HOLE_MAX = 84;
  const DISK_WIDTH = .46, DISK_HEIGHT = .56, DISK_WIDTH_PORTRAIT = .62;
  // Tilt of the orbit the falling papers flatten into.
  const SWIRL = { tilt: .36, tiltPortrait: .6 };
  // Free-floating sheets: a spread of sizes for depth, a size boost that shrinks away as they are pulled in,
  // and a flutter (pixels, per second) on top of their slow clockwise turn.
  const FLOAT = { scaleMin: .55, scaleRange: 1.15, labelScale: 1.5, size: 1.7, tumble: .5, spinIn: 3, flutter: 10, flutterRate: .6, depth: .35 };
  // As the pull grows the whole swarm is squeezed: every orbit shrinks by up to `radius`, heights flatten by up to
  // `height`, and the turn speeds up by up to `spin` times, like water circling a drain.
  const COMPRESS = { radius: .55, height: .8, spin: 2.5 };
  // Dust starts as faint stars across the sky and brightens as it falls in.
  const STAR_LIGHT = .35;
  const PAPER_WIDTH = .04, PAPER_WIDTH_MIN = 13, PAPER_WIDTH_MAX = 24;
  // Radius, in hole radii, at which a paper has finished coming apart.
  const PAPER_REST = 1.25;
  // A sheet drifts, then accelerates; it only comes apart in the last stretch of its fall.
  const PLUNGE_CURVE = 1.8;
  const DISSOLVE_START = .72, DISSOLVE_STAGGER = .12, DISSOLVE_SPAN = .16;
  // Within this many hole radii a sheet is pulled along its orbit: longer, thinner and smaller.
  const NEAR_REACH = 3.5, STRETCH = 1.9, SQUEEZE = .55, SHRINK = .3;
  const ROLL_SWAY = .35;
  const LABEL_FLIP = .72;
  const SHADOW_EDGE = 1.02, SHADOW_SOFT = .12;
  // The bowl under the hole is a little dimmer than the arch over it.
  const LOWER_LIGHT = .8;
  // The near half of the accretion disk is drawn larger and brighter than the far half.
  const DISK_DEPTH = .5;
  const TWINKLE_FLOOR = .78, TWINKLE_RATE = 1.7;
  const BLOOM_SIZE = '7.0', BLOOM_GAIN = '0.07';
  const KIND = { ring: 0, halo: 1, disk: 2, swirl: 3 };

  const mix = (a, b, t) => a + (b - a) * t;
  const approach = (value, target, step) => value + Math.max(-step, Math.min(step, target - value));
  const smooth = t => t * t * (3 - 2 * t);
  const ramp = (start, end, value) => Math.min(1, Math.max(0, (value - start) / (end - start)));
  const stationary = () => reduced.matches || document.body.classList.contains('motion-paused');

  function showFinal() {
    scene.classList.add('is-static');
    beats.forEach(beat => { beat.hidden = false; });
    steps.forEach(step => step.classList.add('is-done'));
    results.forEach(result => { result.style.opacity = '1'; result.style.transform = 'none'; });
  }
  function fallBack(reason) {
    console.warn('Paper black hole falls back to static copy:', reason);
    scene.classList.add('is-flat');
    showFinal();
  }

  const gl = orbit && canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) { fallBack(orbit ? 'WebGL is unavailable' : 'paper-orbit.js did not load'); return; }

  const VERTEX = `attribute vec2 position;attribute float size;attribute vec3 color;attribute float glow;
  uniform vec2 resolution;uniform float pixelRatio;uniform float bloom;uniform float maxSize;
  varying vec3 tint;varying float soft;
  void main(){
    gl_Position=vec4(position.x/resolution.x*2.-1.,1.-position.y/resolution.y*2.,0.,1.);
    gl_PointSize=min(maxSize,size*pixelRatio*mix(1.,${BLOOM_SIZE},bloom));
    tint=color*mix(1.,glow*${BLOOM_GAIN},bloom);soft=bloom;
  }`;
  const FRAGMENT = `precision mediump float;varying vec3 tint;varying float soft;
  void main(){
    float d=length(gl_PointCoord-.5)*2.;
    float a=1.-smoothstep(mix(.55,0.,soft),1.,d);
    gl_FragColor=vec4(tint*a,a*max(tint.r,max(tint.g,tint.b)));
  }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader) || 'shader compilation failed');
    return shader;
  }
  const data = new Float32Array(TOTAL * STRIDE);
  let uniforms = null;
  function setupGraphics() {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program) || 'program link failed');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    const bytes = Float32Array.BYTES_PER_ELEMENT;
    for (const [name, size, offset] of [['position', 2, 0], ['size', 1, 2], ['color', 3, 3], ['glow', 1, 6]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, STRIDE * bytes, offset * bytes);
    }
    uniforms = Object.fromEntries(['resolution', 'pixelRatio', 'bloom', 'maxSize'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform1f(uniforms.maxSize, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]);
    // Additive light: dense regions burn towards white, like the reference image.
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
  }
  try { setupGraphics(); } catch (error) { fallBack(error.message); return; }

  // Simulation state lives in typed arrays and is advanced in place: tens of thousands of particles move every frame.
  const random = orbit.createRandom(20261110);
  const floats = () => new Float32Array(TOTAL);
  const P = {
    owner: new Int16Array(TOTAL), kind: new Uint8Array(TOTAL), lower: new Uint8Array(TOTAL),
    offX: floats(), offY: floats(), fan: floats(), drift: floats(), jitter: floats(),
    freeR: floats(), freeA: floats(), theta: floats(), order: floats(), fall: floats(),
    shapeR: floats(), shapeTilt: floats(), shapeRoll: floats(), shapeLift: floats(),
    size: floats(), hotSize: floats(), phase: floats(), glow: floats(),
    baseR: floats(), baseG: floats(), baseB: floats(), hotR: floats(), hotG: floats(), hotB: floats(),
  };
  const papers = Array.from({ length: PAPER_COUNT }, (_, index) => {
    const ride = orbit.carouselPoint(random);
    const slot = index / LABEL_EVERY;
    const label = index % LABEL_EVERY === 0 && slot < LABEL_COUNT ? document.createElement('span') : null;
    if (label) { label.textContent = SOURCES[slot % SOURCES.length]; labelLayer.append(label); }
    // Bigger sheets read as nearer, so they are brighter too.
    const depth = random();
    return {
      label, order: ride.order, ride: ride.radius, height: ride.height, spin: ride.spin,
      flutterPhase: random() * TAU, flutterRate: FLOAT.flutterRate * (.6 + random() * .8), near: 1,
      theta: ride.angle, fall: 0, radius: 0, speed: 0, tilt: 1, cx: 0, cy: 0, liftY: 0,
      yaw: random() * TAU, yawRate: (random() - .5) * .9, pitch: random() * TAU, pitchRate: (random() - .5) * FLOAT.tumble,
      roll: (random() - .5) * .9, rollRate: .2 + random() * .4, rollPhase: random() * TAU,
      scale: label ? FLOAT.labelScale : FLOAT.scaleMin + depth * FLOAT.scaleRange, light: label ? 1 : .55 + .45 * depth,
      ax: 0, ay: 0, bx: 0, by: 0,
    };
  });
  const sheet = orbit.paperOutline(POINTS_PER_PAPER);
  function paintShape(i, shape) {
    const heat = shape.heat;
    P.kind[i] = KIND[shape.kind]; P.lower[i] = shape.lower ? 1 : 0;
    P.shapeR[i] = shape.radius; P.shapeTilt[i] = shape.tilt; P.shapeRoll[i] = shape.roll; P.shapeLift[i] = shape.lift;
    const palette = {
      ring: { cool: [1, .94, .82], warm: [1, .94, .82], light: .22, glow: .6, size: 1.2 },
      halo: { cool: [1, .7, .4], warm: [1, .9, .72], light: .12 + .38 * heat, glow: .45 + .5 * heat, size: 1.3 + heat },
      disk: { cool: [1, .55, .25], warm: [1, .93, .8], light: .2 + .34 * heat, glow: .25 + .75 * heat, size: 1.3 + heat * 1.1 },
      swirl: { cool: [.5, .62, .95], warm: [.62, .72, 1], light: .3 + heat, glow: .04, size: 1.2 },
    }[shape.kind];
    P.hotR[i] = mix(palette.cool[0], palette.warm[0], heat) * palette.light;
    P.hotG[i] = mix(palette.cool[1], palette.warm[1], heat) * palette.light;
    P.hotB[i] = mix(palette.cool[2], palette.warm[2], heat) * palette.light;
    P.glow[i] = palette.glow; P.hotSize[i] = palette.size; P.phase[i] = random() * TAU;
  }
  for (let i = 0; i < TOTAL; i++) {
    paintShape(i, orbit.sampleShape(random));
    const paperIndex = Math.floor(i / POINTS_PER_PAPER);
    if (paperIndex < PAPER_COUNT) {
      const point = sheet[i % POINTS_PER_PAPER];
      P.owner[i] = paperIndex; P.offX[i] = point.x; P.offY[i] = point.y;
      P.fan[i] = (random() - .5) * TAU; P.jitter[i] = DISSOLVE_START + random() * DISSOLVE_STAGGER;
      const light = papers[paperIndex].light;
      P.size[i] = 1.5; P.baseR[i] = .8 * light; P.baseG[i] = .82 * light; P.baseB[i] = .78 * light;
      continue;
    }
    // Dust is scattered across the sky like stars, a few of them bright, and falls in from where it is.
    const star = orbit.scatterPoint(random);
    const light = .25 + .75 * random() ** 2.5, cool = random() * .12;
    P.owner[i] = -1; P.offX[i] = star.u; P.offY[i] = star.v; P.order[i] = star.order;
    P.size[i] = .8 + random() * 1.2;
    P.baseR[i] = (.9 - cool) * light; P.baseG[i] = (.92 - cool * .5) * light; P.baseB[i] = light;
  }

  let view = null, state = orbit.sceneState(0), clock = 0, lastFrame = 0, frame = 0, scheduled = false, shownBeat = -1, stillDrawn = false;
  function measure() {
    const width = stage.clientWidth, height = stage.clientHeight;
    const portrait = width < height * .8, shorter = Math.min(width, height);
    const disk = portrait ? width * DISK_WIDTH_PORTRAIT : Math.min(width * DISK_WIDTH, height * DISK_HEIGHT);
    return Object.freeze({
      width, height, disk, x: width / 2, y: height * HOLE_Y,
      ratio: Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO),
      tilt: portrait ? SWIRL.tiltPortrait : SWIRL.tilt,
      hole: Math.min(HOLE_MAX, Math.max(HOLE_MIN, shorter * (portrait ? HOLE_SIZE_PORTRAIT : HOLE_SIZE))),
      paper: Math.min(PAPER_WIDTH_MAX, Math.max(PAPER_WIDTH_MIN, disk * PAPER_WIDTH)),
    });
  }
  function resize() {
    const next = measure();
    if (!next.width || !next.height) return false;
    if (view && view.width === next.width && view.height === next.height && view.ratio === next.ratio) return true;
    view = next;
    canvas.width = Math.round(view.width * view.ratio); canvas.height = Math.round(view.height * view.ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, view.width, view.height);
    gl.uniform1f(uniforms.pixelRatio, view.ratio);
    stage.style.setProperty('--hole-x', `${view.x}px`);
    stage.style.setProperty('--hole-y', `${view.y}px`);
    stage.style.setProperty('--hole-r', `${view.hole}px`);
    // A star's resting place depends only on the stage size, so its polar position is worked out here once.
    for (let i = PAPER_COUNT * POINTS_PER_PAPER; i < TOTAL; i++) {
      const dx = P.offX[i] * view.width, dy = P.offY[i] * view.height;
      P.freeR[i] = Math.hypot(dx, dy); P.freeA[i] = Math.atan2(dy, dx);
    }
    return true;
  }

  // A sheet rides the wide horizontal disk clockwise. As the pull grips it, its orbit shrinks, its height above
  // or below the plane squeezes to nothing and the disk tilts to the black hole's, so the whole swarm is
  // compressed towards the centre before it falls in. Scrolling back up runs the same path in reverse.
  function placePaper(paper, seconds, rest, squeeze) {
    const grip = Math.min(1, paper.fall * FLOAT.spinIn), flat = smooth(paper.fall);
    const free = paper.ride * view.width * (1 - COMPRESS.radius * squeeze);
    paper.radius = mix(free, rest, paper.fall ** PLUNGE_CURVE);
    paper.speed = mix(paper.spin * (1 + COMPRESS.spin * squeeze), orbit.angularSpeed(paper.radius, view.disk), grip);
    paper.theta += paper.speed * seconds;
    paper.tilt = mix(orbit.CAROUSEL.tilt, view.tilt, flat);
    const wave = clock * paper.flutterRate + paper.flutterPhase, flutter = FLOAT.flutter * (1 - flat);
    paper.liftY = paper.height * view.height * (1 - COMPRESS.height * squeeze) * (1 - flat) + Math.cos(wave * 1.3) * flutter;
    paper.cx = paper.radius * Math.cos(paper.theta) + Math.sin(wave) * flutter;
    paper.cy = paper.radius * Math.sin(paper.theta) * paper.tilt + paper.liftY;
    // The near half of the disk (lower on screen) reads closer: bigger and brighter.
    paper.near = 1 + FLOAT.depth * Math.sin(paper.theta) * (1 - flat);
  }
  function movePapers(seconds, step) {
    const rest = PAPER_REST * view.hole, squeeze = smooth(state.pull);
    for (const paper of papers) {
      paper.fall = approach(paper.fall, orbit.infall(state.pull, paper.order), step);
      placePaper(paper, seconds, rest, squeeze);
      // Only a sheet in the pull's grip is stretched along its orbit; a free one near the centre keeps its shape.
      const near = smooth(1 - ramp(0, NEAR_REACH * view.hole, paper.radius - rest)) * Math.min(1, paper.fall * FLOAT.spinIn);
      // Far out, yaw turns the sheet edge-on and back while roll sways it within the screen plane.
      const sway = paper.roll + Math.sin(clock * paper.rollRate + paper.rollPhase) * ROLL_SWAY;
      // Near the hole the long side swings round to follow the orbit (a sheet looks the same turned half way).
      const along = Math.atan2(Math.cos(paper.theta) * paper.tilt, -Math.sin(paper.theta)) - Math.PI / 2 - sway;
      const roll = sway + (along - Math.PI * Math.round(along / Math.PI)) * near;
      const side = view.paper * paper.scale * paper.near * mix(FLOAT.size, 1, smooth(paper.fall)) * (1 - SHRINK * near);
      // Yaw and pitch tumble the sheet in depth, so it shows edge-on or foreshortened from time to time.
      const wide = side * mix(Math.cos(paper.yaw + clock * paper.yawRate), 1, near) * (1 - SQUEEZE * near);
      const tall = side * mix(Math.cos(paper.pitch + clock * paper.pitchRate), 1, near) * (1 + STRETCH * near);
      paper.ax = Math.cos(roll) * wide; paper.ay = Math.sin(roll) * wide;
      paper.bx = -Math.sin(roll) * tall; paper.by = Math.cos(roll) * tall;
    }
  }
  function moveParticles(seconds, step) {
    const formed = smooth(ramp(.1, .55, state.pull)), starSqueeze = 1 - COMPRESS.radius * smooth(state.pull);
    const shadow = view.hole * SHADOW_EDGE, shadowSoft = view.hole * SHADOW_SOFT;
    for (let i = 0, o = 0; i < TOTAL; i++, o += STRIDE) {
      const owner = P.owner[i];
      let blend, radius, lift, theta, baseTilt, shade = 1, offsetX = 0, offsetY = 0;
      if (owner < 0) {
        P.fall[i] = approach(P.fall[i], orbit.infall(state.pull, P.order[i]), step);
        blend = smooth(P.fall[i]);
        radius = mix(P.freeR[i] * starSqueeze, P.shapeR[i] * view.hole, blend);
        lift = P.shapeLift[i] * view.hole * blend;
        // Stars hold still until the pull reaches them, then start to turn about the hole.
        P.theta[i] += orbit.angularSpeed(radius, view.disk) * seconds * Math.min(1, P.fall[i] * FLOAT.spinIn);
        theta = P.freeA[i] + P.theta[i];
        baseTilt = 1; shade = mix(STAR_LIGHT, 1, blend);
      } else {
        // A paper's points ride with the sheet, then fan out around the orbit as it comes apart.
        const paper = papers[owner];
        blend = smooth(ramp(P.jitter[i], P.jitter[i] + DISSOLVE_SPAN, paper.fall));
        radius = mix(paper.radius, P.shapeR[i] * view.hole, blend);
        lift = mix(paper.liftY, P.shapeLift[i] * view.hole, blend);
        baseTilt = paper.tilt; shade = paper.near;
        if (blend > .999) {
          // Free points drift at their own orbital speed; wrapping is invisible once fully detached.
          const drift = P.drift[i] + (orbit.angularSpeed(radius, view.disk) - paper.speed) * seconds;
          P.drift[i] = drift > Math.PI ? drift - TAU : drift < -Math.PI ? drift + TAU : drift;
        }
        theta = paper.theta + (P.fan[i] + P.drift[i]) * blend;
        offsetX = (P.offX[i] * paper.ax + P.offY[i] * paper.bx) * (1 - blend);
        offsetY = (P.offX[i] * paper.ay + P.offY[i] * paper.by) * (1 - blend);
      }
      const cos = Math.cos(theta), sin = Math.sin(theta);
      const tilt = mix(baseTilt, P.shapeTilt[i], blend);
      // The slant is small enough to treat cos(roll) as 1 and sin(roll) as roll.
      const roll = mix(orbit.DISK_ROLL, P.shapeRoll[i], blend);
      const flatX = radius * cos, flatY = radius * sin * tilt + lift;
      let x = view.x + flatX - flatY * roll + offsetX, y = view.y + flatX * roll + flatY + offsetY;
      let lensLight = 1;
      if (P.kind[i] === KIND.halo && blend > 0) {
        // Settling halo points slide from their orbit onto the lensed arch (or bowl), which leans with the disk.
        const lens = orbit.lensPoint(P.shapeR[i], P.lower[i] === 1, theta);
        const lx = lens.x * view.hole, ly = lens.y * view.hole;
        x = mix(x, view.x + lx - ly * orbit.DISK_ROLL, blend);
        y = mix(y, view.y + lx * orbit.DISK_ROLL + ly, blend);
        lensLight = lens.light * (P.lower[i] ? LOWER_LIGHT : 1);
      }
      let light = shade * (TWINKLE_FLOOR + (1 - TWINKLE_FLOOR) * (.5 + .5 * Math.sin(clock * TWINKLE_RATE + P.phase[i])));
      if (sin < 0 && formed > 0) {
        // The far half of every orbit passes behind the hole.
        const depth = (shadow - Math.hypot(x - view.x, y - view.y)) / shadowSoft;
        if (depth > 0) light *= 1 - formed * Math.min(1, depth);
      }
      const hot = blend * lensLight;
      const cool = 1 - blend;
      if (P.kind[i] === KIND.disk) light *= 1 + DISK_DEPTH * sin * blend;
      data[o] = x; data[o + 1] = y; data[o + 2] = mix(P.size[i], P.hotSize[i] * (P.kind[i] === KIND.disk ? 1 + DISK_DEPTH * sin : 1), blend);
      data[o + 3] = (P.baseR[i] * cool + P.hotR[i] * hot) * light;
      data[o + 4] = (P.baseG[i] * cool + P.hotG[i] * hot) * light;
      data[o + 5] = (P.baseB[i] * cool + P.hotB[i] * hot) * light;
      data[o + 6] = P.glow[i] * hot;
    }
  }
  function moveLabels() {
    for (const paper of papers) {
      if (!paper.label) continue;
      const x = view.x + paper.cx - paper.cy * orbit.DISK_ROLL, y = view.y + paper.cx * orbit.DISK_ROLL + paper.cy;
      // Names sit to the right of their sheet, and flip to the left near the right edge so they stay on screen.
      const flipped = x > view.width * LABEL_FLIP;
      paper.label.style.transform = `translate(${(x + (flipped ? -view.paper : view.paper)).toFixed(1)}px,${y.toFixed(1)}px)${flipped ? ' translateX(-100%)' : ''}`;
      paper.label.style.opacity = (1 - ramp(.5, .8, paper.fall)).toFixed(2);
    }
  }
  function draw(seconds, still) {
    if (!resize()) return;
    const step = still ? 1 : seconds * FALL_SPEED;
    movePapers(seconds, step); moveParticles(seconds, step); moveLabels();
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.bloom, 1); gl.drawArrays(gl.POINTS, 0, TOTAL);
    gl.uniform1f(uniforms.bloom, 0); gl.drawArrays(gl.POINTS, 0, TOTAL);
  }
  function tick(now) {
    const seconds = lastFrame ? Math.min(MAX_FRAME_SECONDS, Math.max(0, now - lastFrame) / 1000) : 0;
    lastFrame = now; clock += seconds;
    draw(seconds, false);
    frame = requestAnimationFrame(tick);
  }

  function update() {
    scheduled = false;
    if (scene.classList.contains('is-flat')) return;
    const still = stationary();
    scene.classList.toggle('is-static', still);
    const box = scene.getBoundingClientRect();
    const progress = still ? 1 : -box.top / Math.max(1, scene.offsetHeight - innerHeight);
    state = orbit.sceneState(progress);
    if (shownBeat !== state.beat) {
      shownBeat = state.beat; scene.dataset.beat = String(state.beat);
    }
    beats.forEach((beat, index) => { beat.hidden = !still && index !== state.beat; });
    steps.forEach((step, index) => step.classList.toggle('is-done', still || index <= state.step));
    results.forEach((result, index) => {
      const shown = smooth(ramp(index * .22, index * .22 + .4, state.analysis));
      result.style.opacity = shown.toFixed(3);
      result.style.transform = `translateY(${((1 - shown) * 14).toFixed(1)}px)`;
    });
    const visible = box.top < innerHeight && box.bottom > 0;
    // paper-escape.js listens for this to fly its ship once the hole has formed.
    scene.dispatchEvent(new CustomEvent('paper:state', { detail: { ...state, still, visible } }));
    const running = visible && !still && !document.hidden;
    if (running && !frame) { lastFrame = 0; frame = requestAnimationFrame(tick); }
    else if (!running && frame) { cancelAnimationFrame(frame); frame = 0; }
    if (!still) stillDrawn = false;
    else if (visible) {
      // The still frame never changes, so it is only redrawn when the stage has been resized.
      const before = view;
      if (resize() && (!stillDrawn || view !== before)) { draw(0, true); stillDrawn = true; }
    }
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }

  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); frame = 0; });
  canvas.addEventListener('webglcontextrestored', () => {
    try { setupGraphics(); view = null; stillDrawn = false; schedule(); } catch (error) { fallBack(error.message); }
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  document.querySelector('#motion')?.addEventListener('click', schedule);
  reduced.addEventListener('change', schedule);
  new IntersectionObserver(schedule).observe(scene);
  new ResizeObserver(schedule).observe(stage);
  update();
})();
