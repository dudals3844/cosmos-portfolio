'use strict';
(() => {
  const demo=document.querySelector('.decision-demo');
  if(!demo)return;
  const pin=demo.closest('.system-pin');
  const map=demo.querySelector('svg');
  const paths=[...map.querySelectorAll('.decision-link')];
  const lengths=paths.map(path=>path.getTotalLength());
  const roles=[...map.querySelectorAll('.decision-role')];
  const examples=[...demo.querySelectorAll('[data-agent-example]')];
  const rows=[...pin.querySelectorAll('.role-model-examples>[data-agent-role]')];
  const signal=map.querySelector('.decision-signal');
  const hub=map.querySelector('.decision-hub');
  const task=map.querySelector('.decision-task');
  const status=map.querySelector('.decision-status');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const tasks=['새 전략의 가설과 실험을 설계해주세요.','전략 로직을 코드로 구현해주세요.','변경된 코드와 검증 근거를 검토해주세요.','논문·파일을 찾고 가벼운 일정을 정리해주세요.'];
  const names=['전략 연구','구현','리뷰','탐색·일정'];
  let clock=0,last=null,raf=0,selected=-1;
  const paused=()=>reduced.matches||document.body.classList.contains('motion-paused');
  function visible(){const r=pin.getBoundingClientRect();return pin.dataset.stage==='3'&&r.top<innerHeight&&r.bottom>0&&!document.hidden;}
  function render(){
    const index=Math.floor(clock/5200)%4,phase=clock%5200;
    const stationary=paused();
    const routed=stationary||phase>=2050;
    const transferring=!stationary&&phase>=950&&phase<2050;
    if(selected!==index){
      selected=index;task.textContent=tasks[index];
      examples.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    }
    hub.classList.toggle('is-thinking',!stationary&&phase<950);
    paths.forEach((path,i)=>path.classList.toggle('is-selected',i===index&&(transferring||routed)));
    roles.forEach((role,i)=>role.classList.toggle('is-selected',routed&&i===index));
    rows.forEach((row,i)=>row.classList.toggle('is-selected',routed&&i===index));
    status.textContent=routed?`${names[index]} Agent 선택`:transferring?'선택한 역할로 전달합니다':'상황을 판단합니다';
    signal.style.opacity=transferring?'1':'0';
    if(transferring){const p=paths[index].getPointAtLength(lengths[index]*(phase-950)/1100);signal.setAttribute('transform',`translate(${p.x} ${p.y})`);}
    demo.dataset.selectedRole=String(index);
    demo.dataset.phase=routed?'selected':transferring?'routing':'thinking';
  }
  function frame(t){
    if(!visible()||paused()){last=null;raf=0;render();return;}
    if(last!==null)clock+=Math.min(100,Math.max(0,t-last));
    last=t;render();raf=requestAnimationFrame(frame);
  }
  function sync(){
    if(!visible()||paused()){cancelAnimationFrame(raf);raf=0;last=null;render();return;}
    if(!raf){last=null;raf=requestAnimationFrame(frame);}
  }
  examples.forEach((button,index)=>button.addEventListener('click',()=>{clock=index*5200;selected=-1;last=null;render();sync();}));
  new MutationObserver(sync).observe(pin,{attributes:true,attributeFilter:['data-stage']});
  window.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',sync,{passive:true});
  document.addEventListener('visibilitychange',sync);
  document.querySelector('#motion')?.addEventListener('click',sync);
  reduced.addEventListener('change',sync);
  render();sync();
})();
