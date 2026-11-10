'use strict';
// Scroll position to phase for the research journey. The paper scene slides over the pinned graph partway
// through, so the graph holds still while it is covered. No DOM access, so it runs under node --test.
(root => {
  const clamp01 = value => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

  // Where `share` (0..1) falls inside a run of `count` equal phases that begins at phase `first`.
  function within(share, count, first) {
    const scaled = clamp01(share) * count;
    const index = Math.min(count - 1, Math.floor(scaled));
    return { phase: first + index, portion: Math.min(1, scaled - index) };
  }

  // `offset` is the distance scrolled inside the journey and `end` its last scroll position.
  // The paper scene starts to cover the graph at `pauseStart` and has left by `pauseEnd`.
  function journeyState({ offset, end, pauseStart, pauseEnd, phaseCount, phasesBeforePause }) {
    const position = Number.isFinite(offset) ? offset : 0;
    if (position < pauseStart) return within(position / Math.max(1, pauseStart), phasesBeforePause, 0);
    if (position < pauseEnd) {
      // Covered: finish the phase it slid over, then wait at the start of the one it will reveal.
      return position < (pauseStart + pauseEnd) / 2
        ? { phase: phasesBeforePause - 1, portion: 1 }
        : { phase: phasesBeforePause, portion: 0 };
    }
    return within((position - pauseEnd) / Math.max(1, end - pauseEnd), phaseCount - phasesBeforePause, phasesBeforePause);
  }

  // Share of the viewport (0..1) that a block spanning `top`..`bottom` covers.
  function coverage(top, bottom, viewportHeight) {
    if (!(viewportHeight > 0)) return 0;
    return clamp01((Math.min(bottom, viewportHeight) - Math.max(top, 0)) / viewportHeight);
  }

  // Page 2: which explanation to show as the signal runs along the detour. `stops` are the portions of the
  // path at which the signal passes each detour box. Beat 0 is the intro, 1..n one per box (each shows a
  // little before the signal arrives and gives way halfway to the next box), and n + 1 the conclusion.
  const DETOUR_LEAD = .08, DETOUR_TRAIL = .1;
  function detourBeat(portion, stops) {
    if (portion < stops[0] - DETOUR_LEAD) return 0;
    for (let i = 0; i < stops.length; i++) {
      // The last box gives way to the conclusion before the end of the path, however late the box comes.
      const until = i < stops.length - 1 ? (stops[i] + stops[i + 1]) / 2 : Math.min(stops[i] + DETOUR_TRAIL, (stops[i] + 1) / 2);
      if (portion < until) return i + 1;
    }
    return stops.length + 1;
  }

  // Which box's explanation shows at a beat (0-based), or -1 for none. The last box keeps its explanation
  // through the conclusion, until the page changes.
  const explainedDetour = (beat, count) => beat < 1 ? -1 : Math.min(beat, count) - 1;

  const api = Object.freeze({ journeyState, coverage, detourBeat, explainedDetour });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchJourney = api;
})(typeof window === 'undefined' ? globalThis : window);
