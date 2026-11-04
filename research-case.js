'use strict';
(() => {
  const demo=document.querySelector('.case-demo');
  if(!demo)return;
  const buttons=[...demo.querySelectorAll('[data-case-phase]')];
  const headings=[...demo.querySelectorAll('[data-case-heading]')];
  const copy=[...demo.querySelectorAll('[data-case-copy]')];
  const panels=[...demo.querySelectorAll('[data-case-panel]')];
  const graph=[...demo.querySelectorAll('.case-workflow-track li')];
  const diagrams=[...demo.querySelectorAll('svg')];
  const play=demo.querySelector('.case-play');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const durations=[3800,5000,6000,6500];
  let phase=0,visible=false,manualPause=false,stageTimer=0,graphTimer=0,graphStep=0;
  const blocked=()=>manualPause||reduced.matches||document.hidden||document.body.classList.contains('motion-paused');
  function highlightGraph(){graph.forEach((node,i)=>node.classList.toggle('is-current',i===graphStep));}
  function sync(){
    clearTimeout(stageTimer);clearInterval(graphTimer);
    const stopped=blocked()||!visible;
    demo.classList.toggle('is-paused',stopped);
    play.textContent=phase===4?'다시 보기 ↺':blocked()?'재생 ▷':'일시정지 Ⅱ';
    play.setAttribute('aria-label',phase===4?'연구 이야기 다시 보기':blocked()?'연구 이야기 재생':'연구 이야기 일시정지');
    play.disabled=reduced.matches||document.body.classList.contains('motion-paused');
    diagrams.forEach(svg=>{
      if(stopped||svg.closest('[data-case-panel]').hidden)svg.pauseAnimations?.();
      else svg.unpauseAnimations?.();
    });
    if(stopped)return;
    if(phase<4)stageTimer=setTimeout(()=>select(phase+1),durations[phase]);
    if(phase===3)graphTimer=setInterval(()=>{graphStep=(graphStep+1)%graph.length;highlightGraph();},1100);
  }
  function select(index){
    phase=index;demo.dataset.phase=String(index);
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    headings.forEach((text,i)=>text.hidden=i!==index);
    copy.forEach((text,i)=>text.hidden=i!==index);
    panels.forEach(panel=>{const i=Number(panel.dataset.casePanel);panel.hidden=i===0?index>1:i!==index;});
    graphStep=0;highlightGraph();sync();
  }
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{manualPause=false;select(i);}));
  play.addEventListener('click',()=>{if(phase===4){manualPause=false;select(0);}else{manualPause=!manualPause;sync();}});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.3}).observe(demo);
  document.addEventListener('visibilitychange',sync);
  document.querySelector('#motion')?.addEventListener('click',sync);
  reduced.addEventListener('change',()=>{if(reduced.matches)select(4);else sync();});
  select(reduced.matches||document.body.classList.contains('motion-paused')?4:0);
})();
