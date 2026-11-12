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
  // Sideways slant of the disk axis, in radians. Kept at zero so the disk stays level.
  const DISK_ROLL = 0;
  // The black hole in units of its shadow radius, after the reference image:
  // a thin photon ring, a lensed halo, an accretion disk and a faint outer swirl.
  // The disk is a thin, level band across the shadow, tilted only front to back so its near edge sits below the far edge.
  const SHAPE = Object.freeze({
    ring: Object.freeze({ share: .05, inner: 1.03, width: .03 }),
    // The halo is the far side of the disk bent round the shadow: bands from `inner` out to `inner + width`.
    halo: Object.freeze({ share: .45, inner: 1.08, width: .75, falloff: 1.15, lowerShare: .3, outerHeat: .7 }),
    disk: Object.freeze({ share: .28, inner: 1.4, width: 3, falloff: 1.25, tilt: .14, thickness: .02, bandSpacing: .62, bandDepth: .07 }),
    swirl: Object.freeze({ inner: 1.8, width: 3, falloff: .8, tilt: .18, thickness: .12, heat: .15 }),
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
      // `offset` is uniform on -0.5..0.5, so this sends lowerShare of the halo to the bowl underneath.
      const lower = offset < halo.lowerShare - .5;
      return { kind: 'halo', radius: halo.inner + depth * halo.width, tilt: 1, roll: 0, lift: 0, heat: 1 - (1 - halo.outerHeat) * depth, lower };
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

  // Lensing, after the reference image. Light from behind the hole wraps over the top as a nearly round arch
  // that flares a little where it meets the disk, and under the bottom as a slightly narrower bowl. `angle` runs along the arch.
  const LENS = Object.freeze({
    upper: Object.freeze({ widen: .15, rise: 1.12, riseGrowth: .75, flare: .5 }),
    lower: Object.freeze({ reach: 1.06, reachGrowth: .65, depth: 1.12, depthGrowth: .55 }),
    fade: .35,
  });
  function lensPoint(band, lower, angle) {
    const along = ((angle % Math.PI) + Math.PI) % Math.PI;
    const out = band - SHAPE.halo.inner;
    const sin = Math.sin(along), cos = Math.cos(along);
    const light = sin ** LENS.fade;
    if (lower) {
      const { reach, reachGrowth, depth, depthGrowth } = LENS.lower;
      return { x: (reach + reachGrowth * out) * cos, y: (depth + depthGrowth * out) * sin, light };
    }
    const { widen, rise, riseGrowth, flare } = LENS.upper;
    const share = clamp01(out / SHAPE.halo.width);
    return { x: band * (1 + widen * share) * cos, y: -(rise + riseGrowth * out) * sin ** (1 + flare * share), light };
  }

  // Before the pull, dust is scattered all over the screen like stars. Positions are shares of the stage width (u)
  // and height (v) from its centre; `margin` reaches a little past the edges.
  const SCATTER = Object.freeze({ margin: .08, distanceShare: .7 });
  function scatterPoint(random) {
    const reach = .5 + SCATTER.margin;
    const u = (random() * 2 - 1) * reach, v = (random() * 2 - 1) * reach;
    const distance = Math.min(1, Math.hypot(u, v) / (reach * Math.SQRT2));
    return { u, v, order: clamp01(distance * SCATTER.distanceShare + random() * (1 - SCATTER.distanceShare)) };
  }
  // Before the pull, papers ride a thick horizontal disk seen from slightly above, like the black hole's own disk,
  // and turn slowly clockwise. Most sit close to the disk plane, a few float well above or below it.
  // `radius` is a share of the stage width, `height` a share of its height from the plane, `spin` radians per second.
  const CAROUSEL = Object.freeze({ radiusMin: .06, radiusMax: .7, heightReach: .32, tilt: .3, spinMin: .025, spinRange: .03, radiusShare: .7 });
  function carouselPoint(random) {
    const { radiusMin, radiusMax, heightReach, spinMin, spinRange, radiusShare } = CAROUSEL;
    const reach = Math.sqrt(random());
    return {
      radius: radiusMin + reach * (radiusMax - radiusMin),
      // Two uniforms summed peak in the middle, so the sheets crowd towards the plane.
      height: (random() + random() - 1) * heightReach,
      angle: random() * 2 * Math.PI,
      spin: spinMin + random() * spinRange,
      order: clamp01(reach * radiusShare + random() * (1 - radiusShare)),
    };
  }

  const api = Object.freeze({ TIMELINE, PAPER, SHAPE, SCATTER, CAROUSEL, DISK_ROLL, MAX_ANGULAR_SPEED, clamp01, createRandom, sceneState, infall, angularSpeed, paperOutline, sampleShape, lensPoint, scatterPoint, carouselPoint });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PaperOrbit = api;
})(typeof window === 'undefined' ? globalThis : window);
