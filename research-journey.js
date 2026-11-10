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

  const api = Object.freeze({ journeyState, coverage });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchJourney = api;
})(typeof window === 'undefined' ? globalThis : window);
