'use strict';
(()=>{
  let timer,loading=false,published=false,attempts=0;
  function render(token){
    if(token.status!=='published'||token.symbol!=='SLOT'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token.mint))return;
    published=true;
    document.querySelectorAll('[data-token-short]').forEach(el=>el.textContent=token.mint.slice(0,6)+'…'+token.mint.slice(-6));
    document.querySelectorAll('[data-token-mint]').forEach(el=>el.textContent=token.mint);
    document.querySelectorAll('[data-token-copy]').forEach(button=>{
      button.disabled=false;button.title=token.mint;button.setAttribute('aria-label','Copy SLOT mint address: '+token.mint);
      button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(token.mint);button.setAttribute('aria-label','SLOT mint address copied');const value=button.querySelector('strong');if(value){const prior=value.textContent;value.textContent='copied';setTimeout(()=>value.textContent=prior,1500);}}catch{const panel=document.querySelector('[data-token-panel]');panel?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});}});
    });
    document.querySelectorAll('[data-token-explorer]').forEach(a=>a.href='https://explorer.solana.com/address/'+token.mint);
    document.querySelectorAll('[data-token-launch]').forEach(a=>a.href='https://pump.fun/coin/'+token.mint);
    document.querySelectorAll('[data-token-pending]').forEach(el=>el.hidden=true);
    document.querySelectorAll('[data-token-live],[data-token-panel]').forEach(el=>el.hidden=false);
    document.querySelectorAll('[data-token-footer]').forEach(el=>el.textContent='SOLANA TRANSACTION INTELLIGENCE / $SLOT');
    clearInterval(timer);
  }
  async function refresh(){
    if(published||loading||document.hidden||attempts>=720)return;
    attempts++;loading=true;
    try{const response=await fetch('/api/token',{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(response.ok)render(await response.json());}catch{}finally{loading=false;}
  }
  timer=setInterval(refresh,5000);refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('pagehide',()=>clearInterval(timer));
  window.addEventListener('pageshow',event=>{if(event.persisted&&!published){timer=setInterval(refresh,5000);refresh();}});
})();
