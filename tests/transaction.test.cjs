const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validSignature,normalizeTransaction}=require('../public/transaction.js');
test('signature validation checks base58 and decoded byte length',()=>{
  assert.equal(validSignature('H9fNzQz3hCgCvkmWDFutBqqB8hhZA29UefBuxsTGc77GRA6FdpP4CeqrP9N4ETB6dBV3wZuNarkeDJ1GwvyG9c4'),true);
  assert.equal(validSignature('1'.repeat(64)),true);
  assert.equal(validSignature('1'.repeat(65)),false);
  assert.equal(validSignature('0'.repeat(88)),false);
  assert.equal(validSignature('wallet_address'),false);
});
const base={slot:123,blockTime:1700000000,transaction:{message:{accountKeys:[{pubkey:'sender',signer:true,writable:true}],instructions:[{program:'system',parsed:{type:'transfer',info:{lamports:1}}}]}},meta:{err:null,fee:5000,computeUnitsConsumed:150,logMessages:['Program success'],innerInstructions:[]}};
test('normalization preserves provider values and exact fee units',()=>{
  const r=normalizeTransaction(base);assert.equal(r.fee,'0.000005 SOL');assert.equal(r.compute,'150');assert.equal(r.instructions,1);assert.equal(r.status,'Executed successfully');assert.match(r.accounts[0],/sender \/ signer \/ writable/);
});
test('missing metadata never fabricates a successful outcome',()=>{
  const r=normalizeTransaction({...base,meta:null,blockTime:null});assert.equal(r.status,'Metadata unavailable');assert.equal(r.fee,'Not reported');assert.equal(r.blockTime,null);
});
test('execution errors retain their raw evidence without guessing a cause',()=>{
  const r=normalizeTransaction({...base,meta:{...base.meta,err:{InstructionError:[0,{Custom:6001}]}}});assert.equal(r.status,'Execution failed');assert.match(r.note,/6001/);assert.doesNotMatch(r.note,/slippage/);
});
test('inner instructions stay associated with their parent instruction',()=>{
  const r=normalizeTransaction({...base,meta:{...base.meta,innerInstructions:[{index:0,instructions:[{programId:'program-X',data:'ABC'}]}]}});assert.match(r.instructionRows.join('\n'),/↳ 1\. program-X/);
});
test('incomplete records are rejected',()=>assert.throws(()=>normalizeTransaction({slot:123}),/incomplete/));
