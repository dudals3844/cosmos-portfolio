'use strict';
(() => {
  const demo=document.querySelector('.case-demo');
  if(!demo)return;
  const headings=[...demo.querySelectorAll('[data-case-heading]')];
  const copy=[...demo.querySelectorAll('[data-case-copy]')];
  const viewport=demo.querySelector('.case-viewport');
  const graph=demo.querySelector('.story-graph');
  const nodes=[...graph.querySelectorAll('.story-node')];
  const signal=graph.querySelector('.story-signal');
  const halo=graph.querySelector('.story-signal-halo');
  const count=demo.querySelector('.case-scroll-count');
  const packets=[...graph.querySelectorAll('animateMotion')];
  const paths=['story-plan','story-wrong','story-rag','story-work','story-measure','story-record'].map(id=>graph.querySelector(`#${id}`));
  const lengths=paths.map(path=>path.getTotalLength());
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let current=-1,scheduled=false;
  const stationary=()=>reduced.matches||document.body.classList.contains('motion-paused');
  // Papers spiral into the RAG index during the retrieval scene only.
  const BH={x:150,y:500,horizon:38,edge:620,tilt:.4};
  const paperLayer=graph.querySelector('.story-papers');
  const papers=Array.from({length:innerWidth<760?70:160},()=>{
    const el=document.createElementNS('http://www.w3.org/2000/svg','path');
    el.setAttribute('d','M-5-7h7l3 3v11h-10zM-3-1h6M-3 2h6M-3 5h4');
    paperLayer.append(el);
    return {el,r:BH.horizon+Math.random()*(BH.edge-BH.horizon),a:Math.random()*Math.PI*2,lean:(Math.random()-.5)*Math.PI};
  });
  let paperFrame=0,paperTime=0;
  function drawPapers(now){
    const dt=Math.min(.05,Math.max(0,now-paperTime)/1000);paperTime=now;
    for(const p of papers){
      p.r-=(50+9000/p.r)*dt;
      if(p.r<BH.horizon){p.r=BH.edge*(.85+Math.random()*.15);p.a=Math.random()*Math.PI*2;}
      p.a+=.9*(120/p.r)**1.5*dt;
      const near=Math.max(0,Math.min(1,(200-p.r)/140)),cos=Math.cos(p.a),sin=Math.sin(p.a);
      // Far papers tumble freely; near the horizon they align with the orbit and stretch along it.
      const turn=(Math.atan2(BH.tilt*cos,-sin)+p.lean*(1-near))*180/Math.PI;
      const size=.35+p.r/BH.edge*1.1,stretch=1+near*1.6;
      p.el.setAttribute('transform',`translate(${(BH.x+p.r*cos).toFixed(1)} ${(BH.y+p.r*sin*BH.tilt).toFixed(1)}) rotate(${turn.toFixed(1)}) scale(${(size*stretch).toFixed(2)} ${(size/stretch).toFixed(2)})`);
      p.el.setAttribute('opacity',(Math.min(1,(p.r-BH.horizon)/50,(BH.edge-p.r)/90)*.8).toFixed(2));
    }
    paperFrame=requestAnimationFrame(drawPapers);
  }
  function update(){
    scheduled=false;
    const still=stationary();
    demo.classList.toggle('is-static',still);
    demo.classList.toggle('is-paused',still||document.hidden);
    const rect=demo.getBoundingClientRect();
    const progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,demo.offsetHeight-innerHeight)));
    const phase=still?paths.length-1:Math.min(paths.length-1,Math.floor(progress*paths.length));
    const portion=still?1:Math.min(1,progress*paths.length-phase);
    if(current!==phase){
      current=phase;demo.dataset.phase=String(phase);
      count.textContent=`${String(phase+1).padStart(2,'0')} / ${String(paths.length).padStart(2,'0')}`;
    }
    headings.forEach((h,i)=>h.hidden=!still&&i!==phase);
    copy.forEach((p,i)=>p.hidden=!still&&i!==phase);
    const point=paths[phase].getPointAtLength(lengths[phase]*portion);
    for(const dot of [signal,halo]){dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);}
    if(viewport.clientWidth<760&&!still){
      const scale=graph.getBoundingClientRect().width/1200;
      viewport.scrollTo({left:Math.max(0,point.x*scale-viewport.clientWidth/2),top:Math.max(0,point.y*scale-viewport.clientHeight/2),behavior:'auto'});
    }
    let nearest=null,distance=Infinity;
    nodes.forEach(node=>{
      node.classList.remove('is-current');
      if((phase<2)!==!!node.closest('.story-plan-map'))return;
      const d=Math.hypot(Number(node.dataset.x)-point.x,Number(node.dataset.y)-point.y);
      if(d<distance){distance=d;nearest=node;}
    });
    nearest?.classList.add('is-current');
    const active=!still&&!document.hidden&&rect.top<innerHeight&&rect.bottom>0;
    // Pause declarative request/response pulses when the story is offscreen.
    if(active)graph.unpauseAnimations?.();else graph.pauseAnimations?.();
    packets.forEach(packet=>packet.parentElement.style.opacity=active?'1':'0');
    const swirling=active&&phase===2;
    if(swirling&&!paperFrame){paperTime=performance.now();paperFrame=requestAnimationFrame(drawPapers);}
    else if(!swirling&&paperFrame){cancelAnimationFrame(paperFrame);paperFrame=0;}
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
