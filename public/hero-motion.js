'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  if (!$('#route')) return;
  let motionOff = false;
  try { motionOff = localStorage.getItem('slotrace-motion') === 'off'; } catch (_) {}
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let mm, loop, offscreen, userPaused = false, heroVisible = true;
  const route = $('#route'); const length = route.getTotalLength();
  function updatePause() { const reduced = motionOff || reducedQuery.matches; $('#pause').disabled = reduced || !window.gsap; $('#replay').disabled = reduced || !window.gsap; $('#pause').textContent = userPaused ? '▶ Play' : 'Ⅱ Pause'; $('#pause').setAttribute('aria-pressed', String(userPaused)); }
  function syncPlayback() { if (loop) { if (userPaused || !heroVisible || document.hidden) loop.pause(); else loop.play(); } }
  function buildMotion() {
    if (offscreen) offscreen.disconnect(); if (mm) mm.revert();
    loop = null;
    document.documentElement.classList.toggle('motion-off', motionOff || reducedQuery.matches);
    $('#motion-toggle').setAttribute('aria-pressed', String(motionOff));
    $('#motion-toggle').textContent = motionOff ? 'Motion: off' : reducedQuery.matches ? 'Motion: reduced' : 'Motion: on';
    route.style.strokeDasharray = ''; route.style.strokeDashoffset = '';
    const end = route.getPointAtLength(length); $('#packet').setAttribute('transform', `translate(${end.x}, ${end.y})`);
    $('#hero-status').textContent = 'CONFIRMED';
    if (!window.gsap || !window.ScrollTrigger) { updatePause(); return; }
    gsap.registerPlugin(ScrollTrigger); mm = gsap.matchMedia();
    mm.add({ normal: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      if (motionOff || context.conditions.reduced) return;
      gsap.timeline({ defaults: { duration: .8, ease: 'power3.out' } })
        .from('.headline-line', { y: 45, autoAlpha: 0, stagger: .09, clearProps: 'all' })
        .from('.intro, .subcopy, .actions', { y: 18, autoAlpha: 0, stagger: .09, clearProps: 'all' }, '-=.55')
        .from('.hero-instrument', { autoAlpha: 0, y: 12, clearProps: 'all' }, .25);
      const signal = { progress: 0 };
      loop = gsap.timeline({ repeat: -1, repeatDelay: 1.1, defaults: { ease: 'none' } });
      loop.set('#route', { strokeDasharray: length, strokeDashoffset: length }, 0)
        .set('.map-node rect', { fill: '#151a0e' }, 0)
        .set('.hero-log>div', { autoAlpha: .14 }, 0)
        .set(signal, { progress: 0 }, 0)
        .call(() => { $('#hero-status').textContent = 'TRACING'; }, null, 0)
        .to('#route', { strokeDashoffset: 0, duration: 4.8 }, 0)
        .to(signal, { progress: 1, duration: 4.8, onUpdate: () => { const p = route.getPointAtLength(signal.progress * length); $('#packet').setAttribute('transform', `translate(${p.x}, ${p.y})`); } }, 0)
        .to('[data-node="0"] rect', { fill: '#dfff00', duration: .18 }, 0)
        .to('.hero-log>div:nth-child(1)', { autoAlpha: 1, duration: .3 }, .15)
        .to('[data-node="1"] rect', { fill: '#dfff00', duration: .18 }, 1.82)
        .to('.hero-log>div:nth-child(2)', { autoAlpha: 1, duration: .3 }, 1.9)
        .to('[data-node="2"] rect', { fill: '#dfff00', duration: .18 }, 4.65)
        .to('.hero-log>div:nth-child(3)', { autoAlpha: 1, duration: .3 }, 4.7)
        .call(() => { $('#hero-status').textContent = 'CONFIRMED'; }, null, 4.8)
        .to({}, { duration: 1.2 });
      $$('.reveal').forEach(el => gsap.from(el, { y: 26, autoAlpha: 0, duration: .65, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 91%', once: true }, clearProps: 'all' }));
      gsap.from('.journey-line', { scaleX: 0, duration: 1.2, ease: 'power2.inOut', scrollTrigger: { trigger: '.journey', start: 'top 82%', once: true } });
      gsap.from('.latency-bars i', { scaleX: 0, stagger: .12, duration: .65, ease: 'power2.out', scrollTrigger: { trigger: '.latency-preview', start: 'top 88%', once: true } });
      gsap.to('.read-progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: .25 } });
      offscreen = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; syncPlayback(); }, { threshold: .05 }); offscreen.observe($('.hero-instrument'));
      syncPlayback();
      return () => { offscreen?.disconnect(); $('#packet').removeAttribute('style'); $('#packet').setAttribute('transform', `translate(${end.x}, ${end.y})`); $('#hero-status').textContent = 'CONFIRMED'; };
    });
    updatePause();
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  $('#pause').addEventListener('click', () => { userPaused = !userPaused; syncPlayback(); updatePause(); });
  $('#replay').addEventListener('click', () => { userPaused = false; loop?.restart(); syncPlayback(); updatePause(); });
  $('#motion-toggle').addEventListener('click', () => { motionOff = !motionOff; try { localStorage.setItem('slotrace-motion', motionOff ? 'off' : 'on'); } catch (_) {} buildMotion(); });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedQuery.addEventListener('change', buildMotion);
  window.addEventListener('pagehide', () => { offscreen?.disconnect(); mm?.revert(); });
  buildMotion();
})();
