// The asset table is embedded by build-worker.mjs; no credentials are compiled in.
const requestWindows = new Map();
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function validSignature(value){
  if(typeof value!=='string'||value.length<64||value.length>88)return false;
  const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n;
  for(const c of value){const d=alphabet.indexOf(c);if(d<0)return false;n=n*58n+BigInt(d);}
  let bytes=0;while(n>0n){bytes++;n>>=8n;}return bytes+value.match(/^1*/)[0].length===64;
}
function allowRequest(request){
  const now=Date.now(),key=request.headers.get('CF-Connecting-IP')||'local';
  let entry=requestWindows.get(key);
  if(!entry||entry.until<now){entry={count:0,until:now+60000};requestWindows.set(key,entry);}
  if(requestWindows.size>1024){for(const [ip,item] of requestWindows){if(item.until<now)requestWindows.delete(ip);}if(requestWindows.size>1024)requestWindows.delete(requestWindows.keys().next().value);}
  return ++entry.count<=30;
}
export async function transactionResponse(request,env={},upstreamFetch=fetch){
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  const url=new URL(request.url),network=url.searchParams.get('network')||'mainnet',signature=url.searchParams.get('signature');
  if(!['mainnet','devnet'].includes(network))return json({error:'Unsupported network.'},400);
  if(!validSignature(signature))return json({error:'Invalid transaction signature.'},400);
  if(!allowRequest(request))return json({error:'Too many requests. Please wait a minute.'},429);
  const endpoint=network==='mainnet'?env.SOLANA_RPC_URL:env.SOLANA_DEVNET_RPC_URL||'https://api.devnet.solana.com';
  if(!endpoint)return json({error:'The network data service is not configured.'},503);
  let parsed;try{parsed=new URL(endpoint);if(parsed.protocol!=='https:')throw new Error();}catch(_){return json({error:'The network data service is not configured correctly.'},503);}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
  try{
    const response=await upstreamFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTransaction',params:[signature,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:1}]})});
    if(!response.ok)return json({error:response.status===429?'The data provider is busy. Please retry shortly.':'The data provider could not complete this request.'},response.status===429?429:502);
    const payload=await response.json();
    // Provider messages can include private URLs. Never forward them to clients.
    if(payload.error)return json({error:payload.error.code===-32015?'The data provider returned an unsupported transaction version.':'The data provider rejected this transaction request.',code:typeof payload.error.code==='number'?payload.error.code:undefined},502);
    if(!Object.hasOwn(payload,'result'))return json({error:'The data provider returned an incomplete response.'},502);
    return json({result:payload.result,provider:'SLOTRACE RPC',network});
  }catch(error){return json({error:error.name==='AbortError'?'The data request timed out. Please retry.':'The data provider is temporarily unavailable.'},502);}
  finally{clearTimeout(timeout);}
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/transaction')return transactionResponse(request,env);
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
    let path;try{path=decodeURIComponent(url.pathname);}catch(_){return new Response('Bad request',{status:400});}
    if(!path.endsWith('/')&&Object.hasOwn(STATIC_ASSETS,path+'/index.html'))return Response.redirect(url.origin+path+'/'+url.search,308);
    if(path.endsWith('/'))path+='index.html';
    const asset=STATIC_ASSETS[path];
    if(!asset)return new Response('Page not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    const body=asset.binary?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
    return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':asset.type,'Cache-Control':path.endsWith('.html')?'no-cache':'public, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
  }
};
