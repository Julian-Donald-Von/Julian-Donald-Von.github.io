import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import worker from '../counter/worker.mjs';
globalThis.crypto ??= webcrypto;
const origin='https://julian-donald-von.github.io';
function database() {
  const hashes=new Set();
  return {hashes, prepare(sql) {return {sql, bind(hash) {this.hash=hash; return this;}, async first() {return {count:hashes.size};}};},
    async batch(stmts) {hashes.add(stmts[0].hash); return [{success:true},{results:[{count:hashes.size}]}];}};
}
function req(path='/stfu',method='POST',headers={}) {
  return new Request('https://counter.example'+path,{method,headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1',...headers}});
}
test('unique IP hashes deduplicate concurrent clicks, GET never increments',async()=>{
  const DB=database(), env={DB,IP_SALT:'a'.repeat(64)};
  const responses=await Promise.all(Array.from({length:10},()=>worker.fetch(req(),env)));
  assert(responses.every(r=>r.ok)); assert.equal(DB.hashes.size,1);
  assert([...DB.hashes].every(h=>/^[a-f0-9]{64}$/.test(h)));
  await worker.fetch(req('/stfu','POST',{'CF-Connecting-IP':'2001:db8::1'}),env);
  const get=await worker.fetch(req('/count','GET'),env);
  assert.deepEqual(await get.json(),{count:2}); assert.equal(DB.hashes.size,2);
  assert.equal(get.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal(get.headers.get('Cache-Control'),'no-store');
});
test('missing IP, invalid origin, wrong method, and missing secret are rejected',async()=>{
  const env={DB:database(),IP_SALT:'a'.repeat(64)};
  for(const [r,status] of [[req('/count','POST'),405],[req('/other','GET'),404],
    [req('/stfu','POST',{Origin:'https://evil.example'}),403],
    [req('/stfu','POST',{'CF-Connecting-IP':''}),400],
    [req('/stfu','POST',{'CF-Connecting-IP':'unknown'}),400]]) {
    assert.equal((await worker.fetch(r,env)).status,status);
  }
  assert.equal((await worker.fetch(new Request('https://counter.example/stfu',{method:'POST'}),env)).status,403);
  assert.equal((await worker.fetch(req(),{DB:env.DB})).status,503);
  assert.equal((await worker.fetch(req('/stfu','OPTIONS'),env)).status,204);
  assert.equal(env.DB.hashes.size,0);
  const failing={IP_SALT:env.IP_SALT,DB:{prepare(){throw Error('private details');}}};
  const result=await worker.fetch(req('/count','GET'),failing);
  assert.deepEqual(await result.json(),{error:'Counter unavailable'});
});
test('frontend counter never blocks exit, never fabricates totals and ignores stale GET',async()=>{
  const source=readFileSync(new URL('../assets/js/stfu-counter.js',import.meta.url),'utf8');
  let el={textContent:'STFU consensus: unavailable'}, calls=[], pending=[], timers=new Map(), id=0;
  const win={STFU_COUNTER_URL:'https://counter.example'};
  const context={window:win,document:{getElementById(){return el;}},URL,AbortController,
    setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);},
    fetch(url,options){calls.push({url,options});return new Promise(resolve=>pending.push(resolve));}};
  vm.runInNewContext(source,context);
  win.recordStfu(); win.recordStfu(); assert.equal(calls.length,2);
  assert.equal(calls[1].options.keepalive,true);
  pending[1](Response.json({count:10})); await new Promise(resolve=>setImmediate(resolve));
  pending[0](Response.json({count:9})); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(el.textContent,'10 unique IPs told me to STFU'); assert.equal(timers.size,0);
  for(const base of ['', 'http://counter.example', 'https://secret@counter.example']) {
    const w={STFU_COUNTER_URL:base}; let fetched=false;
    vm.runInNewContext(source,{...context,window:w,fetch(){fetched=true;}}); assert.equal(fetched,false);
  }
  const bad={window:{STFU_COUNTER_URL:'https://counter.example'},...context};
  bad.window={STFU_COUNTER_URL:'https://counter.example'};
  el.textContent='STFU consensus: unavailable'; bad.fetch=async()=>Response.json({count:-1});
  vm.runInNewContext(source,bad); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(el.textContent,'STFU consensus: unavailable');
});
