'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const orbit = require('../paper-orbit.js');

const SAMPLE_COUNT = 4000;
const samples = () => {
  const random = orbit.createRandom(20261110);
  return Array.from({ length: SAMPLE_COUNT }, () => orbit.sampleShape(random));
};

test('papers only circulate at the start of the scene', () => {
  const state = orbit.sceneState(0);

  assert.deepEqual({ ...state }, { pull: 0, analysis: 0, beat: 0, step: 0 });
});

test('the pull stays off until the papers have circulated for a while', () => {
  assert.equal(orbit.sceneState(orbit.TIMELINE.pullStart).pull, 0);
  assert.equal(orbit.sceneState(orbit.TIMELINE.pullStart).beat, 1);
});

test('the pull grows steadily while scrolling through the second beat', () => {
  const { pullStart, pullEnd } = orbit.TIMELINE;

  const halfway = orbit.sceneState((pullStart + pullEnd) / 2);

  assert.ok(Math.abs(halfway.pull - .5) < 1e-9);
  assert.equal(halfway.beat, 1);
});

test('pull never decreases as the page scrolls down', () => {
  let previous = 0;
  for (let i = 0; i <= 200; i++) {
    const { pull } = orbit.sceneState(i / 200);
    assert.ok(pull >= previous, `pull dropped at ${i / 200}`);
    previous = pull;
  }
});

test('every paper is absorbed before the analysis result appears', () => {
  for (let i = 0; i <= 200; i++) {
    const state = orbit.sceneState(i / 200);
    if (state.analysis > 0) assert.equal(state.pull, 1);
  }
});

test('the scene ends fully formed and analysed, with room to rest', () => {
  const state = orbit.sceneState(1);

  assert.deepEqual({ ...state }, { pull: 1, analysis: 1, beat: 2, step: orbit.TIMELINE.stepStarts.length - 1 });
  assert.equal(orbit.sceneState(.95).analysis, 1);
});

test('out-of-range and invalid progress is clamped', () => {
  assert.deepEqual({ ...orbit.sceneState(-3) }, { ...orbit.sceneState(0) });
  assert.deepEqual({ ...orbit.sceneState(7) }, { ...orbit.sceneState(1) });
  assert.deepEqual({ ...orbit.sceneState(NaN) }, { ...orbit.sceneState(0) });
});

test('pipeline steps light up one at a time in order', () => {
  let previous = 0;
  for (let i = 0; i <= 200; i++) {
    const { step } = orbit.sceneState(i / 200);
    assert.ok(step === previous || step === previous + 1);
    previous = step;
  }
  assert.equal(previous, orbit.TIMELINE.stepStarts.length - 1);
});

test('nothing falls before the pull starts', () => {
  assert.equal(orbit.infall(0, 0), 0);
  assert.equal(orbit.infall(0, 1), 0);
});

test('inner particles fall before outer ones', () => {
  assert.ok(orbit.infall(.3, 0) > orbit.infall(.3, 1));
  assert.equal(orbit.infall(.3, 1), 0);
});

test('every particle has arrived once the pull is complete', () => {
  for (const order of [0, .25, .5, .75, 1]) assert.equal(orbit.infall(1, order), 1);
});

test('infall stays within zero and one for any input', () => {
  for (const [pull, order] of [[-1, .5], [2, .5], [.5, -4], [.5, 9], [NaN, NaN]]) {
    const value = orbit.infall(pull, order);
    assert.ok(value >= 0 && value <= 1, `infall(${pull}, ${order}) = ${value}`);
  }
});

test('particles orbit faster the closer they are', () => {
  assert.ok(orbit.angularSpeed(.5, 1) > orbit.angularSpeed(1, 1));
});

test('orbital speed is capped near the centre and safe at radius zero', () => {
  assert.equal(orbit.angularSpeed(.0001, 1), orbit.MAX_ANGULAR_SPEED);
  assert.equal(orbit.angularSpeed(0, 1), orbit.MAX_ANGULAR_SPEED);
});

test('a paper outline has exactly the requested number of points', () => {
  assert.equal(orbit.paperOutline(96).length, 96);
  assert.equal(orbit.paperOutline(40).length, 40);
});

test('paper outline points stay on the sheet', () => {
  const { halfWidth, halfHeight } = orbit.PAPER;

  for (const point of orbit.paperOutline(96)) {
    assert.ok(Math.abs(point.x) <= halfWidth + 1e-9);
    assert.ok(Math.abs(point.y) <= halfHeight + 1e-9);
  }
});

