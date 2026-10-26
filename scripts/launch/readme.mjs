import {readPublished} from './publish.mjs';
import {publicKey,decode58} from './core.mjs';
const START='<!-- SLOT_CONTRACT_START -->',END='<!-- SLOT_CONTRACT_END -->';
export function contractBlock(token,config){
 if(token.status!=='published'||token.symbol!=='SLOT'||token.developer!==config.developer||token.platform!=='pump.fun'||!publicKey(token.mint)||decode58(token.signature).length!==64)throw new Error('No verified SLOT identity is published on the website.');
 return `${START}\n**Contract (Solana mint):**\n\n\`${token.mint}\`\n\n[Solana Explorer](https://explorer.solana.com/address/${token.mint}) · [pump.fun](https://pump.fun/coin/${token.mint})\n${END}`;
}
export function replaceContract(readme,block){
 if(readme.split(START).length!==2||readme.split(END).length!==2)throw new Error('README contract markers are missing or ambiguous.');
 const a=readme.indexOf(START),b=readme.indexOf(END)+END.length;
 if(b<a)throw new Error('Invalid README contract markers.');
 const current=readme.slice(a,b),existing=current.match(/`([1-9A-HJ-NP-Za-km-z]{32,44})`/);
 if(existing&&!block.includes('`'+existing[1]+'`'))throw new Error('README contains a different mint; replacement is blocked.');
 return readme.slice(0,a)+block+readme.slice(b);
}
export async function syncReadme(config,{env=process.env,transport=fetch}={}){
 const token=await readPublished(config,transport);
 if(token.status==='pending')return 'pending';
 const block=contractBlock(token,config);
 if(!env.GITHUB_TOKEN)return 'needs-github-token';
 const url='https://api.github.com/repos/slotrace/slotracesol/contents/README.md';
 const headers={Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 let r,payload;
 try{r=await transport(url+'?ref=main',{headers,signal:AbortSignal.timeout(15000)});payload=await r.json();}catch{throw new Error('Could not read GitHub README.');}
 if(!r.ok||typeof payload.content!=='string')throw new Error('GitHub README read failed (HTTP '+r.status+').');
 const current=Buffer.from(payload.content,'base64').toString('utf8'),next=replaceContract(current,block);
 if(next===current)return 'unchanged';
 try{r=await transport(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({branch:'main',sha:payload.sha,message:'Publish verified SLOT mint in README',content:Buffer.from(next).toString('base64')})});}catch{throw new Error('GitHub README update request failed.');}
 if(!r.ok)throw new Error('GitHub README update failed (HTTP '+r.status+'); no forced overwrite was attempted.');
 return 'updated';
}
