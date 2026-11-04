'use strict';
(() => {
  const idea=document.querySelector('#local-inventory');
  if(!idea)return;
  const sequence=idea.querySelector('.inventory-sequence');
  const visual=idea.querySelector('.inventory-visual');
  const headings=[...idea.querySelectorAll('[data-inventory-heading]')];
  const panels=[...idea.querySelectorAll('[data-inventory-panel]')];
  const copy=[...idea.querySelectorAll('[data-inventory-copy]')];
  const count=idea.querySelector('.inventory-step-count');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const book=idea.querySelector('.book-demo');
  const action=idea.querySelector('.book-action-label');
  const actions=['매수호가와 매도호가가 비어 있습니다.','100원 매수호가에 1주 주문을 올립니다.','매수 체결 · 100원에 1주를 샀습니다.','보유한 1주를 101원 매도호가에 올립니다.','매도 체결 · 101원에 1주를 팔았습니다.',''];
  const fee=idea.querySelector('.inventory-fee');
  const replay=idea.querySelector('.book-replay');
  let scheduled=false,seen=-1,clock=0,last=null,raf=0,bookDone=false;
  function renderMotion(still=false){
    const step=still||bookDone?5:Math.min(5,Math.floor(clock/1500));
    if(!still&&seen===0&&step===5)bookDone=true;
    book.dataset.step=String(step);
    action.textContent=actions[step];
    fee.dataset.feeStep=String(still?2:Math.min(2,Math.floor(clock/1800)));
  }
  function frame(t){
    raf=0;
    if(last!==null)clock+=Math.min(100,Math.max(0,t-last));
    last=t;renderMotion();
    if((seen===0&&!bookDone)||(seen===3&&clock<3600))raf=requestAnimationFrame(frame);
    else last=null;
  }
  function update(){
    scheduled=false;
    const still=reduced.matches||document.body.classList.contains('motion-paused');
    idea.classList.toggle('is-static',still);
    const rect=sequence.getBoundingClientRect();
    const progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,sequence.offsetHeight-innerHeight)));
    const phase=still?3:Math.min(3,Math.floor(progress*4));
    visual.dataset.phase=String(phase);
    count.textContent=`${String(phase+1).padStart(2,'0')} / 04`;
    headings.forEach((h,i)=>h.hidden=!still&&i!==phase);
    panels.forEach((panel,i)=>panel.hidden=!still&&i!==phase);
    copy.forEach((text,i)=>text.hidden=!still&&i!==phase);
    if(seen!==phase){seen=phase;clock=0;last=null;}
    const active=!still&&!document.hidden&&rect.top<innerHeight*.12&&rect.bottom>innerHeight*.12;
    idea.classList.toggle('is-paused',!active);
    const bookRect=book.getBoundingClientRect();
    const bookVisible=bookRect.top>=0&&bookRect.bottom<=innerHeight;
    if(active&&((phase===0&&bookVisible&&!bookDone)||(phase===3&&clock<3600))){if(!raf)raf=requestAnimationFrame(frame);}
    else{cancelAnimationFrame(raf);raf=0;last=null;}
    replay.disabled=still;
    renderMotion(still);
  }
  replay.addEventListener('click',()=>{
    cancelAnimationFrame(raf);raf=0;last=null;clock=0;bookDone=false;
    book.dataset.step='0';renderMotion();update();
  });
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  document.querySelector('#motion')?.addEventListener('click',schedule);
  reduced.addEventListener('change',schedule);
  document.fonts.ready.then(schedule);update();
})();