test('a paper outline draws all four edges and text lines inside', () => {
  const { halfWidth, halfHeight } = orbit.PAPER;
  const points = orbit.paperOutline(96);
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  assert.ok(points.some(p => near(p.x, -halfWidth)));
  assert.ok(points.some(p => near(p.x, halfWidth)));
  assert.ok(points.some(p => near(p.y, -halfHeight)));
  assert.ok(points.some(p => near(p.y, halfHeight)));
  assert.ok(points.some(p => Math.abs(p.x) < halfWidth * .9 && Math.abs(p.y) < halfHeight * .9));
});

test('the random source is repeatable for a given seed', () => {
  const first = orbit.createRandom(7), second = orbit.createRandom(7);

  const a = [first(), first(), first()], b = [second(), second(), second()];

  assert.deepEqual(a, b);
  assert.ok(a.every(value => value >= 0 && value < 1));
});

test('the black hole shape uses every kind of structure', () => {
  const kinds = new Set(samples().map(sample => sample.kind));

  assert.deepEqual([...kinds].sort(), ['disk', 'halo', 'ring', 'swirl']);
});

test('no particle settles inside the shadow of the black hole', () => {
  for (const sample of samples()) assert.ok(sample.radius > 1, `${sample.kind} at ${sample.radius}`);
});

test('the photon ring hugs the shadow and the halo sits outside it', () => {
  const all = samples();
  const ringMax = Math.max(...all.filter(s => s.kind === 'ring').map(s => s.radius));
  const haloMin = Math.min(...all.filter(s => s.kind === 'halo').map(s => s.radius));

  assert.ok(ringMax < 1.1);
  assert.ok(haloMin >= ringMax);
});

test('ring and halo face the viewer while the level disk tilts only front to back', () => {
  for (const sample of samples()) {
    if (sample.kind === 'ring' || sample.kind === 'halo') assert.equal(sample.tilt, 1);
    // A thin band across the shadow, its near edge below the far edge, with no sideways slant.
    if (sample.kind === 'disk') assert.ok(sample.tilt >= .12 && sample.tilt <= .18, `disk tilt ${sample.tilt}`);
    if (sample.kind === 'disk' || sample.kind === 'swirl') assert.equal(sample.roll, 0);
  }
});

test('shape samples carry a heat between zero and one', () => {
  for (const sample of samples()) assert.ok(sample.heat >= 0 && sample.heat <= 1);
});

test('the finished black hole rests for over a quarter of the scroll before the page moves on', () => {
  const rest = 1 - orbit.TIMELINE.analysisEnd;

  assert.ok(rest >= .25, `rest share ${rest}`);
  assert.equal(orbit.sceneState(orbit.TIMELINE.analysisEnd).analysis, 1);
});

// The lensed back of the disk, after the reference image: a round arch hugging the top and a bowl underneath.
const { inner: HALO_IN, width: HALO_W } = orbit.SHAPE.halo;
const BANDS = [HALO_IN, HALO_IN + HALO_W / 2, HALO_IN + HALO_W];
const lensSweep = (band, lower) => Array.from({ length: 181 }, (_, i) => orbit.lensPoint(band, lower, i / 180 * Math.PI));
const width = points => Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
const height = points => Math.max(...points.map(p => Math.abs(p.y)));

test('the upper arch sits above the shadow and the lower bowl below it', () => {
  for (const band of BANDS) {
    assert.ok(lensSweep(band, false).every(p => p.y <= 0));
    assert.ok(lensSweep(band, true).every(p => p.y >= 0));
  }
});

test('lensed light never falls inside the shadow', () => {
  for (const band of BANDS) {
    for (const lower of [false, true]) {
      for (const p of lensSweep(band, lower)) assert.ok(Math.hypot(p.x, p.y) > 1.02, `band ${band} at ${p.x},${p.y}`);
    }
  }
});

test('the halo hugs the shadow closely instead of spreading out', () => {
  assert.ok(HALO_IN + HALO_W <= 2, `outer band ${HALO_IN + HALO_W}`);
  for (const band of BANDS) {
    const arch = lensSweep(band, false);
    assert.ok(height(arch) < 1.8, `arch height ${height(arch)}`);
    assert.ok(width(arch) / height(arch) < 2.8, 'arch stays nearly round');
  }
});

