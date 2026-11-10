'use strict';
// A small cartoon wheel ship flies in once the paper black hole has formed and is dragged towards the hole.
// Its two docked shuttles let go one after the other, TARS first and then Cooper, and fall in (nothing
// comes back out of a black hole); the lightened wheel ship, with Dr. Brand the Maltese aboard, escapes.
// The path is pure (runs under node --test); the DOM part only runs in the page.
(() => {
  // Seconds from the start of the scene at which each beat begins or ends, following the script:
  // approach and pull-in; TARS counts down and lets go on the right of the hole; Dr. Brand says goodbye and
  // TARS answers as it falls; Cooper agrees; a pause; Cooper gets ready, Dr. Brand asks what he is doing,
  // he answers and lets go in the middle; once both shuttles are gone the lightened wheel ship escapes.
  // Timed at a calm pace, then stretched by SLOW so every beat reads clearly.
  const SLOW = 1.5;
  const DURATION = Object.freeze(Object.fromEntries(Object.entries({
    approachEnd: 1.6, spiralEnd: 4.2, countdownStart: 4.6, robotRelease: 6.3, tarsReplyStart: 8, sureStart: 10,
    pauseStart: 11.7, prepStart: 12.5, whatStart: 14.2, honestStart: 15.9, cooperRelease: 17.9,
    holdEnd: 19.8, boostEnd: 20.5, escapeEnd: 22.3, total: 23.8,
  }).map(([key, seconds]) => [key, seconds * SLOW])));
  // The ship orbits in the plane of the disk, so its orbit is flattened by the disk's own tilt.
  // Distances are in hole radii; theta = pi/2 is the near side, in front of the hole, -pi/2 the far side behind it.
  const ORBIT = typeof module === 'object' && module.exports ? require('./paper-orbit.js') : window.PaperOrbit;
  const FLATTEN = ORBIT ? ORBIT.SHAPE.disk.tilt : .14;
  // Perspective: the ship is drawn larger on the near side of the orbit and smaller on the far side.
  const DEPTH = Object.freeze({ far: .7, near: 1.15 });
  const START = Object.freeze({ orbit: 22, theta: -.64 });
  const CAPTURE = Object.freeze({ orbit: 4.2, theta: .3 });
  const EDGE = Object.freeze({ orbit: 3, closest: 2.6, wobble: .06, theta: 5.8 });
  // The wheel ship keeps circling while the shuttles let go: TARS on the right of the hole, Cooper at the
  // front, in the middle; then the boost whips the ship round to the left and out.
  const RIGHT = Math.PI * 2, FRONT = Math.PI * 2.5;
  const HOLD = Object.freeze({ robotTheta: RIGHT, cooperTheta: FRONT, endTheta: 8.6, drift: .1 });
  const BOOST = Object.freeze({ theta: HOLD.endTheta, orbit: 2.9 });
  const EXIT = Object.freeze({ theta: 9.2, turn: .5, far: 24 });
  // Each shuttle drifts in from where it let go, shrinking, and is lost past the horizon.
  const HORIZON = 1.2, HORIZON_SOFT = .2;
  const SHUTTLE_FALL = Object.freeze({
    // TARS drifts in slowly so it is still in view while it answers Dr. Brand; Cooper goes quickly.
    robot: Object.freeze({ release: 'robotRelease', seconds: 6 * SLOW, power: 1.5, turn: .8, shrink: .45 }),
    cooper: Object.freeze({ release: 'cooperRelease', seconds: 2.4 * SLOW, power: 1, turn: .3, shrink: .55 }),
  });
  // The ship fades out over the edge of the black shadow when it passes behind it.
  const SHADOW = 1.02, SHADOW_SOFT = .2;
  const BIG = 1.1;

  const clamp01 = value => Math.min(1, Math.max(0, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - (1 - t) ** 2;
  const span = (t, start, end) => clamp01((t - start) / (end - start));
  const during = (t, start, end) => t >= start && t < end;

  // Lines spoken from the wheel ship: by Dr. Brand, and by TARS and Cooper while they are still docked.
  const SHIP_LINES = Object.freeze([
    ['countdown', 'countdownStart', 'robotRelease'], ['byeTars', 'robotRelease', 'tarsReplyStart'],
    ['sure', 'sureStart', 'pauseStart'], ['prep', 'prepStart', 'whatStart'],
    ['what', 'whatStart', 'honestStart'], ['honest', 'honestStart', 'cooperRelease'],
  ]);
  function shipLine(t) {
    const cue = SHIP_LINES.find(([, start, end]) => during(t, DURATION[start], DURATION[end]));
    return cue ? cue[0] : null;
  }

  // Where the wheel ship is in orbit, how it looks, and what is said from it, at time t.
  function motion(t) {
    const D = DURATION;
    if (t < D.approachEnd) {
      const u = span(t, 0, D.approachEnd);
      return { orbit: mix(START.orbit, CAPTURE.orbit, easeOut(u)), theta: mix(START.theta, CAPTURE.theta, u ** 1.5), scale: 1, flame: .3, shake: 0, bubble: null };
    }
    if (t < D.spiralEnd) {
      const u = span(t, D.approachEnd, D.spiralEnd);
      return { orbit: mix(CAPTURE.orbit, EDGE.orbit, smooth(u)), theta: mix(CAPTURE.theta, EDGE.theta, u ** 1.3), scale: 1, flame: .25, shake: u, bubble: null };
    }
    if (t < D.robotRelease) {
      // Sliding along the near side, the engine sputters while the hole keeps pulling.
      const u = span(t, D.spiralEnd, D.robotRelease);
      const orbit = mix(EDGE.orbit, EDGE.closest, Math.sin(u * Math.PI / 2)) + EDGE.wobble * Math.sin(u * Math.PI * 6) * (1 - u);
      return { orbit, theta: mix(EDGE.theta, HOLD.robotTheta, u), scale: 1, flame: .3 + .15 * Math.sin(u * Math.PI * 10), shake: 1, bubble: shipLine(t) };
    }
    if (t < D.holdEnd) {
      const u = span(t, D.robotRelease, D.holdEnd);
      // Round to the front by the time Cooper lets go, then slowly on towards the left.
      const theta = t < D.cooperRelease
        ? mix(HOLD.robotTheta, HOLD.cooperTheta, span(t, D.robotRelease, D.cooperRelease))
        : mix(HOLD.cooperTheta, HOLD.endTheta, span(t, D.cooperRelease, D.holdEnd));
      return {
        orbit: EDGE.closest + HOLD.drift * u, theta, scale: 1, flame: .6, shake: .5 * (1 - u), bubble: shipLine(t),
      };
    }
    if (t < D.boostEnd) {
      const u = span(t, D.holdEnd, D.boostEnd);
      return { orbit: mix(EDGE.closest + HOLD.drift, BOOST.orbit, smooth(u)), theta: mix(BOOST.theta, EXIT.theta, u), scale: mix(1, BIG, u), flame: mix(.6, 1, u), shake: 0, bubble: null };
    }
    const u = span(t, D.boostEnd, D.escapeEnd);
    const orbit = BOOST.orbit * Math.exp(Math.log(EXIT.far / BOOST.orbit) * u ** 1.3);
    return { orbit, theta: EXIT.theta + EXIT.turn * u, scale: BIG, flame: mix(1, .85, u), shake: 0, bubble: t >= D.escapeEnd ? 'safe' : null };
  }

  function place(state, view) {
    return {
      x: view.x + state.orbit * view.r * Math.cos(state.theta),
      y: view.y + state.orbit * view.r * Math.sin(state.theta) * FLATTEN,
    };
  }

  // Screen position, perspective and occlusion for a craft whose orbit is given by `track(t)`.
  function project(track, t, view, extraHidden) {
    const state = track(t);
    const { x, y } = place(state, view);
    const ahead = place(track(t + .03), view);
    const moving = Math.hypot(ahead.x - x, ahead.y - y) > .5;
    const depth = Math.sin(state.theta);
    const behind = depth < 0;
    const distance = Math.hypot(x - view.x, y - view.y) / view.r;
    const hidden = Math.max(behind ? clamp01((SHADOW - distance) / SHADOW_SOFT) : 0, extraHidden(state));
    // A craft that cannot be seen does not talk; the ending caption is not spoken by anyone on screen.
    const bubble = hidden > 0 && state.bubble !== 'safe' ? null : state.bubble;
    return Object.freeze({
      ...state, x, y, behind, hidden, bubble,
      scale: state.scale * mix(DEPTH.far, DEPTH.near, (depth + 1) / 2),
      angle: moving ? Math.atan2(ahead.y - y, ahead.x - x) : null,
    });
  }
  const pose = (t, view) => project(motion, t, view, () => 0);

  // Who says each line. TARS answers Dr. Brand from its shuttle as it falls; Cooper falls without a word.
  const SPEAKER = Object.freeze({
    countdown: 'robot', byeTars: 'brand', tarsReply: 'robot', sure: 'cooper', prep: 'cooper', what: 'brand', honest: 'cooper',
  });
  const shuttleLine = (who, t) => who === 'robot' && during(t, DURATION.tarsReplyStart, DURATION.sureStart) ? 'tarsReply' : null;
  function fallOf(who) {
    const fall = SHUTTLE_FALL[who];
    const at = DURATION[fall.release];
    const from = motion(at);
    return t => {
      const u = span(t, at, at + fall.seconds);
      const left = 1 - u ** fall.power;
      return { orbit: from.orbit * left, theta: from.theta + fall.turn * u, scale: mix(1, fall.shrink, u), bubble: shuttleLine(who, t) };
    };
  }
  const FALLS = Object.freeze({ robot: fallOf('robot'), cooper: fallOf('cooper') });
  const pastHorizon = state => clamp01((HORIZON - state.orbit) / HORIZON_SOFT);
  // A released shuttle ('robot' for TARS, 'cooper'), or null while it is still docked.
  function releasePose(who, t, view) {
    if (t < DURATION[SHUTTLE_FALL[who].release]) return null;
    return project(FALLS[who], t, view, pastHorizon);
  }

  // The ship's wheel stands upright and is seen at an angle: pods ride a tall ellipse up and down,
  // the near (right) half larger and in front of the hub, the far (left) half smaller and behind it.
  const WHEEL = Object.freeze({ rx: 11, ry: 22, pods: 6, near: 1, far: .72 });
  function wheelLayout(spin) {
    return Array.from({ length: WHEEL.pods }, (_, index) => {
      const angle = spin + index * Math.PI * 2 / WHEEL.pods;
      const depth = Math.cos(angle);
      return Object.freeze({
        x: WHEEL.rx * depth, y: WHEEL.ry * Math.sin(angle),
        scale: mix(WHEEL.far, WHEEL.near, (depth + 1) / 2), front: depth > 0,
      });
    });
  }

  // The scene never plays by itself: a button starts it, and only once the black hole has formed.
  const PLAY_LABEL = '🚀 블랙홀 탈출 해보기';
  const canPlay = state => state.pull >= 1 && !state.still;
  // An easter egg: the button stays hidden while scrolling down past the black hole, appears when coming
  // back up from below, and stays until the black hole scene is left.
  const revealButton = (shown, { formed, scrollingUp }) => formed && (shown || scrollingUp);

  const api = Object.freeze({ DURATION, SPEAKER, PLAY_LABEL, pose, releasePose, wheelLayout, canPlay, revealButton });
  if (typeof module === 'object' && module.exports) module.exports = api;

  // A black Maltese pilot, drawn round (0, 0) to sit in the hub window.
  const PILOT = `
    <ellipse cx="-5.4" cy="1.6" rx="2.6" ry="4.4" fill="#25282e"/><ellipse cx="5.4" cy="1.6" rx="2.6" ry="4.4" fill="#25282e"/>
    <circle cx="-2.6" cy="-4.3" r="1.9" fill="#33373e"/><circle cx="0" cy="-5.1" r="2.1" fill="#33373e"/><circle cx="2.6" cy="-4.3" r="1.9" fill="#33373e"/>
    <circle cx="0" cy="-.4" r="4.7" fill="#33373e"/>
    <path d="M-1.6 -7.2L0 -6.4L-1.6 -5.6ZM1.6 -7.2L0 -6.4L1.6 -5.6Z" fill="#ff9fb4"/><circle cx="0" cy="-6.4" r=".55" fill="#ff7f9b"/>
    <ellipse cx="0" cy="1.5" rx="2.5" ry="1.9" fill="#474c55"/>
    <ellipse cx="-3.5" cy=".9" rx="1" ry=".55" fill="#ff9fb4" opacity=".8"/><ellipse cx="3.5" cy=".9" rx="1" ry=".55" fill="#ff9fb4" opacity=".8"/>
    <ellipse cx="0" cy=".8" rx=".95" ry=".7" fill="#0b0c0f"/>
    <g class="face-happy"><circle cx="-1.9" cy="-1.5" r=".95" fill="#08090b"/><circle cx="1.9" cy="-1.5" r=".95" fill="#08090b"/>
      <circle cx="-1.6" cy="-1.85" r=".33" fill="#fff"/><circle cx="2.2" cy="-1.85" r=".33" fill="#fff"/>
      <ellipse cx="0" cy="2.9" rx=".65" ry=".85" fill="#ff8fa0"/></g>
    <g class="face-scared" fill="none" stroke="#f6f0e1" stroke-width=".75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-2.9 -2.4L-1.2 -1.5L-2.9 -.6M2.9 -2.4L1.2 -1.5L2.9 -.6"/><ellipse cx="0" cy="2.8" rx=".7" ry=".9" fill="#0b0c0f"/></g>`;
  // An original cartoon of a rotating wheel ship: six box pods on an upright ring round a docked shuttle.
  // The ring is split top to bottom so its far (left) half passes behind the hub and its near half in front.
  const RING = (near, color) => {
    const d = `M0 ${-WHEEL.ry}A${WHEEL.rx} ${WHEEL.ry} 0 0 ${near ? 1 : 0} 0 ${WHEEL.ry}`;
    return `<path d="${d}" fill="none" stroke="#2c3b44" stroke-width="4.4"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.2"/>`;
  };
  const POD = `<path d="M-4.6 -3L4.6 -3L6.8 -5.4L-2.4 -5.4Z" fill="#fffdf7"/><rect x="-4.6" y="-3" width="9.2" height="7.4" fill="#eee7d6"/>
    <path d="M4.6 -3L6.8 -5.4L6.8 2L4.6 4.4Z" fill="#bdb5a3"/><rect x="-1" y="-1.8" width="2" height="5" fill="#4a5b6b"/>
    <path d="M-4.6 -3L-2.4 -5.4L6.8 -5.4L6.8 2L4.6 4.4L-4.6 4.4Z" fill="none" stroke="#2c3b44" stroke-width=".9" stroke-linejoin="round"/>`;
  const WHEEL_TILT = 8;
  // A small robot made of four tall metal slabs with a little screen: a cute nod to the film's robot.
  const ROBOT = `${[-4.4, -2.1, .2, 2.5].map(x => `<rect x="${x}" y="-5.4" width="2.1" height="10" fill="#9aa1a9" stroke="#2c3b44" stroke-width=".5"/>`).join('')}
    <rect x="-3.9" y="-3.8" width="7.8" height="2.2" rx=".4" fill="#2f3a44"/>
    <rect x="-2.6" y="-3.1" width="1.6" height=".8" fill="#7fe3ff"/><rect x=".9" y="-3.1" width="1.6" height=".8" fill="#7fe3ff"/>`;
  // Cooper: a small astronaut in a white helmet, drawn round (0, 0).
  const ASTRONAUT = `<line x1="3.6" y1="-3.9" x2="5" y2="-5.9" stroke="#2c3b44" stroke-width=".6"/><circle cx="5" cy="-5.9" r=".6" fill="#ff8f7e"/>
    <circle r="5.4" fill="#f4f1ea" stroke="#2c3b44" stroke-width=".7"/>
    <ellipse cy=".3" rx="3.9" ry="3.3" fill="#2d3c4f"/>
    <circle cy=".7" r="2.7" fill="#f2c9a0"/><path d="M-2.6 -.4Q0 -2.5 2.6 -.4Q1.4 -1.1 0 -1.1Q-1.4 -1.1-2.6 -.4Z" fill="#6b4a33"/>
    <circle cx="-1" cy=".5" r=".42" fill="#2c3b44"/><circle cx="1" cy=".5" r=".42" fill="#2c3b44"/>
    <path d="M-.9 1.6Q0 2.3 .9 1.6" fill="none" stroke="#2c3b44" stroke-width=".4" stroke-linecap="round"/>
    <path d="M-3 -1.4Q-2.2 -2.8-.6 -3.1" fill="none" stroke="#fff" stroke-width=".5" stroke-linecap="round" opacity=".6"/>`;
  // Two craft docked back to back in the middle of the wheel: original flat wedge shuttles with dark edges,
  // a pale deck with small windows, and a canopy for the one on board. Each canopy sits left of centre,
  // where only the far pods pass (behind it), so whoever is inside stays in view.
  const DECK_WINDOWS = [[3.4, -2.2], [7, -2], [10.4, -1.6], [-12, .2], [4, .6]];
  const shuttle = (windowId, occupant) => `<defs><clipPath id="${windowId}"><ellipse cx="-3.4" cy="-5" rx="6.4" ry="5.6"/></clipPath></defs>
    <path d="M-17 2L14 .4L18.4 3.4L-14 7.2Z" fill="#23272d" stroke="#2c3b44" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M-11 -5.4L-15.4 -10.4L-7 -5.2Z" fill="#2b3036" stroke="#2c3b44" stroke-width="1" stroke-linejoin="round"/>
    <path d="M-16.4 1L-11 -5.4L10.6 -4.6L17.6 1.4L-13.4 3.8Z" fill="#e8e5dc" stroke="#2c3b44" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M10.6 -4.6L19.6 -2.4L17.6 1.4Z" fill="#2b3036" stroke="#2c3b44" stroke-width="1" stroke-linejoin="round"/>
    <path d="M-16.4 1L-13.4 3.8L17.6 1.4" fill="none" stroke="#9f9b90" stroke-width=".8"/>
    ${DECK_WINDOWS.map(([x, y]) => `<rect x="${x}" y="${y}" width="2.8" height="1.5" rx=".6" fill="#3d4752"/>`).join('')}
    <ellipse cx="-3.4" cy="-5" rx="6.4" ry="5.6" fill="#a7dcf2"/>
    <g clip-path="url(#${windowId})"><g transform="translate(-3.4 -3.6) scale(.8)">${occupant}</g></g>
    <ellipse cx="-3.4" cy="-5" rx="6.4" ry="5.6" fill="none" stroke="#2c3b44" stroke-width="1.3"/>
    <path d="M-7 -8.6Q-4.8 -10.2 -2 -10.3" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".75"/>`;
  // Dr. Brand rides in the round hub window of the wheel itself; the two shuttles dock over the hub and leave
  // it in plain view once they have both let go.
  const HUB = `<circle r="9.8" fill="url(#escape-hub)" stroke="#2c3b44" stroke-width="1.5"/><circle r="8" fill="#a7dcf2"/>
    <g clip-path="url(#escape-window-brand)"><g transform="scale(.95) translate(0 .6)">${PILOT}</g></g>
    <circle r="8" fill="none" stroke="#2c3b44" stroke-width="1.3"/>
    <path d="M-4.8 -4.6Q-2.4 -7 1 -7.2" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".7"/>`;
  const DOCKED = Object.freeze({ cooper: 'translate(0 -7) scale(.9)', robot: 'translate(2 8) scale(.85)' });
  const OCCUPANT = Object.freeze({ cooper: ASTRONAUT, robot: ROBOT });
  const SHIP = `<svg viewBox="-38 -32 76 64">
    <defs><clipPath id="escape-window-brand"><circle r="8"/></clipPath>
      <radialGradient id="escape-hub" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fffdf6"/><stop offset=".6" stop-color="#e6dfcd"/><stop offset="1" stop-color="#a9a190"/></radialGradient></defs>
    <g class="escape-engine"><g class="escape-flame"><path d="M-15 -4.5Q-33 0-15 4.5Z" fill="#ffb05c"/><path d="M-15 -2.5Q-25 0-15 2.5Z" fill="#fff4b8"/></g>
      <rect x="-17" y="-3.6" width="5" height="7.2" rx="1.6" fill="#ff8f7e" stroke="#2c3b44" stroke-width="1.3"/></g>
    <g transform="rotate(${WHEEL_TILT})">${RING(false, '#9d968a')}<g class="escape-pods-back"></g></g>
    ${HUB}
    <g class="escape-docked-robot" transform="${DOCKED.robot}">${shuttle('escape-window-docked-robot', ROBOT)}</g>
    <g class="escape-docked-cooper" transform="${DOCKED.cooper}">${shuttle('escape-window-docked-cooper', ASTRONAUT)}</g>
    <g transform="rotate(${WHEEL_TILT})">${RING(true, '#f4eee0')}<g class="escape-pods-front"></g></g>
  </svg>`;
  // A shuttle on its own, once it has let go; drawn at the same scale as when docked.
  const releasedShuttle = who => `<svg viewBox="-22 -14 44 28">${shuttle(`escape-window-released-${who}`, OCCUPANT[who])}</svg>`;
  const SHUTTLES = Object.freeze(['robot', 'cooper']);

  // Runs after the drawing constants above are defined.
  if (typeof document === 'object') mount();

  function mount() {
    const scene = document.querySelector('.paper-hole');
    if (!scene) return;
    const stage = scene.querySelector('.paper-stage');
    const pin = scene.querySelector('.paper-pin');
    // Dr. Brand speaks from the wheel ship, TARS and Cooper from their shuttles.
    const LINES = Object.freeze({
      countdown: '3, 2, 1, 분리', byeTars: '굿바이 TARS', tarsReply: '굿바이 브랜드 박사님, 반대쪽에서 뵙죠 쿠퍼',
      sure: '그러자고', prep: '분리준비', what: '쿠퍼 무슨 짓이에요?', honest: '잊었어, 브랜드 박사? 90%만 솔직하기.',
    });
    const DROP_TUMBLE_DEG_PER_SECOND = 70;
    const TRAIL_LIFE = .9, TRAIL_MAX = 160, TURN_RATE = .25, SHAKE_PX = 4, SPIN_RADIANS_PER_SECOND = .7, ENGINE_BACK = 14;

    const layer = document.createElement('div');
    layer.className = 'escape-layer'; layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `<canvas class="escape-trail"></canvas>
      ${SHUTTLES.map(who => `<div class="escape-drop" data-who="${who}">${releasedShuttle(who)}</div>`).join('')}
      <div class="escape-ship" data-mood="happy">${SHIP}</div><span class="escape-bubble escape-bubble-brand"></span>
      ${SHUTTLES.map(who => `<span class="escape-bubble escape-bubble-${who}"></span>`).join('')}`;
    ['top', 'bottom'].forEach(side => {
      const bar = document.createElement('div');
      bar.className = `escape-bar escape-bar-${side}`; bar.setAttribute('aria-hidden', 'true');
      pin.append(bar);
    });
    const replay = document.createElement('button');
    replay.type = 'button'; replay.className = 'escape-replay'; replay.textContent = PLAY_LABEL;
    // The caption takes the play button's spot, which stays empty while the scene plays.
    const caption = document.createElement('span');
    caption.className = 'escape-caption'; caption.setAttribute('aria-hidden', 'true');
    caption.textContent = '브랜드 박사는 탈출했고, 쿠퍼와 TARS는 저편으로 ✦';
    stage.append(layer); pin.append(replay, caption);

    const trail = layer.querySelector('canvas');
    const paint = trail.getContext('2d');
    const ship = layer.querySelector('.escape-ship');
    const engine = layer.querySelector('.escape-engine');
    const podsBack = layer.querySelector('.escape-pods-back');
    const podsFront = layer.querySelector('.escape-pods-front');
    const SVG_NS = 'http://www.w3.org/2000/svg';
    // Every other pod is tied to the hub by a spoke.
    const pods = Array.from({ length: WHEEL.pods }, (_, index) => {
      const spoke = index % 2 === 0 ? document.createElementNS(SVG_NS, 'line') : null;
      if (spoke) { spoke.setAttribute('stroke', '#2c3b44'); spoke.setAttribute('stroke-width', '1.2'); }
      const pod = document.createElementNS(SVG_NS, 'g');
      pod.innerHTML = POD;
      return { spoke, pod };
    });
    function drawWheel(spin) {
      wheelLayout(spin).forEach((place, index) => {
        const { spoke, pod } = pods[index];
        const holder = place.front ? podsFront : podsBack;
        if (spoke) {
          spoke.setAttribute('x2', place.x.toFixed(2)); spoke.setAttribute('y2', place.y.toFixed(2));
          if (spoke.parentNode !== holder) holder.prepend(spoke);
        }
        pod.setAttribute('transform', `translate(${place.x.toFixed(2)} ${place.y.toFixed(2)}) rotate(${-WHEEL_TILT}) scale(${place.scale.toFixed(3)})`);
        pod.setAttribute('opacity', place.front ? '1' : '.82');
        if (pod.parentNode !== holder) holder.append(pod);
      });
    }
    drawWheel(0);
    const flame = layer.querySelector('.escape-flame');
    const bubble = layer.querySelector('.escape-bubble-brand');
    const released = Object.fromEntries(SHUTTLES.map(who => [who, {
      craft: layer.querySelector(`.escape-drop[data-who="${who}"]`), bubble: layer.querySelector(`.escape-bubble-${who}`),
    }]));

    let playing = false, formed = false, found = false, lastScrollY = window.scrollY, clock = 0, last = 0, frame = 0, heading = 0, sparks = [];

    function measure() {
      const style = getComputedStyle(stage);
      const read = name => parseFloat(style.getPropertyValue(name));
      return { x: read('--hole-x'), y: read('--hole-y'), r: read('--hole-r'), width: stage.clientWidth, height: stage.clientHeight };
    }
    function sizeTrail(view) {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(view.width * ratio), height = Math.round(view.height * ratio);
      if (trail.width !== width || trail.height !== height) { trail.width = width; trail.height = height; }
      paint.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function emit(p) {
      if (p.hidden >= .5 || p.angle === null) return [];
      const back = ENGINE_BACK * 1.4 * p.scale;
      return Array.from({ length: p.flame > .8 ? 3 : 1 }, () => ({
        x: p.x - Math.cos(heading) * back + (Math.random() - .5) * 5,
        y: p.y - Math.sin(heading) * back + (Math.random() - .5) * 5,
        size: (1.2 + Math.random() * 1.8) * (.6 + p.flame), age: 0, warm: Math.random() > .5,
      }));
    }
    function drawTrail(view, seconds, p) {
      if (!paint) return;
      sizeTrail(view);
      const aged = sparks.map(s => ({ ...s, age: s.age + seconds })).filter(s => s.age < TRAIL_LIFE);
      sparks = [...aged, ...emit(p)].slice(-TRAIL_MAX);
      paint.clearRect(0, 0, view.width, view.height);
      for (const s of sparks) {
        const life = 1 - s.age / TRAIL_LIFE;
        paint.fillStyle = s.warm ? `rgba(255,214,140,${(life * .85).toFixed(3)})` : `rgba(255,246,214,${(life * .9).toFixed(3)})`;
        paint.beginPath(); paint.arc(s.x, s.y, s.size * (.4 + life * .6), 0, Math.PI * 2); paint.fill();
      }
    }
    function drawShip(view, p) {
      if (p.angle !== null) heading += Math.atan2(Math.sin(p.angle - heading), Math.cos(p.angle - heading)) * TURN_RATE;
      const jitter = () => (Math.random() - .5) * p.shake * SHAKE_PX;
      // The hub and pilot stay upright; the engine turns to push the ship along its path while the wheel spins.
      ship.style.transform = `translate(${(p.x + jitter()).toFixed(1)}px,${(p.y + jitter()).toFixed(1)}px) translate(-50%,-50%) scale(${p.scale.toFixed(3)})`;
      ship.style.opacity = (1 - p.hidden).toFixed(2);
      ship.dataset.mood = p.shake > .3 || p.bubble === 'what' ? 'scared' : 'happy';
      engine.setAttribute('transform', `rotate(${(heading * 180 / Math.PI).toFixed(1)})`);
      drawWheel(clock * SPIN_RADIANS_PER_SECOND);
      flame.setAttribute('transform', `translate(-15 0) scale(${(.3 + p.flame * 1.1).toFixed(2)} ${(.7 + p.flame * .35).toFixed(2)}) translate(15 0)`);
      say(bubble, view, p, 38);
      scene.classList.toggle('escape-safe', p.bubble === 'safe');
    }
    function say(element, view, p, lift) {
      const line = LINES[p.bubble] || '';
      const x = Math.min(view.width - 90, Math.max(90, p.x));
      const y = p.y - lift * p.scale - 4;
      element.textContent = line;
      if (line) element.dataset.speaker = SPEAKER[p.bubble];
      element.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      element.classList.toggle('is-shown', Boolean(line) && p.hidden < .5);
    }
    // A released shuttle tumbles as it falls, and is lost once it passes the horizon.
    function drawShuttle(who, view) {
      const d = releasePose(who, clock, view);
      const { craft, bubble: line } = released[who];
      ship.classList.toggle(`is-${who}-released`, d !== null);
      if (!d) { craft.style.opacity = '0'; line.classList.remove('is-shown'); return; }
      const tumble = (clock - DURATION[`${who}Release`]) * DROP_TUMBLE_DEG_PER_SECOND;
      craft.style.transform = `translate(${d.x.toFixed(1)}px,${d.y.toFixed(1)}px) translate(-50%,-50%) rotate(${tumble.toFixed(1)}deg) scale(${d.scale.toFixed(3)})`;
      craft.style.opacity = (1 - d.hidden).toFixed(2);
      say(line, view, d, 22);
    }
    function tick(now) {
      const seconds = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now; clock += seconds;
      const view = measure();
      if (view.r) {
        const p = pose(clock, view);
        drawShip(view, p); SHUTTLES.forEach(who => drawShuttle(who, view)); drawTrail(view, seconds, p);
      }
      if (clock >= DURATION.total) { stop(); return; }
      frame = requestAnimationFrame(tick);
    }
    function play() {
      cancelAnimationFrame(frame);
      playing = true; clock = 0; last = 0; heading = Math.PI; sparks = [];
      scene.classList.add('is-escaping'); scene.classList.remove('escape-safe');
      frame = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(frame); frame = 0; playing = false; sparks = [];
      scene.classList.remove('is-escaping', 'escape-safe');
      ship.style.opacity = '0'; bubble.classList.remove('is-shown');
      for (const who of SHUTTLES) {
        ship.classList.remove(`is-${who}-released`);
        released[who].craft.style.opacity = '0'; released[who].bubble.classList.remove('is-shown');
      }
      if (paint) paint.clearRect(0, 0, trail.width, trail.height);
    }

    // The button (and the ending caption in its place) sits just under the second evidence pill; when the
    // pills are stacked on small screens it sits under the whole list instead.
    const results = scene.querySelector('.paper-results');
    const BUTTON_GAP = 14;
    function placeButton() {
      const pills = results.querySelectorAll('li');
      const stacked = getComputedStyle(results).flexDirection === 'column';
      const anchor = (stacked ? results : pills[1] || results).getBoundingClientRect();
      const frame = pin.getBoundingClientRect();
      for (const element of [replay, caption]) {
        element.style.left = `${(anchor.left + anchor.width / 2 - frame.left).toFixed(1)}px`;
        element.style.top = `${(anchor.bottom - frame.top + BUTTON_GAP).toFixed(1)}px`;
        element.style.bottom = 'auto';
      }
    }

    // paper-blackhole.js reports its scroll state on every update.
    scene.addEventListener('paper:state', event => {
      const state = event.detail;
      formed = canPlay(state);
      const scrollingUp = window.scrollY < lastScrollY;
      lastScrollY = window.scrollY;
      found = revealButton(found, { formed: formed && state.visible, scrollingUp });
      scene.classList.toggle('escape-ready', formed);
      scene.classList.toggle('escape-found', found);
      if (found || playing) placeButton();
      // Scrolling away, back before the hole has formed, or turning motion off ends the scene.
      if (playing && (!formed || !state.visible)) stop();
    });
    replay.addEventListener('click', () => { if (formed && found) play(); });
    ship.style.opacity = '0';
  }
})();
