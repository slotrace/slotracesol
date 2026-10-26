import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(typeof worker?.fetch,'function');
for(const path of ['/','/explorer/','/token/','/docs/','/docs/search-index.json','/mark.svg']){
  const response=await worker.fetch(new Request('https://slotrace.example'+path),{});
  assert.equal(response.status,200,path);
}
assert.equal((await worker.fetch(new Request('https://slotrace.example/not-a-page'),{})).status,404);
assert.equal((await worker.fetch(new Request('https://slotrace.example/api/transaction?signature=invalid'),{})).status,400);
assert.equal((await worker.fetch(new Request('https://slotrace.example/.env.local'),{})).status,404);
console.log('Worker export, page routes, API validation and secret-file isolation passed.');
