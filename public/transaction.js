'use strict';
// Pure RPC normalization shared by the browser and Node's unit tests.
((root) => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function validSignature(value) {
    if (typeof value !== 'string' || value.length < 64 || value.length > 88) return false;
    let number = 0n;
    for (const char of value) { const digit = alphabet.indexOf(char); if (digit < 0) return false; number = number * 58n + BigInt(digit); }
    let bytes = 0; while (number > 0n) { bytes++; number >>= 8n; }
    const leading = value.match(/^1*/)[0].length;
    return bytes + leading === 64;
  }
  function normalizeTransaction(record) {
    if (!record || !record.transaction?.message || !Number.isSafeInteger(record.slot)) throw new Error('The RPC returned an incomplete transaction record.');
    const meta = record.meta;
    const message = record.transaction.message;
    const accounts = (message.accountKeys || []).map(a => typeof a === 'string' ? {pubkey:a, signer:null, writable:null} : a);
    const instructions = message.instructions || [];
    const describe = (instruction, index) => {
      const program = instruction.program || instruction.programId || accounts[instruction.programIdIndex]?.pubkey || 'Unknown program';
      const type = instruction.parsed?.type;
      return `${index + 1}. ${program}${type ? ' / ' + type : ''}`;
    };
    const instructionRows = [];
    instructions.forEach((instruction, index) => {
      instructionRows.push(describe(instruction, index));
      if (instruction.parsed?.info) instructionRows.push(JSON.stringify(instruction.parsed.info));
      if (instruction.data) instructionRows.push('Encoded instruction data: ' + instruction.data);
      const inner = meta?.innerInstructions?.find(group => group.index === index);
      inner?.instructions.forEach((item, i) => instructionRows.push('  ↳ ' + describe(item, i)));
    });
    const error = meta?.err ?? null;
    return {
      slot: record.slot,
      blockTime: typeof record.blockTime === 'number' ? record.blockTime : null,
      status: !meta ? 'Metadata unavailable' : error ? 'Execution failed' : 'Executed successfully',
      error, instructions: instructions.length,
      compute: Number.isFinite(meta?.computeUnitsConsumed) ? String(meta.computeUnitsConsumed) : 'Not reported',
      fee: Number.isFinite(meta?.fee) ? `${(meta.fee / 1e9).toFixed(9).replace(/0+$/, '').replace(/\.$/, '')} SOL` : 'Not reported',
      logs: Array.isArray(meta?.logMessages) ? meta.logMessages : ['Program logs were not returned by this RPC provider.'],
      instructionRows: instructionRows.length ? instructionRows : ['No instructions returned.'],
      accounts: accounts.map(a => `${a.pubkey}${a.signer ? ' / signer' : ''}${a.writable ? ' / writable' : ''}`),
      note: !meta ? 'Execution metadata is unavailable. No execution outcome can be inferred.' : error ? 'RPC execution error: ' + JSON.stringify(error) : 'The available RPC metadata reports successful execution. Instruction details and raw logs are shown as returned by the provider.'
    };
  }
  const api = {validSignature, normalizeTransaction};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlotraceTransaction = api;
})(typeof window !== 'undefined' ? window : globalThis);
