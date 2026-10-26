'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const menu = $('#mobile-menu'), menuButton = $('.menu-toggle');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open)); menu.hidden = !open;
    menuButton.querySelector('span').textContent = open ? '−' : '+';
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.querySelector('span').textContent = '+'; menuButton.focus(); } });

  const sidebar = $('.docs-sidebar');
  if (sidebar) {
    const button = $('.docs-menu-toggle');
    const mq = matchMedia('(max-width: 760px)');
    function collapse() { sidebar.classList.toggle('collapsed', mq.matches); button.setAttribute('aria-expanded', String(!mq.matches)); button.querySelector('span').textContent = mq.matches ? '+' : '−'; }
    collapse(); mq.addEventListener('change', collapse);
    button.addEventListener('click', () => { const open = sidebar.classList.contains('collapsed'); sidebar.classList.toggle('collapsed', !open); button.setAttribute('aria-expanded', String(open)); button.querySelector('span').textContent = open ? '−' : '+'; });
    const query = $('#docs-search'), results = $('#search-results');
    let entries, pending;
    async function search() {
      const value = query.value.trim().toLowerCase(); results.replaceChildren(); results.hidden = !value;
      if (!value) return;
      try {
        if (!entries) {
          results.textContent = 'Loading documentation…';
          pending ||= fetch('/docs/search-index.json').then(r => { if (!r.ok) throw new Error('Search unavailable'); return r.json(); });
          entries = await pending;
        }
        if (query.value.trim().toLowerCase() !== value) return;
        const words = value.split(/\s+/);
        const matches = entries.filter(item => words.every(w => `${item.title} ${item.description} ${item.text}`.toLowerCase().includes(w))).sort((a,b) => Number(b.title.toLowerCase().includes(value)) - Number(a.title.toLowerCase().includes(value)));
        results.replaceChildren();
        const count = document.createElement('div'); count.className = 'search-count'; count.textContent = `${matches.length} ARTICLE${matches.length === 1 ? '' : 'S'} FOUND`; results.append(count);
        if (!matches.length) { const p = document.createElement('p'); p.textContent = 'No matches. Try “token”, “RPC” or “simulation”.'; results.append(p); }
        matches.forEach(item => { const a = document.createElement('a'); a.href = item.url; const title = document.createElement('strong'); title.textContent = item.title + ' ↗'; const description = document.createElement('small'); description.textContent = item.description; a.append(title, description); results.append(a); });
      } catch (_) { pending = null; results.textContent = 'Search is unavailable. Use the article navigation below.'; }
    }
    query.addEventListener('input', search);
    document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); sidebar.classList.remove('collapsed'); button.setAttribute('aria-expanded','true'); button.querySelector('span').textContent = '−'; query.focus(); } });
    const sections = $$('.doc-content>section');
    const observer = new IntersectionObserver(items => { const visible = items.filter(x => x.isIntersecting).sort((a,b) => a.boundingClientRect.top-b.boundingClientRect.top); if (visible[0]) $$('.doc-toc a').forEach(a => a.classList.toggle('active', a.hash === '#' + visible[0].target.id)); }, { rootMargin: '-10% 0px -60% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
    window.addEventListener('pagehide', () => observer.disconnect());
  }

  // Homepage motion is owned by app.js. Other pages use this small independent scene.
  if ($('#route')) return;
  let disabled = false;
  try { disabled = localStorage.getItem('slotrace-motion') === 'off'; } catch (_) {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let media, visibilityObserver, sceneMotion = [], sceneVisible = true, scenePaused = false;
  const scene = $('.token-scene');
  const pauseButton = $('#token-motion-pause');
  function syncScene() {
    const paused = scenePaused || !sceneVisible || document.hidden;
    sceneMotion.forEach(animation => animation.paused(paused));
    if (pauseButton) {
      pauseButton.textContent = scenePaused ? '▶ Play scene' : 'Ⅱ Pause scene';
      pauseButton.setAttribute('aria-pressed', String(scenePaused));
      pauseButton.disabled = disabled || reduced.matches || !window.gsap;
    }
  }
  pauseButton?.addEventListener('click', () => { scenePaused = !scenePaused; syncScene(); });
  function initMotion() {
    media?.revert(); visibilityObserver?.disconnect(); sceneMotion = [];
    const off = disabled || reduced.matches;
    document.documentElement.classList.toggle('motion-off', off);
    const toggle = $('#motion-toggle');
    toggle.textContent = disabled ? 'Motion: off' : reduced.matches ? 'Motion: reduced' : 'Motion: on';
    toggle.setAttribute('aria-pressed', String(disabled));
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger); media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (disabled) return;
      gsap.from('.page-intro>.page-title, .token-hero-grid>div:first-child, .doc-hero', { y:18, autoAlpha:0, duration:.65, ease:'power2.out', clearProps:'all' });
      gsap.to('.read-progress', { scaleX:1, ease:'none', scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:.2} });
      if (scene) {
        sceneMotion.push(gsap.to('.token-float', {y:-16,duration:3.6,repeat:-1,yoyo:true,ease:'sine.inOut'}));
        sceneMotion.push(gsap.fromTo('.token-coin', {rotationX:12,rotationY:-18,rotationZ:-7}, {rotationX:5,rotationY:16,rotationZ:3,duration:5.5,repeat:-1,yoyo:true,ease:'sine.inOut'}));
        sceneMotion.push(gsap.to('.token-aura', {autoAlpha:.45,scale:.92,duration:3.6,repeat:-1,yoyo:true,ease:'sine.inOut'}));
        sceneMotion.push(gsap.to('.token-ground', {scale:.82,autoAlpha:.45,duration:3.6,repeat:-1,yoyo:true,ease:'sine.inOut'}));
        $$('.token-pulse').forEach((pulse,index) => {
          const path = $(`#token-path-${index+1}`), length = path.getTotalLength();
          const progress = {value:0};
          sceneMotion.push(gsap.to(progress,{value:1,duration:8+index*2,repeat:-1,ease:'none',onUpdate:()=>{const p=path.getPointAtLength(length*progress.value);pulse.setAttribute('transform',`translate(${p.x},${p.y})`);}}));
        });
        visibilityObserver = new IntersectionObserver(items => { sceneVisible = items[0].isIntersecting; syncScene(); });
        visibilityObserver.observe(scene);
        syncScene();
        $$('.utility-row').forEach(el => gsap.from(el, { y:20, autoAlpha:0,duration:.55,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 92%',once:true},clearProps:'all' }));
      }
    });
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    syncScene();
  }
  $('#motion-toggle')?.addEventListener('click', () => { disabled = !disabled; try { localStorage.setItem('slotrace-motion', disabled ? 'off' : 'on'); } catch (_) {} initMotion(); });
  reduced.addEventListener('change', initMotion);
  document.addEventListener('visibilitychange', syncScene);
  window.addEventListener('pagehide', () => { media?.revert(); visibilityObserver?.disconnect(); });
  initMotion();
})();
