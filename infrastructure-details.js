(() => {
  const root = document.querySelector('#infrastructure-details');
  if (!root) return;
  const diagrams = [...root.querySelectorAll('.infra-motion')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const update = () => {
    const paused = document.hidden || reduced.matches || document.body.classList.contains('motion-paused');
    for (const diagram of diagrams) {
      let expanded = true;
      for (let parent = diagram.parentElement; parent && parent !== root; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.open) expanded = false;
      }
      const running = !paused && expanded && visible.has(diagram);
      diagram.classList.toggle('is-running', running);
      if (running) diagram.unpauseAnimations();
      else diagram.pauseAnimations();
    }
  };
  for (const diagram of diagrams) diagram.pauseAnimations();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    update();
  }, { threshold: 0.08 });
  diagrams.forEach(diagram => observer.observe(diagram));
  root.addEventListener('toggle', update, true);
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  update();
})();
