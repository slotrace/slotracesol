import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=await readFile(resolve(root,'dist/server/index.js'),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={};
try{for(const line of (await readFile(resolve(root,'.env.local'),'utf8')).replace(/^\uFEFF/,'').split(/\r?\n/)){const match=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(match)env[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');}}catch(error){if(error.code!=='ENOENT')throw error;}
const port=Number(process.env.PORT||4174);
createServer(async(incoming,outgoing)=>{
  try{
    const request=new Request(`http://127.0.0.1:${port}${incoming.url}`,{method:incoming.method,headers:incoming.headers});
    const response=await worker.fetch(request,env);
    outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
  }catch(_){outgoing.writeHead(500,{'Content-Type':'text/plain'});outgoing.end('Local server error');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
