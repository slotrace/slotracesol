// Pump create/create_v2 layout: official pump-fun/pump-public-docs/idl/pump.json.
// Read-only transaction inspection. No wallet signing code or private keys.
export const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
export const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const MAINNET='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function decode58(value){
 if(typeof value!=='string'||value.length>6000)throw new Error('Invalid base58 data.');
 let n=0n;for(const c of value){const d=alphabet.indexOf(c);if(d<0)throw new Error('Invalid base58 data.');n=n*58n+BigInt(d);}
 const bytes=[];while(n){bytes.push(Number(n&255n));n>>=8n;}bytes.reverse();
 return Buffer.from([...new Array(value.match(/^1*/)[0].length).fill(0),...bytes]);
}
export function encode58(bytes){
 let n=0n;for(const b of bytes)n=(n<<8n)+BigInt(b);
 let out='';while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}
 let leading=0;while(leading<bytes.length&&bytes[leading]===0)leading++;
 return '1'.repeat(leading)+out;
}
export function publicKey(value){try{return decode58(value).length===32;}catch{return false;}}
export function validateConfig(config){
 if(!publicKey(config.developer)||config.platform!=='pump.fun'||config.symbol!=='SLOT'||config.expectedName!=='SLOTRACE')throw new Error('Launch identity configuration is invalid.');
 if(config.workerName!=='slotracesol'||config.siteUrl!=='https://slotrace.tech')throw new Error('Unexpected publication target.');
 if(!Number.isInteger(config.pollMs)||config.pollMs<1000||config.pollMs>30000)throw new Error('Invalid polling interval.');
 return config;
}
function decodeCreate(instruction){
 const data=decode58(instruction.data),discriminator=data.subarray(0,8).toString('hex');
 const version=discriminator==='181ec828051c0777'?'create':discriminator==='d6904cec5f8b31b4'?'create_v2':null;
 if(!version)return null;
 let offset=8;
 function string(max){
  if(offset+4>data.length)throw new Error('Truncated pump.fun create instruction.');
  const size=data.readUInt32LE(offset);offset+=4;
  if(size>max||offset+size>data.length)throw new Error('Invalid pump.fun metadata length.');
  const value=new TextDecoder('utf-8',{fatal:true}).decode(data.subarray(offset,offset+size));offset+=size;
  return value;
 }
 const name=string(256),symbol=string(32);string(2048);
 if(offset+32>data.length)throw new Error('Missing pump.fun creator.');
 return {kind:version,name,symbol,creator:encode58(data.subarray(offset,offset+32)),userIndex:version==='create'?7:5,tokenIndex:version==='create'?9:7};
}
export function extractLaunches(record,config){
 if(!record?.meta||record.meta.err!==null||!Number.isSafeInteger(record.slot))return [];
 const keys=record.transaction?.message?.accountKeys||[];
 if(!keys.some(k=>k.pubkey===config.developer&&k.signer===true))return [];
 const all=[...(record.transaction.message.instructions||[]),...(record.meta.innerInstructions||[]).flatMap(g=>g.instructions||[])];
 const results=[];
 for(const instruction of all){
  if(instruction.programId!==PUMP||typeof instruction.data!=='string')continue;
  const creation=decodeCreate(instruction);if(!creation)continue;
  const accounts=instruction.accounts;
  if(!Array.isArray(accounts)||accounts[creation.userIndex]!==config.developer||creation.creator!==config.developer)continue;
  if(creation.name!==config.expectedName||creation.symbol!==config.symbol)continue;
  const mint=accounts[0],tokenProgram=accounts[creation.tokenIndex];
  if(!publicKey(mint)||tokenProgram!==(creation.kind==='create'?TOKEN:TOKEN_2022))throw new Error('Unexpected pump.fun mint layout; manual review required.');
  const initialized=all.some(i=>i.programId===tokenProgram&&['initializeMint','initializeMint2'].includes(i.parsed?.type)&&i.parsed.info?.mint===mint&&i.parsed.info?.decimals===6);
  if(!initialized)throw new Error('Matching pump.fun creation lacks verified mint initialization.');
  results.push({mint,tokenProgram,name:creation.name,symbol:'SLOT',developer:config.developer,platform:'pump.fun',slot:record.slot,signature:record.transaction.signatures[0],kind:creation.kind});
 }
 return [...new Map(results.map(r=>[r.mint,r])).values()];
}
export function verifyMintAccount(response,candidate){
 const info=response?.value?.data?.parsed;
 if(response?.value?.owner!==candidate.tokenProgram||info?.type!=='mint'||info.info?.decimals!==6||info.info?.isInitialized!==true)throw new Error('Mint account verification failed.');
 return candidate;
}
export function createRpc(endpoint,transport=fetch){
 let url;try{url=new URL(endpoint);}catch{throw new Error('Configure SOLANA_RPC_URL.');}
 if(url.protocol!=='https:')throw new Error('RPC must use HTTPS.');
 return async(method,params=[])=>{
  let response,payload;
  try{response=await transport(url.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000)});payload=await response.json();}catch{throw new Error('RPC request failed or timed out.');}
  if(!response.ok||payload.error||!Object.hasOwn(payload,'result'))throw new Error('RPC could not complete '+method+' (HTTP '+response.status+', code '+(Number.isInteger(payload.error?.code)?payload.error.code:'none')+').');
  return payload.result;
 };
}
// Page until the saved head (or initial arm slot). Never silently skip a gap.
export async function discoverSignatures(rpc,config,state){
 let before;const fresh=[];let boundary=false;
 for(let page=0;page<10;page++){
  const rows=await rpc('getSignaturesForAddress',[config.developer,{commitment:'finalized',limit:1000,...(before?{before}: {})}]);
  if(!Array.isArray(rows))throw new Error('Invalid signature history response.');
  if(!rows.length){if(state.cursor)throw new Error('Saved signature cursor is unavailable; manual review required.');boundary=true;break;}
  for(const row of rows){
   if(row.signature===state.cursor||(!state.cursor&&row.slot<=state.startSlot)){boundary=true;break;}
   if(state.cursor&&row.slot<state.startSlot)throw new Error('History gap detected; refusing to skip transactions.');
   fresh.push(row);
  }
  if(boundary)break;
  before=rows.at(-1).signature;
  if(rows.length<1000){if(state.cursor)throw new Error('Saved signature cursor was not found.');boundary=true;break;}
 }
 if(!boundary)throw new Error('More than 10,000 unseen transactions; manual review required.');
 return {cursor:fresh[0]?.signature||state.cursor,rows:fresh.reverse()};
}
export async function inspectSignature(rpc,signature,config){
 const record=await rpc('getTransaction',[signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:1}]);
 if(!record)return null;
 return extractLaunches(record,config);
}
