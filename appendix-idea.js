'use strict';
(() => {
  const idea=document.querySelector('#future-purchase');
  if(!idea)return;
  const sequence=idea.querySelector('.idea-sequence');
  const market=idea.querySelector('.idea-market');
  const headings=[...idea.querySelectorAll('[data-idea-heading]')];
  const copy=[...idea.querySelectorAll('[data-idea-copy]')];
  const insights=[...idea.querySelectorAll('[data-shop-insight]')];
  const dates=[...idea.querySelectorAll('[data-receive-date]')];
  const dateLabels=['1달 뒤 화요일','2달 뒤 화요일','3달 뒤 화요일'];
  const count=idea.querySelector('.idea-step-count');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled=false,chosenByUser=false,lastPhase=-1,dateTimer=0;
  function selectDate(index){
    market.dataset.selection=String(index);
    dates.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    idea.querySelectorAll('[data-selected-date]').forEach(text=>text.textContent=dateLabels[index]);
  }
  dates.forEach((button,index)=>button.addEventListener('click',()=>{chosenByUser=true;clearTimeout(dateTimer);dateTimer=0;selectDate(index);}));
  function update(){
    scheduled=false;
    const still=reduced.matches||document.body.classList.contains('motion-paused');
    idea.classList.toggle('is-static',still);
    const rect=sequence.getBoundingClientRect();
    const progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,sequence.offsetHeight-innerHeight)));
    const phase=still?3:Math.min(3,Math.floor(progress*4));
    market.dataset.phase=String(phase);
    idea.querySelector('.shop-concerns').hidden=phase!==0;
    idea.querySelector('.shop-window').hidden=phase===0;
    idea.querySelector('.shop-insights').hidden=phase===0;
    if(!chosenByUser){
      if(phase===1&&lastPhase!==1)selectDate(0);
      if((phase===1&&progress*4-phase>=.28)||phase>1)selectDate(1);
    }
    const dateMotionActive=phase===1&&!chosenByUser&&!still&&!document.hidden&&rect.top<innerHeight&&rect.bottom>0;
    if(!dateMotionActive){clearTimeout(dateTimer);dateTimer=0;}
    else if(market.dataset.selection==='0'&&!dateTimer){
      dateTimer=setTimeout(()=>{dateTimer=0;if(!chosenByUser&&market.dataset.phase==='1')selectDate(1);},1100);
    }
    lastPhase=phase;
    count.textContent=`${String(phase+1).padStart(2,'0')} / 04`;
    headings.forEach((heading,i)=>heading.hidden=!still&&i!==phase);
    copy.forEach((text,i)=>text.hidden=!still&&i!==phase);
    insights.forEach((text,i)=>text.hidden=!still&&i!==phase);
    idea.querySelector('.shop-reserve-before').hidden=phase===3;
    idea.querySelector('.shop-reserve-after').hidden=phase!==3;
    idea.classList.toggle('is-paused',still||document.hidden||rect.top>=innerHeight||rect.bottom<=0);
    const all=document.querySelector('#social-idea').getBoundingClientRect();
    document.body.classList.toggle('appendix-active',all.top<innerHeight*.5&&all.bottom>innerHeight*.1);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  document.querySelector('#motion')?.addEventListener('click',schedule);
  reduced.addEventListener('change',schedule);
  document.fonts.ready.then(schedule);
  selectDate(1);update();
})();
