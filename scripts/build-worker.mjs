import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),publicRoot=resolve(root,'public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.cur':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const assets={};
async function collect(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=resolve(directory,entry.name);
    if(entry.isDirectory())await collect(path);
    else{
      const extension=extname(path);if(!types[extension])throw new Error('Unexpected public file type: '+extension);
      const binary=['.png','.cur'].includes(extension),bytes=await readFile(path);
      assets['/'+relative(publicRoot,path).replaceAll('\\','/')]={type:types[extension],binary,body:bytes.toString(binary?'base64':'utf8')};
    }
  }
}
await collect(publicRoot);
const worker=await readFile(resolve(root,'worker/index.mjs'),'utf8');
await mkdir(resolve(root,'dist/server'),{recursive:true});await mkdir(resolve(root,'dist/.openai'),{recursive:true});
await writeFile(resolve(root,'dist/server/index.js'),'const STATIC_ASSETS='+JSON.stringify(assets)+';\n'+worker);
let manifest={};try{manifest=JSON.parse(await readFile(resolve(root,'.openai/hosting.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
delete manifest.static;
await writeFile(resolve(root,'dist/.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Built Worker with ${Object.keys(assets).length} public assets; secrets are runtime-only.`);
