'use strict';
(() => {
  const demo=document.querySelector('.case-demo');
  if(!demo)return;
  // Without the journey module the scroll story cannot run, so the still version is shown instead.
  const journey=window.ResearchJourney;
  if(!journey)console.warn('Research journey falls back to the still version: research-journey.js did not load.');
  // The paper scene sits inside the journey and slides over the pinned graph after this many phases.
  const PHASES_BEFORE_PAPERS=2;
  // The graph is fully faded a little before the paper scene fills the screen.
  const GRAPH_FADE=1.25;
  const pin=demo.querySelector('.case-pin');
  const papers=demo.querySelector('.paper-hole');
  const headings=[...demo.querySelectorAll('[data-case-heading]')];
  const copy=[...demo.querySelectorAll('[data-case-copy]')];
  const viewport=demo.querySelector('.case-viewport');
  const graph=demo.querySelector('.story-graph');
  const nodes=[...graph.querySelectorAll('.story-node')];
  const signal=graph.querySelector('.story-signal');
  const halo=graph.querySelector('.story-signal-halo');
  const count=demo.querySelector('.case-scroll-count');
  const packets=[...graph.querySelectorAll('animateMotion')];
  const paths=['story-plan','story-wrong','story-work','story-measure','story-record'].map(id=>graph.querySelector(`#${id}`));
  const lengths=paths.map(path=>path.getTotalLength());
  // Page 2: the detour boxes, in the order the signal reaches them. Each box shows its own explanation beside it
  // while the signal is there, and the last one keeps it until the page changes; the caption keeps the intro
  // until the last box, then the conclusion.
  const DETOUR_PHASE=1,DETOUR_SAMPLES=240;
  const detours=[...graph.querySelectorAll('.story-detour')];
  const detourCopy=[...demo.querySelectorAll('[data-detour-line]')];
  const detourStops=detours.map(box=>{
    const rect=box.querySelector('rect'),cx=Number(rect.getAttribute('x'))+Number(rect.getAttribute('width'))/2,cy=Number(rect.getAttribute('y'))+Number(rect.getAttribute('height'))/2;
    let best=0,distance=Infinity;
    for(let i=0;i<=DETOUR_SAMPLES;i++){
      const point=paths[DETOUR_PHASE].getPointAtLength(lengths[DETOUR_PHASE]*i/DETOUR_SAMPLES);
      const d=Math.hypot(point.x-cx,point.y-cy);
      if(d<distance){distance=d;best=i/DETOUR_SAMPLES;}
    }
    return best;
  });
  // The paper scene is a page of the journey too.
  const pageCount=paths.length+1;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let current=-1,scheduled=false;
  const stationary=()=>!journey||reduced.matches||document.body.classList.contains('motion-paused');
  function update(){
    scheduled=false;
    const still=stationary();
    demo.classList.toggle('is-static',still);
    demo.classList.toggle('is-paused',still||document.hidden);
    const rect=demo.getBoundingClientRect();
    const end=Math.max(1,demo.offsetHeight-innerHeight);
    const cover=papers.getBoundingClientRect();
    // The paper scene starts to cover the graph when its top reaches the bottom of the screen, and is gone when its bottom passes the top.
    const {phase,portion}=still?{phase:paths.length-1,portion:1}:journey.journeyState({offset:-rect.top,end,pauseStart:cover.top-rect.top-innerHeight,pauseEnd:cover.bottom-rect.top,phaseCount:paths.length,phasesBeforePause:PHASES_BEFORE_PAPERS});
    const covered=still?0:journey.coverage(cover.top,cover.bottom,innerHeight);
    pin.style.setProperty('--case-show',Math.max(0,1-covered*GRAPH_FADE).toFixed(3));
    demo.classList.toggle('is-covered',covered>=1);
    if(current!==phase){
      current=phase;demo.dataset.phase=String(phase);
      // Pages after the paper scene are numbered one further on.
      const page=phase+1+(phase>=PHASES_BEFORE_PAPERS?1:0);
      count.textContent=`${String(page).padStart(2,'0')} / ${String(pageCount).padStart(2,'0')}`;
    }
    headings.forEach((h,i)=>h.hidden=!still&&i!==phase);
    copy.forEach((p,i)=>p.hidden=!still&&i!==phase);
    const beat=!still&&phase===DETOUR_PHASE?journey.detourBeat(portion,detourStops):null;
    const explained=beat===null?-1:journey.explainedDetour(beat,detours.length);
    detours.forEach((box,i)=>{
      box.classList.toggle('is-waiting',beat!==null&&beat<i+1);
      box.classList.toggle('is-current',i===explained);
    });
    const lastBeat=detours.length+1;
    const showLine={intro:beat!==null&&beat<lastBeat,end:beat===lastBeat,issue:false};
    detourCopy.forEach(line=>line.hidden=beat!==null&&!showLine[line.dataset.detourLine]);
    const point=paths[phase].getPointAtLength(lengths[phase]*portion);
    for(const dot of [signal,halo]){dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);}
    if(viewport.clientWidth<760&&!still){
      const scale=graph.getBoundingClientRect().width/1200;
      // While a detour box explains itself, keep the box and its explanation in view instead of the signal.
      const box=explained>=0?detours[explained].getBBox():null;
      const focus=box?{x:box.x+box.width/2,y:box.y+box.height/2}:point;
      viewport.scrollTo({left:Math.max(0,focus.x*scale-viewport.clientWidth/2),top:Math.max(0,focus.y*scale-viewport.clientHeight/2),behavior:'auto'});
    }
    let nearest=null,distance=Infinity;
    nodes.forEach(node=>{
      node.classList.remove('is-current');
      if((phase<PHASES_BEFORE_PAPERS)!==!!node.closest('.story-plan-map'))return;
      const d=Math.hypot(Number(node.dataset.x)-point.x,Number(node.dataset.y)-point.y);
      if(d<distance){distance=d;nearest=node;}
    });
    nearest?.classList.add('is-current');
    const active=!still&&!document.hidden&&covered<1&&rect.top<innerHeight&&rect.bottom>0;
    // Pause declarative request/response pulses when the story is offscreen.
    if(active)graph.unpauseAnimations?.();else graph.pauseAnimations?.();
    packets.forEach(packet=>packet.parentElement.style.opacity=active?'1':'0');
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  document.querySelector('#motion')?.addEventListener('click',()=>{current=-1;schedule();});
  reduced.addEventListener('change',()=>{current=-1;schedule();});
  new IntersectionObserver(schedule).observe(demo);
  document.fonts.ready.then(schedule);
  update();
})();
