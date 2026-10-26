import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
export async function readPublished(config,transport=fetch){
 try{
  const r=await transport(config.siteUrl+'/api/token',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  const value=await r.json();
  if(!r.ok||value.symbol!=='SLOT'||!['pending','published'].includes(value.status))throw new Error();
  return value;
 }catch{throw new Error('Token API is unavailable. Deploy the token identity update before arming.');}
}
export function assertSameMint(existing,candidate){
 if(existing.mint&&existing.mint!==candidate.mint)throw new Error('A different mint is already published. Automatic replacement is blocked.');
}
export async function publishCandidate(candidate,config,root,{transport=fetch,run=runWrangler,env=process.env}={}){
 const existing=await readPublished(config,transport);assertSameMint(existing,candidate);
 if(existing.mint===candidate.mint)return;
 if(!env.CLOUDFLARE_API_TOKEN||!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID||''))throw new Error('Configure the Cloudflare account ID and API token in .env.launch.local.');
 const executable=resolve(root,'node_modules/wrangler/bin/wrangler.js');
 await access(executable).catch(()=>{throw new Error('Run npm install before publication; Wrangler is missing.');});
 // No shell interpolation. The public mint record travels over stdin, not argv.
 await run(executable,config.workerName,JSON.stringify(candidate),env);
 for(let attempt=0;attempt<30;attempt++){
  try{const current=await readPublished(config,transport);assertSameMint(current,candidate);if(current.mint===candidate.mint)return;}catch(error){if(error.message.includes('replacement'))throw error;}
  await sleep(2000);
 }
 throw new Error('Publication was submitted but is not yet visible. Keep the checkpoint and rerun watch to verify; do not change the mint.');
}
function runWrangler(executable,workerName,value,env){
 return new Promise((resolve,reject)=>{
  const processHandle=spawn(process.execPath,[executable,'secret','put','SLOT_TOKEN','--name',workerName],{env,stdio:['pipe','pipe','pipe'],windowsHide:true});
  processHandle.stdout.resume();processHandle.stderr.resume();
  let expired=false;
  const timer=setTimeout(()=>{expired=true;processHandle.kill();},90000);
  processHandle.on('error',()=>{clearTimeout(timer);reject(new Error('Could not start Wrangler.'));});
  processHandle.on('exit',code=>{clearTimeout(timer);if(code===0)resolve();else reject(new Error(expired?'Cloudflare publication timed out; verify the website before retrying.':'Cloudflare rejected publication. Check the API token permissions.'));});
  processHandle.stdin.on('error',()=>{});processHandle.stdin.end(value+'\n');
 });
}
