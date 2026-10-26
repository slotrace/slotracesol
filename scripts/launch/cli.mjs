import {readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {createRpc,validateConfig,MAINNET,discoverSignatures,inspectSignature,verifyMintAccount,decode58} from './core.mjs';
import {readPublished,publishCandidate} from './publish.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const config=validateConfig(JSON.parse(await readFile(resolve(root,'launch.config.json'),'utf8')));
const command=process.argv[2],dry=process.argv.includes('--dry-run');
const stateFile=resolve(root,dry?'.launch-state.dry.json':'.launch-state.json'),lockFile=stateFile+'.lock';
const rpc=createRpc(process.env.SOLANA_RPC_URL);
let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
const log=text=>console.log(new Date().toISOString()+' '+text);
async function save(state){await writeFile(stateFile+'.tmp',JSON.stringify(state,null,2)+'\n',{mode:0o600});await rename(stateFile+'.tmp',stateFile);}
async function load(){try{return JSON.parse(await readFile(stateFile,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function preflight(requirePublish){
 if(await rpc('getGenesisHash')!==MAINNET)throw new Error('The RPC is not Solana Mainnet.');
 const status=await readPublished(config);
 if(requirePublish&&(!process.env.CLOUDFLARE_API_TOKEN||!process.env.CLOUDFLARE_ACCOUNT_ID))throw new Error('Cloudflare credentials are missing from .env.launch.local.');
 return status;
}
async function verify(candidate){return verifyMintAccount(await rpc('getAccountInfo',[candidate.mint,{encoding:'jsonParsed',commitment:'finalized'}]),candidate);}
async function main(){
 if(!['arm','watch','publish','status'].includes(command))throw new Error('Usage: arm | watch [--dry-run] | publish --signature SIGNATURE | status');
 const lock=await open(lockFile,'wx',0o600).catch(()=>{throw new Error('Another monitor may be running. If it crashed, check that it stopped before removing the .lock file.');});
 try{
  if(command==='status'){const state=await load();log(JSON.stringify({mode:dry?'dry-run':'publish',state:state||'not armed',website:await readPublished(config)}));return;}
  const website=await preflight(!dry);
  if(command==='arm'){
   if(await load())throw new Error('An arm checkpoint already exists. Use watch to resume; arming never overwrites it.');
   if(website.mint)throw new Error('A mint is already published.');
   const startSlot=await rpc('getSlot',[{commitment:'finalized'}]);
   await save({version:1,developer:config.developer,symbol:'SLOT',startSlot,armedAt:new Date().toISOString(),cursor:null,pending:[],candidates:[],published:null});
   log('ARMED at finalized slot '+startSlot+'. Start watch before launching SLOT on pump.fun.');return;
  }
  if(command==='publish'){
   const signature=process.argv[process.argv.indexOf('--signature')+1];
   if(!process.argv.includes('--signature')||decode58(signature).length!==64)throw new Error('Supply the pump.fun creation transaction signature.');
   const candidates=await inspectSignature(rpc,signature,config);
   if(!candidates||candidates.length!==1)throw new Error('This transaction does not uniquely create SLOTRACE / SLOT with the configured developer.');
   const candidate=await verify(candidates[0]);
   if(dry){log('VERIFIED (dry-run) '+JSON.stringify(candidate));return;}
   await publishCandidate(candidate,config,root);log('PUBLISHED '+candidate.mint+' on '+config.siteUrl);return;
  }
  const state=await load();
  if(!state||state.developer!==config.developer||state.symbol!=='SLOT')throw new Error('Run arm before the token launch.');
  if(state.published){log('Already published '+state.published.mint);return;}
  let failures=0;
  log('WATCHING '+config.developer+' / pump.fun / SLOTRACE / SLOT'+(dry?' / DRY RUN':''));
  while(!stopping){
   try{
    const found=await discoverSignatures(rpc,config,state);
    const pendingSet=new Set(state.pending);
    for(const row of found.rows)if(!row.err&&!pendingSet.has(row.signature)){state.pending.push(row.signature);pendingSet.add(row.signature);}
    state.cursor=found.cursor;
    await save(state); // Store the queue before moving the cursor past a transaction.
    for(const signature of [...state.pending]){
     if(stopping)break;
     const candidates=await inspectSignature(rpc,signature,config);
     if(candidates===null)continue; // Provider indexing can lag even finalized history.
     for(const candidate of candidates)if(!state.candidates.some(c=>c.mint===candidate.mint)){state.candidates.push(candidate);log('MATCH '+candidate.mint+' in '+signature);}
     state.pending.splice(state.pending.indexOf(signature),1);await save(state);
    }
    if(state.candidates.length>1)throw new Error('Multiple matching SLOT mints detected. Automatic publication is blocked; manual review required.');
    if(!state.pending.length&&state.candidates.length===1&&!stopping){
     const candidate=await verify(state.candidates[0]);
     if(dry){log('VERIFIED; dry-run made no website changes: '+candidate.mint);return;}
     await publishCandidate(candidate,config,root);
     state.published=candidate;await save(state);log('PUBLISHED and verified on '+config.siteUrl+': '+candidate.mint);return;
    }
    failures=0;
   }catch(error){
    if(!error.message.startsWith('RPC '))throw error;
    failures++;log(error.message+' Retrying ('+failures+'/20).');if(failures>=20)throw new Error('RPC repeatedly failed. Check the provider, then resume watch from the saved checkpoint.');
   }
   await sleep(failures?Math.min(30000,config.pollMs*failures):config.pollMs);
  }
  log('Stopped. Checkpoint preserved.');
 }finally{await lock.close();await unlink(lockFile);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
