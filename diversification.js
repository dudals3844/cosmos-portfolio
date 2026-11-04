'use strict';
(() => {
  const chapter=document.querySelector('#diversification');
  const data=window.COSMOS_DIVERSIFICATION;
  if(!chapter||!data)return;
  const sequence=chapter.querySelector('.mix-sequence'),pin=chapter.querySelector('.mix-pin');
  const plot=chapter.querySelector('.mix-plot');
  const buttons=[...chapter.querySelectorAll('[data-mix-stage]')];
  const copy=[...chapter.querySelectorAll('[data-mix-copy]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const ns='http://www.w3.org/2000/svg';
  const colors=['#b0c6a0','#91adc8','#c2a1ad','#c4b383','#a69bc5','#87b9b5'];
  const create=(tag,attrs,parent=plot)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;};
  const label=(text,x,y,cls,parent,anchor)=>{const el=create('text',{x,y,class:cls,...(anchor?{'text-anchor':anchor}:{})},parent);el.textContent=text;return el;};
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const lerp=(a,b,t)=>a+(b-a)*t;
  // This scene is a qualitative illustration, not a performance chart.
  // Retain each example's fluctuations, but remove dates, returns and metrics.
  const curves=data.curves.map(curve=>curve.map((value,i)=>{
    const t=i/(curve.length-1);
    const individualTrend=curve[0]+(curve.at(-1)-curve[0])*t;
    return .10+.78*t+(value-individualTrend)*.006;
  }));
  const combinedCurve=curves[0].map((_,i)=>curves.reduce((sum,curve)=>sum+curve[i],0)/curves.length);
  const minNAV=Math.min(0,...curves.flat());
  const maxNAV=Math.max(1,...curves.flat());
  const common={x:70,y:70,w:860,h:375};
  const yAt=(value,box)=>box.y+box.h*(1-(value-minNAV)/(maxNAV-minNAV));
  const xAt=(index,total,box)=>box.x+box.w*index/(total-1);
  const boxes=[],cards=[];
  const cardLayer=create('g',{});
  const axisLayer=create('g',{});
  for(let i=0;i<6;i++){
    const x=25+(i%3)*325,y=25+Math.floor(i/3)*270;
    const group=create('g',{class:'mix-card'},cardLayer);
    create('rect',{x,y,width:300,height:235,rx:7},group);
    label(data.labels[i],x+18,y+30,'mix-card-name',group);
    label('개별 수익 흐름',x+282,y+30,'mix-card-tag',group,'end');
    const box={x:x+18,y:y+57,w:264,h:147};boxes.push(box);cards.push(group);
    create('line',{x1:box.x,y1:yAt(.1,box),x2:box.x+box.w,y2:yAt(.1,box),class:'mix-baseline'},group);
    label('시간의 흐름 →',x+18,y+223,'mix-card-tag',group);
  }
  label('함께 운용하는 수익 흐름',common.x,35,'mix-title',axisLayer);
  label('전략 결합 개념도',common.x+common.w,35,'mix-axis-text',axisLayer,'end');
  for(let j=0;j<=4;j++){
    const value=minNAV+(maxNAV-minNAV)*j/4,y=yAt(value,common);
    create('line',{x1:common.x,y1:y,x2:common.x+common.w,y2:y,class:'mix-grid'},axisLayer);

  }
  create('line',{x1:common.x,y1:yAt(.1,common),x2:common.x+common.w,y2:yAt(.1,common),class:'mix-baseline'},axisLayer);
  label('시간이 흐를수록 →',common.x+common.w,common.y+common.h+31,'mix-axis-text',axisLayer,'end');
  const area=create('path',{class:'mix-area'});
  const lines=curves.map((curve,i)=>create('path',{class:'mix-single',stroke:colors[i]}));
  const combined=create('path',{class:'mix-combined'});
  const combinedPoints=combinedCurve.map((nav,i)=>[xAt(i,combinedCurve.length,common),yAt(nav,common)]);
  const combinedD=combinedPoints.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  combined.setAttribute('d',combinedD);
  area.setAttribute('d',`${combinedD} L${common.x+common.w} ${yAt(.1,common)} L${common.x} ${yAt(.1,common)} Z`);
  const totalLength=combined.getTotalLength();
  combined.style.strokeDasharray=String(totalLength);
  const tip=create('circle',{r:4,class:'mix-tip'});
  const endLabel=label('더 안정적인 흐름',common.x+common.w,0,'mix-title',plot,'end');
  const legend=chapter.querySelector('.mix-legend');
  data.labels.forEach((text,i)=>{const item=document.createElement('span'),line=document.createElement('i');line.style.background=colors[i];item.append(line,document.createTextNode(text));legend.append(item);});
  let scheduled=false,current=-1;
  const staticMode=()=>reduced.matches||document.body.classList.contains('motion-paused');
  function update(){
    scheduled=false;
    const stationary=staticMode();
    const progress=stationary?1:clamp(-sequence.getBoundingClientRect().top/Math.max(1,sequence.offsetHeight-innerHeight));
    const stage=progress<.31?0:progress<.70?1:2;
    const merge=ease((progress-.30)/.48),axes=ease((progress-.39)/.18),reveal=ease((progress-.64)/.34);
    cards.forEach(card=>card.style.opacity=String(1-merge));
    axisLayer.style.opacity=String(axes);
    lines.forEach((line,i)=>{
      const box={x:lerp(boxes[i].x,common.x,merge),y:lerp(boxes[i].y,common.y,merge),w:lerp(boxes[i].w,common.w,merge),h:lerp(boxes[i].h,common.h,merge)};
      line.setAttribute('d',curves[i].map((value,j)=>`${j?'L':'M'}${xAt(j,curves[i].length,box).toFixed(2)} ${yAt(value,box).toFixed(2)}`).join(' '));
      line.style.opacity=String(lerp(.9,.13,merge));
    });
    combined.style.opacity=String(clamp(reveal*5));combined.style.strokeDashoffset=String(totalLength*(1-reveal));area.style.opacity=String(reveal*.075);
    const point=combined.getPointAtLength(totalLength*reveal);tip.setAttribute('cx',point.x);tip.setAttribute('cy',point.y);tip.style.opacity=String(reveal>0?1:0);
    endLabel.setAttribute('y',yAt(combinedCurve.at(-1),common)-16);endLabel.style.opacity=String(ease((progress-.91)/.08));
    if(current!==stage){current=stage;buttons.forEach((button,i)=>{if(i===stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});}
    copy.forEach((article,i)=>article.hidden=stationary?false:i!==stage);
    chapter.querySelector('.mix-progress i').style.width=`${progress*100}%`;
    chapter.querySelector('.mix-phase-label').textContent=['각기 다른 오르내림','서로 보완하는 움직임','흔들림을 나누고 수익을 쌓는 방향'][stage];
    pin.dataset.stage=String(stage);pin.dataset.merge=merge.toFixed(3);pin.dataset.reveal=reveal.toFixed(3);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{
    if(staticMode()){copy[i].scrollIntoView({behavior:'auto',block:'center'});return;}
    window.scrollTo({top:sequence.getBoundingClientRect().top+scrollY+(sequence.offsetHeight-innerHeight)*[.10,.48,.99][i],behavior:'smooth'});
  }));
  const dialog=document.querySelector('#mix-chart-dialog');
  chapter.querySelector('.mix-expand').addEventListener('click',()=>{
    const clone=plot.cloneNode(true);clone.querySelector('title').id='mix-plot-title-zoom';clone.querySelector('desc').id='mix-plot-description-zoom';clone.setAttribute('aria-labelledby','mix-plot-title-zoom mix-plot-description-zoom');dialog.querySelector('.mix-zoom-surface').replaceChildren(clone);dialog.showModal();
  });
  dialog.querySelector('.mix-close').addEventListener('click',()=>dialog.close());
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener('change',schedule);document.querySelector('#motion')?.addEventListener('click',schedule);
  document.fonts.ready.then(schedule);update();
})();
