import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transactionResponse} from '../worker/index.mjs';
const signature='1'.repeat(64);
const request=(query='network=mainnet&signature='+signature,method='GET')=>new Request('https://slotrace.example/api/transaction?'+query,{method});
test('invalid input never reaches an upstream',async()=>{
  let called=false;const response=await transactionResponse(request('network=mainnet&signature=bad'),{},async()=>{called=true;});
  assert.equal(response.status,400);assert.equal(called,false);
});
test('unsupported networks and methods are rejected',async()=>{
  assert.equal((await transactionResponse(request('network=other&signature='+signature))).status,400);
  assert.equal((await transactionResponse(request(undefined,'POST'))).status,405);
});
test('missing runtime secret reports unavailable service',async()=>assert.equal((await transactionResponse(request())).status,503));
test('private upstream URL and provider errors never reach the client',async()=>{
  const secret='https://private.example/key-only-for-this-test';
  const response=await transactionResponse(request(),{SOLANA_RPC_URL:secret},async()=>new Response(JSON.stringify({error:{code:-1,message:'Rejected '+secret}})));
  const body=await response.text();assert.equal(response.status,502);assert.equal(body.includes(secret),false);assert.match(body,/rejected/);
});
test('server fixes the RPC method and returns actual record data',async()=>{
  let body;
  const response=await transactionResponse(request(),{SOLANA_RPC_URL:'https://provider.example'},async(url,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({result:{slot:123}}));});
  assert.equal(body.params[1].maxSupportedTransactionVersion,1);
  assert.equal(body.method,'getTransaction');assert.equal(body.params[0],signature);assert.deepEqual((await response.json()).result,{slot:123});
});
test('null RPC records remain null rather than becoming failure claims',async()=>{
  const response=await transactionResponse(request(),{SOLANA_RPC_URL:'https://provider.example'},async()=>new Response(JSON.stringify({result:null})));
  assert.equal((await response.json()).result,null);
});
