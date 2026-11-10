'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const journey = require('../research-journey.js');

// Six phases; the paper scene interrupts after the third. Offsets are in pixels of scroll inside the journey.
const LAYOUT = Object.freeze({ end: 1100, pauseStart: 300, pauseEnd: 800, phaseCount: 6, phasesBeforePause: 3 });
const at = offset => journey.journeyState({ ...LAYOUT, offset });

test('the journey starts on its first phase', () => {
  assert.deepEqual(at(0), { phase: 0, portion: 0 });
});

test('the phases before the paper scene share the scroll evenly', () => {
  assert.deepEqual(at(150), { phase: 1, portion: .5 });
  assert.deepEqual(at(250), { phase: 2, portion: .5 });
});

test('the graph holds the end of the third phase while the paper scene slides over it', () => {
  assert.deepEqual(at(300), { phase: 2, portion: 1 });
  assert.deepEqual(at(500), { phase: 2, portion: 1 });
});

test('the graph is already on the fourth phase when the paper scene uncovers it', () => {
  assert.deepEqual(at(550), { phase: 3, portion: 0 });
  assert.deepEqual(at(799), { phase: 3, portion: 0 });
});

test('the phases after the paper scene share the remaining scroll evenly', () => {
  assert.deepEqual(at(800), { phase: 3, portion: 0 });
  assert.deepEqual(at(850), { phase: 3, portion: .5 });
  assert.deepEqual(at(1050), { phase: 5, portion: .5 });
});

test('the journey ends with its last phase complete', () => {
  assert.deepEqual(at(1100), { phase: 5, portion: 1 });
});

test('scrolling outside the journey is clamped to its first and last frame', () => {
  assert.deepEqual(at(-400), at(0));
  assert.deepEqual(at(9000), at(1100));
  assert.deepEqual(at(NaN), at(0));
});

test('phases advance one at a time and never go back while scrolling down', () => {
  let previous = 0;
  for (let offset = 0; offset <= LAYOUT.end; offset += 5) {
    const { phase, portion } = at(offset);
    assert.ok(phase === previous || phase === previous + 1, `phase jumped at ${offset}`);
    assert.ok(portion >= 0 && portion <= 1, `portion ${portion} at ${offset}`);
    previous = phase;
  }
  assert.equal(previous, LAYOUT.phaseCount - 1);
});

test('without a paper scene the phases run straight through', () => {
  const straight = offset => journey.journeyState({ ...LAYOUT, end: 600, pauseStart: 300, pauseEnd: 300, offset });

  assert.deepEqual(straight(250), { phase: 2, portion: .5 });
  assert.deepEqual(straight(300), { phase: 3, portion: 0 });
  assert.deepEqual(straight(350), { phase: 3, portion: .5 });
});

test('a journey with no room to scroll stays within its phases', () => {
  const state = journey.journeyState({ offset: 0, end: 0, pauseStart: 0, pauseEnd: 0, phaseCount: 6, phasesBeforePause: 3 });

  assert.ok(state.phase >= 0 && state.phase <= 5);
  assert.ok(state.portion >= 0 && state.portion <= 1);
});

test('a scene outside the viewport covers nothing', () => {
  assert.equal(journey.coverage(900, 1800, 900), 0);
  assert.equal(journey.coverage(-1800, 0, 900), 0);
});

test('a scene filling the viewport covers all of it', () => {
  assert.equal(journey.coverage(0, 900, 900), 1);
  assert.equal(journey.coverage(-500, 2000, 900), 1);
});

test('a scene sliding in or out covers the share of the viewport it overlaps', () => {
  assert.equal(journey.coverage(450, 1350, 900), .5);
  assert.equal(journey.coverage(-675, 225, 900), .25);
});

test('coverage is zero when the viewport has no height', () => {
  assert.equal(journey.coverage(0, 100, 0), 0);
  assert.equal(journey.coverage(NaN, NaN, 900), 0);
});

// Page 2: as the signal runs along the detour, each box's explanation shows while the signal is at that box.
// Beats: 0 intro, 1..n one per box, n + 1 the conclusion.
const STOPS = Object.freeze([.2, .5, .8]);

test('the intro shows before the signal reaches the first box', () => {
  assert.equal(journey.detourBeat(0, STOPS), 0);
  assert.equal(journey.detourBeat(.05, STOPS), 0);
});

test('each box explains itself while the signal is at it, and gives way before the next box', () => {
  assert.equal(journey.detourBeat(.2, STOPS), 1);
  assert.equal(journey.detourBeat(.34, STOPS), 1);
  assert.equal(journey.detourBeat(.36, STOPS), 2);
  assert.equal(journey.detourBeat(.5, STOPS), 2);
  assert.equal(journey.detourBeat(.8, STOPS), 3);
});

test('the conclusion follows once the signal has left the last box', () => {
  assert.equal(journey.detourBeat(.95, STOPS), 4);
  assert.equal(journey.detourBeat(1, STOPS), 4);
});

test('the beat only moves forward as the signal moves forward', () => {
  let last = 0;
  for (let portion = 0; portion <= 1; portion += .01) {
    const beat = journey.detourBeat(portion, STOPS);
    assert.ok(beat >= last, `went back at ${portion.toFixed(2)}`);
    last = beat;
  }
});

test('the conclusion still shows when the last box sits near the end of the detour', () => {
  assert.equal(journey.detourBeat(.98, [.2, .5, .93]), 4);
  assert.equal(journey.detourBeat(.93, [.2, .5, .93]), 3);
});

test('each box explains itself in turn, and the last explanation stays up through the conclusion', () => {
  assert.equal(journey.explainedDetour(0, 3), -1, 'nothing during the intro');
  assert.equal(journey.explainedDetour(1, 3), 0);
  assert.equal(journey.explainedDetour(2, 3), 1);
  assert.equal(journey.explainedDetour(3, 3), 2);
  assert.equal(journey.explainedDetour(4, 3), 2, 'the last one stays with the conclusion');
});
