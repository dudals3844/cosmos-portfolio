'use strict';
(() => {
  document.querySelectorAll('.system-sequence').forEach(sequence=>{
  const chapter=sequence.closest('.system-chapter');
  const pin=sequence.querySelector('.system-pin');
  const panels=[...sequence.querySelectorAll('.system-panel')];
  const buttons=[...sequence.querySelectorAll('.system-steps button')];
  const nodes=[...sequence.querySelectorAll('.rs-node,.rs-routing,.rs-evaluation')];
  const wires=[...sequence.querySelectorAll('.rs-wire')];
  const labels=buttons.map(button=>button.dataset.label||button.textContent.replace(/^\s*\d+\s*/, '').trim());
  const count=sequence.querySelector('.system-step-count');
  const label=sequence.querySelector('.system-stage-label');
  const track=sequence.querySelector('.system-track i');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let current=-1,scheduled=false;
  const staticMode=()=>reduced.matches||document.body.classList.contains('motion-paused');
  function select(index){
    if(index===current)return;
    current=index;
    panels.forEach((panel,i)=>{panel.hidden=i!==index;panel.classList.toggle('is-active',i===index);});
    buttons.forEach((button,i)=>{
      if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
      button.classList.toggle('is-complete',i<index);
    });
    nodes.forEach(node=>{const i=Number(node.dataset.stage);node.classList.toggle('is-active',i===index);node.classList.toggle('is-complete',i<index);});
    wires.forEach(wire=>{const i=Number(wire.dataset.stage);wire.classList.toggle('is-active',i===index);wire.classList.toggle('is-complete',i<index);});
    count.textContent=`${String(index+1).padStart(2,'0')} / ${String(panels.length).padStart(2,'0')}`;
    label.textContent=labels[index];
    pin.dataset.stage=String(index);
  }
  function update(){
    scheduled=false;
    if(staticMode()){
      panels.forEach(p=>p.hidden=false);
      if(current<0)select(0);
      panels.forEach(p=>p.hidden=false);
      track.style.width='100%';
      return;
    }
    const span=Math.max(1,sequence.offsetHeight-innerHeight);
    const progress=Math.max(0,Math.min(1,-sequence.getBoundingClientRect().top/span));
    select(Math.min(panels.length-1,Math.floor(progress*panels.length)));
    panels.forEach((panel,i)=>panel.hidden=i!==current);
    track.style.width=`${progress*100}%`;
  }
  function requestUpdate(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  function goTo(index){
    if(staticMode()){
      const panel=panels[index];panel.hidden=false;panel.scrollIntoView({behavior:'auto',block:'center'});select(index);panels.forEach(p=>p.hidden=false);return;
    }
    const start=sequence.getBoundingClientRect().top+scrollY;
    const span=Math.max(1,sequence.offsetHeight-innerHeight);
    const progress=(index+.18)/panels.length;
    window.scrollTo({top:start+span*progress,behavior:'smooth'});
  }
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>goTo(index));
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%buttons.length;
      else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=buttons.length-1;
      else return;
      event.preventDefault();buttons[next].focus({preventScroll:true});goTo(next);
    });
  });
  const mapDialog=chapter.querySelector('dialog');
  sequence.querySelector('.diagram-zoom')?.addEventListener('click',()=>{
    const surface=mapDialog.querySelector('.map-zoom-surface');
    const visibleMap=[...sequence.querySelectorAll('.research-map')].find(map=>map.getBoundingClientRect().width>0);
    const clone=(visibleMap||sequence.querySelector('.research-map')).cloneNode(true);
    clone.querySelectorAll('[id]').forEach(element=>{
      const original=element.id;const replacement=`${original}-zoom-${chapter.id}`;
      element.id=replacement;
      clone.querySelectorAll('*').forEach(node=>{
        for(const attribute of ['marker-end','marker-start','fill','filter','aria-labelledby','aria-describedby']){
          const value=node.getAttribute(attribute);
          if(value)node.setAttribute(attribute,value.replaceAll(original,replacement));
        }
      });
      for(const attribute of ['aria-labelledby','aria-describedby']){
        const value=clone.getAttribute(attribute);if(value)clone.setAttribute(attribute,value.replaceAll(original,replacement));
      }
    });
    surface.replaceChildren(clone);mapDialog.showModal();
  });
  mapDialog?.querySelector('.map-dialog-close').addEventListener('click',()=>mapDialog.close());
  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate,{passive:true});
  reduced.addEventListener('change',()=>{current=-1;requestUpdate();});
  document.querySelector('#motion')?.addEventListener('click',()=>{current=-1;requestUpdate();});
  document.fonts.ready.then(requestUpdate);
  update();
  });
})();
