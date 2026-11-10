'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const escape = require('../paper-escape.js');

const VIEW = Object.freeze({ x: 720, y: 500, r: 70, width: 1440, height: 900 });
const PHONE = Object.freeze({ x: 195, y: 420, r: 30, width: 390, height: 750 });
const FRAME = 1 / 60;
const offscreen = (pose, view) => pose.x < -40 || pose.x > view.width + 40 || pose.y < -40;
const timeline = (view, every = FRAME) => {
  const poses = [];
  for (let t = 0; t <= escape.DURATION.total; t += every) poses.push({ t, ...escape.pose(t, view) });
  return poses;
};

test('the ship flies in from off screen on the right and leaves off screen on the left', () => {
  for (const view of [VIEW, PHONE]) {
    const start = escape.pose(0, view);
    const end = escape.pose(escape.DURATION.escapeEnd, view);

    assert.ok(offscreen(start, view) && start.x > view.x, `start ${start.x},${start.y}`);
    assert.ok(offscreen(end, view) && end.x < view.x, `end ${end.x},${end.y}`);
  }
});

test('the path has no jumps between frames', () => {
  for (const view of [VIEW, PHONE]) {
    const poses = timeline(view);
    for (let i = 1; i < poses.length; i++) {
      const jump = Math.hypot(poses[i].x - poses[i - 1].x, poses[i].y - poses[i - 1].y);
      assert.ok(jump < 60, `jump of ${jump.toFixed(0)}px at ${poses[i].t.toFixed(2)}s`);
    }
  }
});

test('the ship is dragged towards the hole but keeps clear of its glowing ring', () => {
  const closest = Math.min(...timeline(VIEW).map(pose => pose.orbit));

  assert.ok(closest > 2.4, `closest orbit ${closest}`);
  assert.ok(closest < 3, `closest orbit ${closest}`);
});

test('the ship struggles at the edge in plain view before it escapes', () => {
  const struggle = timeline(VIEW).filter(pose => pose.t > escape.DURATION.spiralEnd && pose.t < escape.DURATION.boostEnd);

  assert.ok(struggle.every(pose => pose.hidden === 0), 'the wheel ship holds in front of the hole');
  assert.ok(struggle.some(pose => pose.orbit < 3));
});

test('the ship orbits in the plane of the disk, so its orbit is as flat as the disk', () => {
  const orbit = require('../paper-orbit.js');
  const poses = timeline(VIEW).filter(pose => pose.t > escape.DURATION.approachEnd && pose.t < escape.DURATION.boostEnd);
  for (const pose of poses) {
    const lift = (pose.y - VIEW.y) / (pose.orbit * VIEW.r * Math.sin(pose.theta) || 1);
    if (Math.abs(Math.sin(pose.theta)) > .2) assert.ok(Math.abs(lift - orbit.SHAPE.disk.tilt) < 1e-9);
  }
});

test('the ship disappears behind the black shadow as it passes round the far side', () => {
  const poses = timeline(VIEW);

  assert.ok(poses.some(pose => pose.hidden === 1), 'fully hidden at least once');
  for (const pose of poses.filter(pose => pose.hidden === 1)) {
    assert.ok(Math.hypot(pose.x - VIEW.x, pose.y - VIEW.y) < VIEW.r, 'only hidden over the shadow');
  }
});

test('the near side of the orbit draws the ship larger than the far side', () => {
  const poses = timeline(VIEW).filter(pose => pose.t > escape.DURATION.approachEnd && pose.t < escape.DURATION.spiralEnd);
  const near = poses.filter(pose => Math.sin(pose.theta) > .9), far = poses.filter(pose => Math.sin(pose.theta) < -.9);

  assert.ok(near.length && far.length);
  assert.ok(Math.min(...near.map(pose => pose.scale)) > Math.max(...far.map(pose => pose.scale)));
});

test('the ship is only hidden while it passes behind the hole', () => {
  for (const pose of timeline(VIEW, .01)) {
    if (pose.hidden > 0) assert.ok(pose.behind, `hidden in plain view at ${pose.t.toFixed(2)}s`);
  }
});

test('the engine is weak while captured and at full power while escaping', () => {
  const captured = escape.pose((escape.DURATION.approachEnd + escape.DURATION.spiralEnd) / 2, VIEW);
  const escaping = escape.pose((escape.DURATION.boostEnd + escape.DURATION.escapeEnd) / 2, VIEW);

  assert.ok(captured.flame < .4);
  assert.ok(escaping.flame > .8);
  assert.ok(captured.shake > 0);
  assert.equal(escaping.shake, 0);
});