test('the arch flares a little at its base, and the bowl is a bit narrower', () => {
  const outer = HALO_IN + HALO_W, arch = lensSweep(outer, false), bowl = lensSweep(outer, true);

  assert.ok(width(arch) / height(arch) > 2.2, 'flared base');
  assert.ok(width(bowl) < width(arch) * .85);
  assert.ok(height(bowl) > height(arch) * .8, 'bowl about as deep as the arch is tall');
});

test('the outer swirl stays close to the disk instead of filling the sky', () => {
  const swirl = samples().filter(sample => sample.kind === 'swirl');
  assert.ok(Math.max(...swirl.map(sample => sample.radius)) <= 5);
  assert.ok(swirl.every(sample => sample.tilt <= .2));
});

test('the arch fades out where it meets the disk, so wrapping round is invisible', () => {
  assert.ok(orbit.lensPoint(3, false, 0).light < .05);
  assert.ok(orbit.lensPoint(3, false, Math.PI / 2).light > .9);
  assert.ok(Math.abs(orbit.lensPoint(3, false, 0).y) < .01);
});

test('halo particles are split between the arch and the bowl', () => {
  const halo = samples().filter(sample => sample.kind === 'halo');
  const lower = halo.filter(sample => sample.lower).length / halo.length;

  assert.ok(lower > .2 && lower < .4, `lower share ${lower}`);
});

test('scattered dust spreads over the whole screen, not a ring', () => {
  const random = orbit.createRandom(7);
  const points = Array.from({ length: 2000 }, () => orbit.scatterPoint(random));
  const reach = .5 + orbit.SCATTER.margin;

  assert.ok(points.every(({ u, v }) => Math.abs(u) <= reach && Math.abs(v) <= reach));
  // Every quadrant and the centre are covered.
  for (const [su, sv] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    assert.ok(points.filter(({ u, v }) => u * su > .3 && v * sv > .3).length > 50);
  }
  assert.ok(points.filter(({ u, v }) => Math.hypot(u, v) < .1).length > 30);
});

test('scattered dust near the centre is pulled in before dust at the edges', () => {
  const random = orbit.createRandom(11);
  const points = Array.from({ length: 2000 }, () => orbit.scatterPoint(random));
  const mean = list => list.reduce((sum, p) => sum + p.order, 0) / list.length;

  assert.ok(points.every(({ order }) => order >= 0 && order <= 1));
  assert.ok(mean(points.filter(p => Math.hypot(p.u, p.v) < .2)) < mean(points.filter(p => Math.hypot(p.u, p.v) > .5)));
});

test('free papers circle the centre on a wide, flat horizontal orbit at many heights', () => {
  const random = orbit.createRandom(5);
  const papers = Array.from({ length: 2000 }, () => orbit.carouselPoint(random));
  const { radiusMin, radiusMax, heightReach } = orbit.CAROUSEL;

  assert.ok(papers.every(p => p.radius >= radiusMin && p.radius <= radiusMax));
  assert.ok(papers.every(p => Math.abs(p.height) <= heightReach));
  assert.ok(papers.filter(p => p.height < -heightReach / 2).length > 100 && papers.filter(p => p.height > heightReach / 2).length > 100);
  // Like a thick disk: more sheets near the plane than far above or below it.
  assert.ok(papers.filter(p => Math.abs(p.height) < heightReach / 5).length > papers.filter(p => Math.abs(p.height) > heightReach * .6).length);
  assert.ok(orbit.CAROUSEL.tilt < .5, 'the orbit is seen nearly edge-on, like a horizontal circle');
});

test('free papers all turn clockwise, slowly', () => {
  const random = orbit.createRandom(9);
  const papers = Array.from({ length: 500 }, () => orbit.carouselPoint(random));

  // Screen y points down, so a growing angle turns clockwise on screen.
  assert.ok(papers.every(p => p.spin > 0 && p.spin < .2));
});

test('papers on the inner orbits are pulled in before the outer ones', () => {
  const random = orbit.createRandom(13);
  const papers = Array.from({ length: 2000 }, () => orbit.carouselPoint(random));
  const mean = list => list.reduce((sum, p) => sum + p.order, 0) / list.length;

  assert.ok(papers.every(p => p.order >= 0 && p.order <= 1));
  assert.ok(mean(papers.filter(p => p.radius < .3)) < mean(papers.filter(p => p.radius > .6)));
});
