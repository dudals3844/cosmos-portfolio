'use strict';
(() => {
  const demo=document.querySelector('.case-demo');
  if(!demo)return;
  const buttons=[...demo.querySelectorAll('[data-case-phase]')];
  const copy=[...demo.querySelectorAll('[data-case-copy]')];
  const play=demo.querySelector('.case-play');
  const bar=demo.querySelector('.case-timer i');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let phase=0,visible=false,manualPause=false,timer=0;
  const blocked=()=>manualPause||reduced.matches||document.hidden||document.body.classList.contains('motion-paused');
  function sync(){
    clearTimeout(timer);
    const stopped=blocked()||!visible;
    demo.classList.toggle('is-paused',stopped);
    play.textContent=blocked()?'재생 ▷':'일시정지 Ⅱ';
    play.setAttribute('aria-label',blocked()?'연구 사례 모션 재생':'연구 사례 모션 일시정지');
    play.disabled=reduced.matches||document.body.classList.contains('motion-paused');
    if(!stopped)timer=setTimeout(()=>select((phase+1)%3),5500);
  }
  function select(index){
    phase=index;demo.dataset.phase=String(index);
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    copy.forEach((text,i)=>text.hidden=i!==index);
    bar.style.animation='none';void bar.offsetWidth;bar.style.animation='';
    sync();
  }
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{manualPause=true;select(i);}));
  play.addEventListener('click',()=>{manualPause=!manualPause;sync();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.3}).observe(demo);
  document.addEventListener('visibilitychange',sync);
  document.querySelector('#motion')?.addEventListener('click',sync);
  reduced.addEventListener('change',()=>{if(reduced.matches)select(2);else sync();});
  select(reduced.matches||document.body.classList.contains('motion-paused')?2:0);
})();