test('Dr. Brand, on the wheel ship, says goodbye to TARS, then asks Cooper what he is doing, and the caption follows', () => {
  const lines = [];
  for (const { bubble } of timeline(VIEW, .05)) {
    const brand = bubble === 'safe' || escape.SPEAKER[bubble] === 'brand';
    if (brand && lines[lines.length - 1] !== bubble) lines.push(bubble);
  }

  assert.deepEqual(lines, ['byeTars', 'what', 'safe']);
});

test('the scene never plays by itself: the button can start it only once the black hole has formed', () => {
  assert.equal('shouldStart' in escape, false, 'no autoplay');
  assert.equal(escape.canPlay({ pull: .9, still: false }), false);
  assert.equal(escape.canPlay({ pull: 1, still: true }), false, 'not with motion turned off');
  assert.equal(escape.canPlay({ pull: 1, still: false }), true);
});

test('the button reads "🚀 블랙홀 탈출 해보기"', () => {
  assert.equal(escape.PLAY_LABEL, '🚀 블랙홀 탈출 해보기');
});

test('the wheel stands upright, seen at an angle: its pods trace an ellipse taller than it is wide', () => {
  const pods = escape.wheelLayout(0);
  const width = Math.max(...pods.map(pod => pod.x)) - Math.min(...pods.map(pod => pod.x));
  const height = Math.max(...pods.map(pod => pod.y)) - Math.min(...pods.map(pod => pod.y));

  assert.equal(pods.length, 6);
  assert.ok(height > width * 1.4, `${width} x ${height}`);
});

test('near pods are drawn larger than far pods, and the far half sits behind the hub', () => {
  const pods = escape.wheelLayout(.4);
  const near = pods.filter(pod => pod.front), far = pods.filter(pod => !pod.front);

  assert.equal(near.length, 3);
  assert.ok(Math.min(...near.map(pod => pod.scale)) > Math.max(...far.map(pod => pod.scale)));
  assert.ok(near.every(pod => pod.x > 0) && far.every(pod => pod.x < 0));
});

test('spinning the wheel carries each pod round from back to front', () => {
  const quarter = Math.PI * 2 / 6;
  const before = escape.wheelLayout(.1)[0], after = escape.wheelLayout(.1 + Math.PI)[0];

  assert.notEqual(before.front, after.front);
  assert.ok(Math.abs(escape.wheelLayout(.1 + quarter)[0].y - escape.wheelLayout(.1)[1].y) < 1e-9);
});

// TARS lets go first, then Cooper; both fall into the hole while Dr. Brand's wheel ship escapes.
const SHUTTLES = ['robot', 'cooper'];
const releaseTimeline = (who, view = VIEW) => {
  const poses = [];
  for (let t = 0; t <= escape.DURATION.total; t += FRAME) {
    const pose = escape.releasePose(who, t, view);
    if (pose) poses.push({ t, ...pose });
  }
  return poses;
};

test('each shuttle stays docked until its moment, TARS first and Cooper after', () => {
  const { robotRelease, cooperRelease } = escape.DURATION;

  assert.ok(robotRelease < cooperRelease);
  assert.equal(escape.releasePose('robot', robotRelease - .01, VIEW), null);
  assert.ok(escape.releasePose('robot', robotRelease + .01, VIEW));
  assert.equal(escape.releasePose('cooper', cooperRelease - .01, VIEW), null);
  assert.ok(escape.releasePose('cooper', cooperRelease + .01, VIEW));
});

test('each shuttle lets go from where the wheel ship is', () => {
  for (const [who, at] of [['robot', escape.DURATION.robotRelease], ['cooper', escape.DURATION.cooperRelease]]) {
    const ship = escape.pose(at + .001, VIEW), shuttle = escape.releasePose(who, at + .001, VIEW);
    assert.ok(Math.hypot(ship.x - shuttle.x, ship.y - shuttle.y) < 3, who);
  }
});

test('both shuttles fall into the hole and never come back out', () => {
  for (const who of SHUTTLES) {
    const poses = releaseTimeline(who);
    const firstGone = poses.findIndex(pose => pose.hidden === 1 && pose.orbit < 1);
    assert.ok(firstGone > 0, `${who} falls past the edge`);
    assert.ok(poses.slice(firstGone).every(pose => pose.hidden === 1 && pose.orbit < 1), `${who} stays gone`);
  }
});

test('the wheel ship only escapes after both shuttles are gone', () => {
  const boostStart = escape.DURATION.holdEnd;
  for (const who of SHUTTLES) assert.equal(escape.releasePose(who, boostStart, VIEW).hidden, 1, who);
});

test('every line is spoken while its speaker can be seen', () => {
  for (const who of SHUTTLES) {
    for (const pose of releaseTimeline(who).filter(pose => pose.bubble)) assert.equal(pose.hidden, 0, `${who} at ${pose.t.toFixed(2)}s`);
  }
  for (const pose of timeline(VIEW).filter(pose => pose.bubble && pose.bubble !== 'safe')) assert.equal(pose.hidden, 0);
});

