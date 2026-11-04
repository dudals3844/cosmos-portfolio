'use strict';
(() => {
  document.documentElement.classList.add('js');
  const $ = (q) => document.querySelector(q);
  const sections = [...document.querySelectorAll('.chapter')];
  const nav = [...document.querySelectorAll('.chapter-nav a')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let seed = 37;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const ns = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    parent.appendChild(el);
    return el;
  }
  const petals = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * 45 + (random() - .5) * 7;
    const group = svg('g', { class: 'petal', transform: `rotate(${angle} 350 355)` }, $('#petals'));
    const organic = svg('g', { transform: `translate(350 355) scale(${.92 + random() * .16} ${.91 + random() * .17}) translate(-350 -355)` }, group);
    svg('use', { href: '#petal-shape', fill: 'url(#petal)', stroke: '#e8e7dd', 'stroke-width': '.6', filter: 'url(#paper)' }, organic);
    for (let vein = 0; vein < 19; vein++) {
      const x = 305 + vein * 5.2;
      svg('path', { d: `M350 350 Q${x + (350 - x) * .25} 270 ${x} ${167 + Math.abs(x - 351) * .7}`, fill: 'none', stroke: vein % 3 ? '#505953' : '#fffdf0', 'stroke-width': vein % 3 ? '.7' : '1.2', opacity: vein % 3 ? '.23' : '.28' }, organic);
    }
    petals.push({ el: group, angle, drift: (i % 2 ? 1 : -1) * (90 + random() * 170), turn: (random() - .5) * 120 });
  }
  for (let i = 0; i < 270; i++) {
    const a = i * 2.399963, r = Math.sqrt(i / 270) * 37;
    svg('ellipse', { cx: 350 + Math.cos(a) * r, cy: 355 + Math.sin(a) * r, rx: .9 + random() * 1.4, ry: 1.5 + random() * 1.3, fill: ['#b4b59c', '#6b725f', '#d2cfb2', '#3d473c'][i % 4], transform: `rotate(${a * 57.3} ${350 + Math.cos(a) * r} ${355 + Math.sin(a) * r})` }, $('#seeds'));
  }

  const sky = $('#universe'), ctx = sky.getContext('2d');
  const textCanvas = $('#star-text'), tc = textCanvas.getContext('2d');
  const galaxyCanvas = $('#name-galaxy'), galaxyContext = galaxyCanvas?.getContext('2d');
  let galaxyBuffer = null, galaxyOrbitStars = [], galaxyTime = 0, galaxyLastTime = null;
  const assetStars = [...document.querySelectorAll('.asset-star')];
  let width = innerWidth, height = innerHeight, dpr = 1;
  let stars = [], particles = [], textWidth = 0, textHeight = 0;
  let pointer = { x: -1000, y: -1000 }, scrollProgress = 0, current = -1;
  let meteors = [], lastMeteor = 0, time = 0, lastFrame = 0, petalProgress = 0, petalClock = 0, petalLastTime = null;
  function sampleText() {
    const h1 = $('h1'), box = h1.getBoundingClientRect(), style = getComputedStyle(h1);
    textWidth = box.width; textHeight = box.height;
    textCanvas.width = Math.ceil(textWidth * dpr); textCanvas.height = Math.ceil(textHeight * dpr);
    tc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const off = document.createElement('canvas'); off.width = Math.ceil(textWidth); off.height = Math.ceil(textHeight);
    const oc = off.getContext('2d', { willReadFrequently: true });
    const fs = parseFloat(style.fontSize), lh = parseFloat(style.lineHeight);
    oc.fillStyle = '#fff'; oc.textBaseline = 'alphabetic'; oc.letterSpacing = style.letterSpacing; oc.textAlign = 'center';
    const lines = ['SK AIGEN 분들 안녕하세요.', '이번에 지원한', '최영민입니다.'];
    lines.forEach((line, i) => {
      oc.font = `${i === 2 ? 700 : 300} ${fs}px ${style.fontFamily}`;
      const metrics = oc.measureText(line);
      const ascent = metrics.fontBoundingBoxAscent ?? fs * .88;
      const descent = metrics.fontBoundingBoxDescent ?? fs * .12;
      oc.fillText(line, textWidth / 2, i * lh + (lh - ascent - descent) / 2 + ascent);
    });
    const data = oc.getImageData(0, 0, off.width, off.height).data;
    particles = [];
    const step = innerWidth < 760 ? .8 : .85;
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
      if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] > 100)
        particles.push({ ox: x, oy: y, x, y, vx: 0, vy: 0, size: .85 + random() * .25, phase: random() * 7 });
    }
    $('.star-heading').classList.add('stars-ready');
  }
  function buildNameGalaxy() {
    if (!galaxyCanvas) return;
    const ratio = Math.min(dpr, 1.5);
    galaxyCanvas.width = Math.ceil(width * ratio); galaxyCanvas.height = Math.ceil(height * ratio);
    galaxyContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    galaxyBuffer = document.createElement('canvas');
    galaxyBuffer.width = galaxyCanvas.width; galaxyBuffer.height = galaxyCanvas.height;
    const g = galaxyBuffer.getContext('2d'); g.setTransform(ratio, 0, 0, ratio, 0, 0);
    let galaxySeed = 91287;
    const rand = () => { galaxySeed = galaxySeed * 16807 % 2147483647; return (galaxySeed - 1) / 2147483646; };
    const normal = () => Math.sqrt(-2 * Math.log(Math.max(.00001, rand()))) * Math.cos(2 * Math.PI * rand());
    const radius = Math.max(width * .43, 150);
    g.save(); g.translate(width * .5, height * .51); g.rotate(-.075);
    function cloud(x,y,r,color,alpha,squash) {
      g.save();g.translate(x,y);g.scale(1,squash);
      const glow=g.createRadialGradient(0,0,0,0,0,r);
      glow.addColorStop(0,`rgba(${color},${alpha})`);glow.addColorStop(.45,`rgba(${color},${alpha*.42})`);glow.addColorStop(1,`rgba(${color},0)`);
      g.fillStyle=glow;g.fillRect(-r,-r,r*2,r*2);g.restore();
    }
    cloud(0,0,radius,'132,145,181',.16,.31);
    cloud(-radius*.06,0,radius*.65,'169,152,178',.17,.22);
    for(let i=0;i<110;i++){
      const x=normal()*radius*.40,y=normal()*radius*.075;
      cloud(x,y,20+rand()*95,i%3?'143,137,173':'199,183,160',.025+rand()*.055,.2+rand()*.5);
    }
    for(let i=0;i<18000;i++){
      const a=rand()*Math.PI*2,r=Math.pow(rand(),.64)*radius;
      const arm=a+r/radius*5.4;
      const x=Math.cos(arm)*r+normal()*radius*.012;
      const y=Math.sin(arm)*r*.17+normal()*radius*.018;
      const density=1-r/radius;
      const alpha=(.07+rand()*.38)*(.3+density*.7);
      g.fillStyle=i%4?`rgba(204,207,224,${alpha})`:`rgba(218,197,185,${alpha})`;
      const size=.35+Math.pow(rand(),4)*1.1;
      g.fillRect(x,y,size,size);
    }
    cloud(0,0,radius*.29,'220,209,193',.26,.27);
    cloud(-radius*.01,-3,radius*.12,'237,224,202',.3,.27);
    // Irregular dust clouds break the light into the long, horizontal disk.
    for(let i=0;i<65;i++){
      const x=(rand()-.5)*radius*1.7;
      const y=12+Math.sin(x/radius*6)*14+normal()*10;
      cloud(x,y,15+rand()*65,'4,5,10',.15+rand()*.22,.15+rand()*.25);
    }
    for(let i=0;i<105;i++){
      const x=(rand()-.5)*width*1.05,y=normal()*height*.23;
      const alpha=.15+rand()*.5,r=.35+rand()*.65;
      g.fillStyle=`rgba(224,229,244,${alpha})`;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
    }
    g.restore();
    galaxyOrbitStars = Array.from({length:2800}, (_,i) => {
      const r = .06 + Math.pow(rand(),.7) * .94;
      return {r,angle:(i%3)*Math.PI*2/3+r*5.7+normal()*.20,phase:rand()*Math.PI*2,size:.45+rand()*.8,jitter:normal()*.012};
    });
  }
  function drawNameGalaxy(t) {
    if (!galaxyBuffer || !galaxyContext) return;
    const rect = document.querySelector('.cosmos-story').getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= height) return;
    if (galaxyLastTime !== null && !paused) galaxyTime += Math.min(100,Math.max(0,t-galaxyLastTime));
    galaxyLastTime = t;
    galaxyContext.clearRect(0,0,width,height);
    galaxyContext.save();
    const drift = paused ? 0 : Math.sin(galaxyTime * .00020) * 13;
    galaxyContext.translate(width*.5+drift,height*.51);
    galaxyContext.rotate(-.035 + (paused ? 0 : Math.sin(galaxyTime*.00010)*.025));
    galaxyContext.globalAlpha=.68;
    galaxyContext.drawImage(galaxyBuffer,-width*.5,-height*.51,width,height);
    const radius=Math.max(width*.43,150);
    const rotation=galaxyTime*.000105;
    for(const star of galaxyOrbitStars){
      const angle=star.angle+rotation*(.65+(1-star.r)*.6);
      const x=Math.cos(angle)*radius*star.r;
      const y=Math.sin(angle)*radius*star.r*.22+star.jitter*radius;
      const pulse=paused?.7:.45+.45*Math.sin(galaxyTime*.0012+star.phase);
      galaxyContext.fillStyle=`rgba(208,218,247,${.25+pulse*.5})`;
      galaxyContext.fillRect(x,y,star.size,star.size);
    }
    // A rotating luminous arm makes orbital movement visible within a few seconds.
    galaxyContext.globalAlpha=.40;
    for(let arm=0;arm<2;arm++){
      galaxyContext.beginPath();
      for(let j=0;j<=90;j++){
        const r=.12+j/90*.84,a=rotation+arm*Math.PI+r*5.7;
        const x=Math.cos(a)*radius*r,y=Math.sin(a)*radius*r*.22;
        if(j===0)galaxyContext.moveTo(x,y);else galaxyContext.lineTo(x,y);
      }
      galaxyContext.strokeStyle='rgba(173,188,226,.18)';galaxyContext.lineWidth=2;galaxyContext.stroke();
    }
    galaxyContext.restore();
    const diskTilt = -.035 + (paused ? 0 : Math.sin(galaxyTime*.00010)*.025);
    assetStars.forEach((star,i)=>{
      // Use the same spiral, angular velocity and projection as the galaxy stars.
      const r = .34 + ((i * 3) % 7) * .075;
      const baseAngle = (i % 3) * Math.PI * 2 / 3 + r * 5.7;
      const angle = baseAngle + rotation * (.65 + (1-r)*.6);
      const orbitX = Math.cos(angle) * radius * r;
      const orbitY = Math.sin(angle) * radius * r * .22;
      const x = width*.5 + drift + orbitX*Math.cos(diskTilt) - orbitY*Math.sin(diskTilt);
      const y = height*.51 + orbitX*Math.sin(diskTilt) + orbitY*Math.cos(diskTilt);
      const phase=(galaxyTime+i*2800)%19600;
      const pulse=paused?.72:phase<4800?Math.pow(Math.sin(Math.PI*phase/4800),1.65):0;
      star.style.left=`${x}px`;star.style.top=`${y}px`;
      star.style.transform='none';
      const label=star.querySelector('span');
      const labelWidth=label.offsetWidth;
      label.style.left=x+labelWidth+14>width-15?`${-labelWidth-12}px`:'12px';
      star.querySelector('i').style.opacity=(.12+pulse*.88).toFixed(3);
      star.querySelector('i').style.scale=(.7+pulse*.65).toFixed(3);
      star.querySelector('span').style.opacity=pulse.toFixed(3);
      star.classList.toggle('is-twinkling',pulse>.35);
    });
  }
  function resize() {
    width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    sky.width = width * dpr; sky.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(650, Math.floor(width * height / 2000)) }, () => ({ x: random() * width, y: random() * height, r: .25 + random() ** 3 * 1.5, alpha: .15 + random() * .6, phase: random() * 7 }));
    buildNameGalaxy(); sampleText(); updateScroll(); render(performance.now());
  }
  function updateCareerFocus() {
    if (!careerEntries.length) return;
    const focusY = innerHeight * .47;
    const distances = careerEntries.map(entry => {
      const box = entry.getBoundingClientRect();
      return Math.abs(box.top + Math.min(160, box.height * .3) - focusY);
    });
    const nearest = distances.indexOf(Math.min(...distances));
    const weights = distances.map(distance => {
      const v = Math.max(0, 1 - distance / Math.max(180, Math.min(innerHeight * .5, careerEntries[0].offsetHeight * 1.8)));
      return v * v * (3 - 2 * v);
    });
    const peak = Math.max(.001, ...weights);
    careerEntries.forEach((entry, i) => {
      entry.style.opacity = (.18 + .82 * weights[i] / peak).toFixed(3);
      entry.classList.toggle('is-current', i === nearest);
    });
  }
  function updateNameStory() {
    const story = document.querySelector('.cosmos-story');
    if (!story) return;
    const pin = story.querySelector('.cosmos-pin');
    const progress = paused ? 1 : Math.max(0, Math.min(1, -story.getBoundingClientRect().top / Math.max(1, story.offsetHeight - innerHeight)));
    const grow = Math.min(1, progress / .34);
    const eased = grow * grow * (3 - 2 * grow);
    const minFont = innerWidth < 760 ? 21 : 32;
    const maxFont = Math.min(104, innerWidth * .07);
    story.querySelector('.cosmos-wordmark h2').style.fontSize = `${minFont + (maxFont - minFont) * eased}px`;
    pin.style.setProperty('--name-top', `${42 - eased * 27}svh`);
    pin.style.setProperty('--name-progress', `${progress * 100}%`);
    pin.style.setProperty('--scene-opacity', `${.96 * eased}`);
    if (galaxyCanvas) galaxyCanvas.style.opacity = `${eased * .72}`;
    story.querySelectorAll('.name-reason').forEach((reason, i) => {
      const reveal = Math.max(0, Math.min(1, (progress - (.39 + i * .24)) / .15));
      const smooth = reveal * reveal * (3 - 2 * reveal);
      reason.style.setProperty('--reason-opacity', smooth.toFixed(3));
      reason.style.setProperty('--reason-y', `${(1 - smooth) * 38}px`);
      reason.classList.toggle('is-revealed', reveal > .98);
    });
  }
  function updateScroll() {
    const middle = scrollY + innerHeight * .5;
    let active = 0;
    sections.forEach((s, i) => { if (middle >= s.offsetTop) active = i; });
    if (active !== current) {
      current = active;
      sections.forEach((s, i) => s.classList.toggle('active', i === active));
      nav.forEach((a, i) => { a.classList.toggle('active', i === active); if (i === active) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
      $('.current-chapter').textContent = sections[active].dataset.title;
      $('.progress-label').textContent = `${String(active).padStart(2, '0')} / ${String(sections.length - 1).padStart(2, '0')}`;
      $('.caption-number').textContent = `${String(active + 1).padStart(2, '0')} — ${String(sections.length).padStart(2, '0')}`;
    }
    scrollProgress = Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    $('#progress').style.width = `${scrollProgress * 100}%`;
    updateCareerFocus();
    updateNameStory();
    if (paused) render(performance.now());
  }
  function drawPetals(t) {
    if (petalLastTime !== null && !paused) petalClock += Math.min(100, Math.max(0, t - petalLastTime));
    petalLastTime = t;
    petalProgress = paused ? scrollProgress : petalProgress + (scrollProgress - petalProgress) * .095;
    if (Math.abs(scrollProgress - petalProgress) < .00005) petalProgress = scrollProgress;
    const poses = [];
    petals.forEach((p, i) => {
      const order = [1, 5, 3, 7, 0, 4, 2, 6][i];
      const finale = current === sections.length - 1;
      const eligible = finale || petalProgress * 10 > order + .5;
      const ease = v => v * v * (3 - 2 * v);
      if (!eligible) { p.releaseAt = null; p.returnAt = null; }
      else {
        if (!finale && p.returnAt != null) { p.releaseAt = petalClock; p.returnAt = null; }
        if (p.releaseAt == null) p.releaseAt = petalClock + order * 160;
        if (finale && p.returnAt == null) p.returnAt = Math.max(petalClock, p.releaseAt + 3800) + order * 90;
      }
      const elapsed = eligible ? petalClock - p.releaseAt : -1;
      let fall = 0, phaseName = 'docked';
      if (elapsed >= 0) {
        fall = ease(Math.min(1, elapsed / 3400));
        phaseName = elapsed < 3400 ? 'falling' : 'resting';
        if (finale && petalClock >= p.returnAt) {
          const ascent = Math.min(1, (petalClock - p.returnAt) / 3800);
          fall = 1 - ease(ascent);
          phaseName = ascent < 1 ? 'rising' : 'docked';
        }
      }
      if (paused) { fall = finale ? 0 : eligible ? 1 : 0; phaseName = fall ? 'resting' : 'docked'; }
      p.el.dataset.phase = phaseName;
      // A shared anchor holds every petal at the flower's center before release.
      // Once released, lift slows descent while crosswind produces broad glides.
      const envelope = Math.sin(Math.PI * fall);
      const phase = i * 1.37;
      const breeze = paused ? 0 : Math.sin(t * .00075 + phase) * 16 * envelope;
      const sweep = (Math.sin(fall * Math.PI * 2.1 + phase) - Math.sin(phase)) * (65 + i * 6);
      const x = fall * (p.drift + 125) + sweep * envelope + breeze;
      const y = Math.pow(fall, 1.35) * 650 - envelope * 58;
      const rocking = Math.sin(fall * Math.PI * 4 + phase) * 31 * envelope;
      const angle = p.angle + fall * p.turn + rocking;
      const tilt = 1 - Math.abs(Math.sin(fall * Math.PI * 3 + phase)) * .4 * envelope;
      p.el.setAttribute('transform', `translate(${x} ${y}) translate(350 355) rotate(${angle}) scale(${tilt} ${1 - envelope * .08}) translate(-350 -355)`);
      p.el.style.opacity = `${1 - fall * .08}`;
      poses.push({x,y,angle,tilt,fall,opacity:1-fall*.08});
    });
    window.cosmosBloom?.draw(poses,t,paused,pointer);
    sections[sections.length-1].classList.toggle('flower-complete', current===sections.length-1 && poses.every(p=>p.fall<.001));
  }
  function drawSky(t) {
    ctx.clearRect(0, 0, width, height);
    for (const s of stars) {
      const alpha = s.alpha * (paused ? .8 : .7 + .3 * Math.sin(t * .0006 + s.phase));
      const y = (s.y - scrollProgress * (s.r * 40) + height) % height;
      ctx.fillStyle = `rgba(218,226,226,${alpha})`; ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.r > 1.3) { ctx.strokeStyle = `rgba(221,229,215,${alpha * .3})`; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(s.x - 4, y); ctx.lineTo(s.x + 4, y); ctx.moveTo(s.x, y - 4); ctx.lineTo(s.x, y + 4); ctx.stroke(); }
    }
    if (!paused && t - lastMeteor > 3700) {
      lastMeteor = t;
      meteors.push({ x: width * (.25 + random() * .75), y: height * random() * .3, start: t, duration: 1100 + random() * 500 });
    }
    meteors = meteors.filter(m => t - m.start < m.duration);
    if (!paused) meteors.forEach(m => {
      const f = (t - m.start) / m.duration, x = m.x - f * 400, y = m.y + f * 290;
      const g = ctx.createLinearGradient(x, y, x + 105, y - 76); g.addColorStop(0, `rgba(234,244,226,${Math.sin(f * Math.PI) * .8})`); g.addColorStop(1, 'rgba(223,235,221,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 105, y - 76); ctx.stroke();
    });
  }
  function drawText(t) {
    if (current > 0) return;
    tc.clearRect(0, 0, textWidth, textHeight);
    const box = textCanvas.getBoundingClientRect();
    const mx = pointer.x - box.left, my = pointer.y - box.top;
    for (const p of particles) {
      if (!paused) {
        const dx = p.x - mx, dy = p.y - my, distance = Math.hypot(dx, dy);
        if (distance < 105 && distance > .01) { const f = (1 - distance / 105) * 4.2; p.vx += dx / distance * f; p.vy += dy / distance * f; }
        p.vx = (p.vx + (p.ox - p.x) * .055) * .82; p.vy = (p.vy + (p.oy - p.y) * .055) * .82;
        p.x += p.vx; p.y += p.vy;
      } else { p.x = p.ox; p.y = p.oy; p.vx = 0; p.vy = 0; }
      tc.fillStyle = `rgba(250,253,243,${.9 + .1 * Math.sin(t * .001 + p.phase)})`;
      tc.fillRect(p.x, p.y, p.size, p.size);
      if (p.phase > 6.92) { tc.globalAlpha = .5; tc.fillRect(p.x - 1.5, p.y, 4, .5); tc.fillRect(p.x, p.y - 1.5, .5, 4); tc.globalAlpha = 1; }
    }
  }
  function render(t) { time = t; drawPetals(t); drawSky(t); drawNameGalaxy(t); drawText(t); }
  let raf = 0;
  function frame(t) { if (t - lastFrame > 30) { render(t); lastFrame = t; } if (!paused && !document.hidden) raf = requestAnimationFrame(frame); }
  function syncMotion() {
    $('#motion').setAttribute('aria-pressed', String(paused));
    $('#motion').setAttribute('aria-label', paused ? '애니메이션 재생하기' : '애니메이션 멈추기');
    $('#motion span').textContent = paused ? 'OFF' : 'ON';
    document.body.classList.toggle('motion-paused', paused);
    updateNameStory();
    cancelAnimationFrame(raf); render(time); if (!paused && !document.hidden) raf = requestAnimationFrame(frame);
  }
  $('#motion').addEventListener('click', () => { paused = !paused; syncMotion(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; syncMotion(); });
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden && !paused) raf = requestAnimationFrame(frame); });
  window.addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer = { x: -1000, y: -1000 }; });
  let scrollScheduled = false;
  window.addEventListener('scroll', () => { if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(() => { updateScroll(); scrollScheduled = false; }); } }, { passive: true });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
  const careerEntries = [...document.querySelectorAll('.career-entry')];
  if ('IntersectionObserver' in window) {
    const careerObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          careerObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -16% 0px', threshold: .08 });
    careerEntries.forEach(entry => careerObserver.observe(entry));
  } else careerEntries.forEach(entry => entry.classList.add('is-visible'));
  resize(); syncMotion();
  document.fonts.ready.then(() => { sampleText(); render(performance.now()); });
})();
