'use strict';
// Timeline and particle layout for the paper black hole scene. No DOM access, so it runs under node --test.
(root => {
  // Scroll progress (0..1) at which each part of the story starts and ends.
  const TIMELINE = Object.freeze({
    pullStart: .13,
    pullEnd: .57,
    analysisStart: .585,
    analysisEnd: .71,
    // The finished black hole holds for the rest of the scroll, so the page does not move on abruptly.
    stepStarts: Object.freeze([0, .13, .36, .585]),
  });
  // Share of the pull during which particles are still waiting their turn; the rest is each one's own fall.
  const CAPTURE_SPREAD = .78;
  const BASE_ANGULAR_SPEED = .07;
  const MAX_ANGULAR_SPEED = 1.1;
  const KEPLER_EXPONENT = 1.5;
  const PAPER = Object.freeze({ halfWidth: .5, halfHeight: .7, outlineShare: .52, textLines: 6, textHalfWidth: .32, textHalfHeight: .44 });
  // Slight slant of the disk axis, in radians (about 8 degrees, as in the reference image).
  const DISK_ROLL = -.14;
  // The black hole in units of its shadow radius, after the reference image:
  // a thin photon ring, a lensed halo, an accretion disk and a faint outer swirl.
  // The disk leans its near edge down a little, so it reads as a ring in depth rather than a flat line.
  const SHAPE = Object.freeze({
    ring: Object.freeze({ share: .12, inner: 1.03, width: .04 }),
    halo: Object.freeze({ share: .38, inner: 1.08, width: .8, falloff: 2.2 }),
    disk: Object.freeze({ share: .28, inner: 1.4, width: 4.2, falloff: 1.25, tilt: .2, thickness: .02, bandSpacing: .62, bandDepth: .07 }),
    swirl: Object.freeze({ inner: 2, width: 5.5, falloff: .8, tilt: .9, thickness: .12, heat: .15 }),
  });

  const clamp01 = value => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const ramp = (start, end, value) => clamp01((value - start) / (end - start));

  function createRandom(seed) {
    let state = Math.max(1, Math.floor(Math.abs(seed)) % 2147483647);
    return () => { state = state * 16807 % 2147483647; return (state - 1) / 2147483646; };
  }

  function sceneState(progress) {
    const p = clamp01(progress);
    const step = TIMELINE.stepStarts.reduce((last, start, index) => p >= start ? index : last, 0);
    return Object.freeze({
      pull: ramp(TIMELINE.pullStart, TIMELINE.pullEnd, p),
      analysis: ramp(TIMELINE.analysisStart, TIMELINE.analysisEnd, p),
      beat: p < TIMELINE.pullStart ? 0 : p < TIMELINE.pullEnd ? 1 : 2,
      step,
    });
  }

  // How far a particle has fallen (0..1). `order` 0 falls first, 1 falls last.
  function infall(pull, order) {
    return clamp01((clamp01(pull) - clamp01(order) * CAPTURE_SPREAD) / (1 - CAPTURE_SPREAD));
  }

  function angularSpeed(radius, reference) {
    if (!(radius > 0)) return MAX_ANGULAR_SPEED;
    return Math.min(MAX_ANGULAR_SPEED, BASE_ANGULAR_SPEED * (reference / radius) ** KEPLER_EXPONENT);
  }

  // Points of a wireframe sheet: the outline first, then rows of text.
  function paperOutline(count) {
    const { halfWidth: w, halfHeight: h } = PAPER;
    const outlineCount = Math.round(count * PAPER.outlineShare);
    const edges = [
      { length: 2 * w, at: d => ({ x: -w + d, y: -h }) },
      { length: 2 * h, at: d => ({ x: w, y: -h + d }) },
      { length: 2 * w, at: d => ({ x: w - d, y: h }) },
      { length: 2 * h, at: d => ({ x: -w, y: h - d }) },
    ];
    const perimeter = edges.reduce((sum, edge) => sum + edge.length, 0);
    const outline = Array.from({ length: outlineCount }, (_, i) => {
      let distance = i * perimeter / outlineCount;
      const edge = edges.find(candidate => {
        if (distance < candidate.length) return true;
        distance -= candidate.length;
        return false;
      }) ?? edges[edges.length - 1];
      return edge.at(Math.min(distance, edge.length));
    });
    const textCount = count - outlineCount;
    const perLine = Math.ceil(textCount / PAPER.textLines);
    const text = Array.from({ length: textCount }, (_, i) => {
      const line = i % PAPER.textLines;
      const column = Math.floor(i / PAPER.textLines) / Math.max(1, perLine - 1);
      // The last line of a paragraph stops short.
      const reach = line === PAPER.textLines - 1 ? .45 : 1;
      return {
        x: -PAPER.textHalfWidth + column * reach * 2 * PAPER.textHalfWidth,
        y: -PAPER.textHalfHeight + line / (PAPER.textLines - 1) * 2 * PAPER.textHalfHeight,
      };
    });
    return [...outline, ...text];
  }

  // Where one particle rests once the black hole has formed.
  function sampleShape(random) {
    const pick = random(), spread = random(), offset = random() - .5;
    const { ring, halo, disk, swirl } = SHAPE;
    if (pick < ring.share) {
      return { kind: 'ring', radius: ring.inner + spread * ring.width, tilt: 1, roll: 0, lift: 0, heat: 1 };
    }
    if (pick < ring.share + halo.share) {
      const depth = spread ** halo.falloff;
      return { kind: 'halo', radius: halo.inner + depth * halo.width, tilt: 1, roll: 0, lift: 0, heat: 1 - depth };
    }
    if (pick < ring.share + halo.share + disk.share) {
      const depth = spread ** disk.falloff;
      const even = disk.inner + depth * disk.width;
      // Bunch particles into concentric bands with fainter gaps between them.
      const radius = even - disk.bandDepth * Math.sin(even * 2 * Math.PI / disk.bandSpacing);
      return { kind: 'disk', radius, tilt: disk.tilt, roll: DISK_ROLL, lift: offset * disk.thickness * Math.sqrt(radius), heat: 1 - depth };
    }
    const depth = spread ** swirl.falloff;
    return { kind: 'swirl', radius: swirl.inner + depth * swirl.width, tilt: swirl.tilt, roll: DISK_ROLL, lift: offset * swirl.thickness, heat: swirl.heat * (1 - depth) };
  }

  const api = Object.freeze({ TIMELINE, PAPER, SHAPE, DISK_ROLL, MAX_ANGULAR_SPEED, clamp01, createRandom, sceneState, infall, angularSpeed, paperOutline, sampleShape });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PaperOrbit = api;
})(typeof window === 'undefined' ? globalThis : window);