test('the dialogue runs in the order of the script, one speaker at a time', () => {
  const spoken = [];
  for (let t = 0; t <= escape.DURATION.total; t += .05) {
    const lines = [escape.pose(t, VIEW).bubble, ...SHUTTLES.map(who => escape.releasePose(who, t, VIEW)?.bubble)].filter(Boolean);
    assert.ok(lines.length <= 1, `${lines.join(', ')} at ${t.toFixed(2)}s`);
    if (lines[0] && spoken[spoken.length - 1] !== lines[0]) spoken.push(lines[0]);
  }

  assert.deepEqual(spoken, ['countdown', 'byeTars', 'tarsReply', 'sure', 'prep', 'what', 'honest', 'safe']);
});

test('TARS lets go on the right of the hole and Cooper near the middle, in front of it', () => {
  const robot = escape.releasePose('robot', escape.DURATION.robotRelease + .001, VIEW);
  const cooper = escape.releasePose('cooper', escape.DURATION.cooperRelease + .001, VIEW);

  assert.ok(robot.x > VIEW.x + 2 * VIEW.r, `TARS at ${robot.x}`);
  assert.ok(Math.abs(cooper.x - VIEW.x) < .5 * VIEW.r, `Cooper at ${cooper.x}`);
  assert.ok(!cooper.behind, 'Cooper is in front of the hole');
});

test('TARS is pulled in on the right side, and Cooper falls into the middle', () => {
  for (const pose of releaseTimeline('robot').filter(pose => pose.hidden < 1)) assert.ok(pose.x > VIEW.x, `TARS at ${pose.x}`);
  for (const pose of releaseTimeline('cooper').filter(pose => pose.hidden < 1)) assert.ok(Math.abs(pose.x - VIEW.x) < VIEW.r, `Cooper at ${pose.x}`);
});

test('Cooper says his lines from the wheel ship before he lets go, then falls without a word', () => {
  const cooperLines = timeline(VIEW).filter(pose => escape.SPEAKER[pose.bubble] === 'cooper');

  assert.ok(cooperLines.length > 0);
  assert.ok(cooperLines.every(pose => pose.t < escape.DURATION.cooperRelease));
  assert.ok(releaseTimeline('cooper').every(pose => pose.bubble === null));
});

test('every line is credited to the one who says it', () => {
  assert.deepEqual({ ...escape.SPEAKER }, {
    countdown: 'robot', byeTars: 'brand', tarsReply: 'robot', sure: 'cooper', prep: 'cooper', what: 'brand', honest: 'cooper',
  });
});

test('TARS counts down while docked, lets go on "분리", and answers as it falls', () => {
  const { robotRelease } = escape.DURATION;
  const countdown = timeline(VIEW).filter(pose => pose.bubble === 'countdown');
  const reply = releaseTimeline('robot').filter(pose => pose.bubble === 'tarsReply');

  assert.ok(countdown.length && countdown.every(pose => pose.t < robotRelease));
  assert.ok(Math.abs(countdown[countdown.length - 1].t - robotRelease) < .1, 'lets go as the countdown ends');
  assert.ok(reply.length && reply.every(pose => pose.t > robotRelease));
});

test('each line stays up long enough to read comfortably', () => {
  const MIN_SECONDS = 2.4;
  const shown = {};
  for (let t = 0; t <= escape.DURATION.total; t += FRAME) {
    const lines = [escape.pose(t, VIEW).bubble, ...SHUTTLES.map(who => escape.releasePose(who, t, VIEW)?.bubble)];
    for (const line of lines.filter(line => line && line !== 'safe')) shown[line] = (shown[line] || 0) + FRAME;
  }
  for (const [line, seconds] of Object.entries(shown)) assert.ok(seconds >= MIN_SECONDS, `${line} shown for ${seconds.toFixed(2)}s`);
});

// An easter egg: scrolling down past the black hole never shows the button; coming back up from below does.
test('the button stays hidden while scrolling down, even once the black hole has formed', () => {
  assert.equal(escape.revealButton(false, { formed: true, scrollingUp: false }), false);
});

test('the button appears when coming back up from below, and stays while the black hole is on screen', () => {
  const shown = escape.revealButton(false, { formed: true, scrollingUp: true });

  assert.equal(shown, true);
  assert.equal(escape.revealButton(shown, { formed: true, scrollingUp: false }), true, 'stays when scrolling down again');
});

test('the button hides again once the black hole scene is left', () => {
  assert.equal(escape.revealButton(true, { formed: false, scrollingUp: true }), false);
  assert.equal(escape.revealButton(false, { formed: false, scrollingUp: false }), false);
});
