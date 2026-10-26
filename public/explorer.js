'use strict';
(() => {
  const form = document.querySelector('#lookup-form');
  if (!form) return;
  const $ = selector => document.querySelector(selector);
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const {validSignature, normalizeTransaction} = window.SlotraceTransaction;
  let current = null, currentSignature = '', tab = 'logs', controller = null;
  function message(text, error=false) {
    $('#lookup-message').textContent = text;
    $('#lookup-message').classList.toggle('lookup-error',error);
  }
  function renderDetails() {
    const rows = current ? current[tab === 'instructions' ? 'instructionRows' : tab] : ['Enter a signature to inspect a transaction.'];
    $('#detail-panel').replaceChildren(...rows.map((text,index)=>{
      const row=document.createElement('div');row.className='log-line';
      const number=document.createElement('span');number.className='line-num';number.textContent=String(index+1).padStart(3,'0');
      const content=document.createElement('span');content.className='log-content';content.textContent=text;
      row.append(number,content);return row;
    }));
    $('#detail-panel').setAttribute('aria-labelledby','tab-'+tab);
  }
  function selectTab(button) {
    tab=button.dataset.tab;
    tabs.forEach(b=>{const active=b===button;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    renderDetails();
  }
  tabs.forEach((button,index)=>{
    button.addEventListener('click',()=>selectTab(button));
    button.addEventListener('keydown',event=>{
      const positions={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1};
      if (Object.hasOwn(positions,event.key)){event.preventDefault();const next=tabs[positions[event.key]];selectTab(next);next.focus();}
    });
  });
  function clearResult() {
    current=null;currentSignature='';$('#lookup-result').hidden=true;$('#copy').disabled=true;
    $('#external-explorer').hidden=true;
  }
  async function rpc(signature,network) {
    controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch('/api/transaction?'+new URLSearchParams({signature,network}),{headers:{Accept:'application/json'},credentials:'omit',signal:controller.signal});
      const payload=await response.json();
      if (!response.ok || payload.error) throw new Error(typeof payload.error==='string'?payload.error:`The data service could not complete this request (HTTP ${response.status}).`);
      if (!Object.hasOwn(payload,'result')) throw new Error('The RPC provider returned an invalid response.');
      return payload.result;
    } finally {clearTimeout(timeout);controller=null;}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const signature=$('#signature-input').value.trim(),network=$('#network').value;
    clearResult();
    if (!validSignature(signature)){message('Enter a valid Solana transaction signature (64 bytes encoded as base58).',true);$('#signature-input').focus();return;}
    $('#lookup-submit').disabled=true;form.setAttribute('aria-busy','true');message('Loading confirmed transaction from Solana…');
    try {
      const record=await rpc(signature,network);
      if(!record){message('No transaction found at confirmed commitment. Check the network and signature. Unconfirmed transactions or missing provider history can also produce this result.');return;}
      current=normalizeTransaction(record);currentSignature=signature;
      $('#signature').textContent=signature;$('#tx-status').textContent=current.status;$('#tx-status').classList.toggle('execution-error',!!current.error);
      $('#tx-network').textContent=network==='mainnet'?'Mainnet':'Devnet';$('#tx-instructions').textContent=String(current.instructions);$('#tx-compute').textContent=current.compute;$('#tx-fee').textContent=current.fee;$('#tx-slot').textContent=String(current.slot);
      $('#tx-block-time').textContent=current.blockTime?new Date(current.blockTime*1000).toISOString():'Not reported';
      $('#tx-version').textContent=record.version===undefined?'Not reported':String(record.version);
      $('#tx-provider').textContent='SLOTRACE RPC';
      $('#diagnosis p').textContent=current.note;
      $('#lookup-result').hidden=false;$('#copy').disabled=false;
      const external=$('#external-explorer');external.href=`https://explorer.solana.com/tx/${encodeURIComponent(signature)}${network==='devnet'?'?cluster=devnet':''}`;external.hidden=false;
      renderDetails();message('Transaction loaded. Data is returned by the selected RPC; times shown are block timestamps, not internal execution timings.');
    } catch(error){message(error.name==='AbortError'?'The request timed out. Please try again.':error instanceof TypeError?'Unable to reach the data service. Check your connection and retry.':error.message,true);}
    finally{$('#lookup-submit').disabled=false;form.removeAttribute('aria-busy');}
  });
  $('#copy').addEventListener('click',async()=>{if(!currentSignature)return;try{await navigator.clipboard.writeText(currentSignature);message('Transaction signature copied.');}catch(_){message('Clipboard access is unavailable. Select the signature to copy it.');}});
  window.addEventListener('pagehide',()=>controller?.abort());
  renderDetails();
})();
