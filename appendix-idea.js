'use strict';
(() => {
  const idea=document.querySelector('#social-idea');
  if(!idea)return;
  const sequence=idea.querySelector('.idea-sequence');
  const market=idea.querySelector('.idea-market');
  const headings=[...idea.querySelectorAll('[data-idea-heading]')];
  const copy=[...idea.querySelectorAll('[data-idea-copy]')];
  const count=idea.querySelector('.idea-step-count');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled=false;
  function update(){
    scheduled=false;
    const still=reduced.matches||document.body.classList.contains('motion-paused');
    idea.classList.toggle('is-static',still);
    const rect=sequence.getBoundingClientRect();
    const progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,sequence.offsetHeight-innerHeight)));
    const phase=still?3:Math.min(3,Math.floor(progress*4));
    market.dataset.phase=String(phase);
    count.textContent=`${String(phase+1).padStart(2,'0')} / 04`;
    headings.forEach((heading,i)=>heading.hidden=!still&&i!==phase);
    copy.forEach((text,i)=>text.hidden=!still&&i!==phase);
    idea.querySelector('.idea-unknown').hidden=phase>0;
    idea.querySelector('.idea-contract').hidden=phase===0;
    idea.querySelectorAll('.idea-worry').forEach(text=>text.hidden=phase>0);
    idea.querySelectorAll('.idea-ready').forEach(text=>text.hidden=phase===0);
    idea.querySelectorAll('.idea-benefit').forEach(text=>text.hidden=phase<3);
    idea.querySelector('.idea-price').hidden=phase!==2;
    idea.querySelector('.idea-outcomes').hidden=phase!==3;
    idea.classList.toggle('is-paused',still||document.hidden||rect.top>=innerHeight||rect.bottom<=0);
    const all=idea.getBoundingClientRect();
    document.body.classList.toggle('appendix-active',all.top<innerHeight*.5&&all.bottom>innerHeight*.1);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  document.querySelector('#motion')?.addEventListener('click',schedule);
  reduced.addEventListener('change',schedule);
  document.fonts.ready.then(schedule);
  update();
})();
