import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*\/\* ----[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g, '');
const text = 'Preliminary results suggest you are still here.';
function harness({roll = 0.2, reduce = false, light = false, storage = new Map(), session = new Map(), blocked = false, fontsPending = false} = {}) {
  let time = 0, seq = 0, seed = 1123, first = true;
  const timers = new Map(), history = [];
  function element(id) {
    let value = '';
    const classes = new Set(), listeners = {};
    return {id, tagName: 'DIV', inert: false, parentNode: {removeChild(el) {el.removed = true;}},
      get textContent() {return value;}, set textContent(v) {value = v; if (id === 'gate-line') history.push(v);},
      classList: {add(...v) {v.forEach(x => classes.add(x));}, remove(...v) {v.forEach(x => classes.delete(x));}, contains(v) {return classes.has(v);}},
      addEventListener(k, fn) {listeners[k] = fn;}, focus() {doc.activeElement = this;},
      fire(k, e = {}) {listeners[k]?.(e);}
    };
  }
  const ids = Object.fromEntries(['gate', 'gate-line', 'gate-sr', 'gate-ok', 'gate-stfu'].map(id => [id, element(id)]));
  const acts = element('actions'), background = element('background'), destination = element('destination');
  let fontReady;
  const doc = {getElementById(id) {return ids[id];}, readyState: 'complete',
    documentElement: element('html'), body: {children: [...Object.values(ids).filter(e => e.id === 'gate'), background]},
    querySelector(s) {return s === '.gate-actions' ? acts : destination;}, querySelectorAll() {return [];},
    fonts: {ready: {then(fn) {if (fontsPending) fontReady = fn; else fn();}}}
  };
  const mediaListeners = [];
  const win = {matchMedia(q) {return {matches: q.includes('reduced') ? reduce : light, addEventListener(_, fn) {mediaListeners.push(fn);}};},
    setTimeout(fn, delay) {timers.set(++seq, {fn, at: time + delay}); return seq;}, clearTimeout(id) {timers.delete(id);}, addEventListener() {}};
  const store = map => ({getItem(k) {if (blocked) throw Error('Blocked'); return map.get(k) ?? null;}, setItem(k,v) {if (blocked) throw Error('Blocked'); map.set(k,v);}});
  const math = Object.create(Math);
  math.random = () => {if (first) {first = false; return roll;} seed = (seed * 16807) % 2147483647; return seed / 2147483647;};
  const context = vm.createContext({window: win, document: doc, Math: math, localStorage: store(storage), sessionStorage: store(session)});
  const instrumented = script.replace('typeLine(pickLine());', 'window.testApi = {typeLine, typeNow, rollMood, makeTypo, pickLine, pickExit, pickBurst, dismiss, GENERAL, LIGHTMODE, get EXIT_TIERS() { return EXIT_TIERS; }};');
  vm.runInContext(instrumented, context);
  function tick() {
    if (!timers.size) return false;
    const [id, task] = [...timers].sort((a,b) => a[1].at - b[1].at || a[0] - b[0])[0];
    timers.delete(id); time = task.at; task.fn(); return true;
  }
  function drain() {let limit = 10000; while (tick()) if (!--limit) throw Error('Infinite sequence');}
  function until(predicate) {let limit = 10000; while (!predicate()) {if (!tick() || !--limit) throw Error('State not reached');}}
  return {api: win.testApi, ids, acts, history, timers, session, storage, win, doc, background, destination,
    drain, until, get time() {return time;}, random(value) {first = false; math.random = () => value;},
    fontsReady() {fontReady?.();}, reduceNow() {reduce = true; mediaListeners.forEach(fn => fn({matches: true}));}};
}

test('all probability tiers are reachable and restore the exact original string', () => {
  for (const [roll, typos, phrase] of [[0.2,0,null],[0.8,1,null],[0.92,2,null],[0.98,2,'...damn'],[0.995,3,'...shit']]) {
    const h = harness({roll});
    h.api.typeNow(text, false);
    assert(h.acts.classList.contains('gate-actions--both'), 'buttons are available from the start');
    h.drain();
    assert.equal(h.ids['gate-line'].textContent, text);
    assert.equal(h.ids['gate-line'].classList.contains('typing'), false);
    const mistakes = h.history.filter((s,i) => i && s.length < h.history[i-1].length).length;
    assert(typos ? mistakes > 0 : mistakes === 0);
    if (phrase) assert(h.history.some(s => s.endsWith(phrase)), phrase + ' was shown');
    assert(!h.ids['gate-line'].textContent.includes('...'));
    if (typos) assert(h.time > 3000, 'no total three-second cap');
  }
});

test('a long normal line takes its natural duration rather than truncating at three seconds', () => {
  const h = harness({roll:0.2});
  const long = 'This website has prepared a small ceremony for your arrival. Please pretend it matters.';
  h.api.typeNow(long,false); h.drain();
  assert(h.time > 3000); assert.equal(h.ids['gate-line'].textContent,long);
});

test('Whatever and non-swear frustration variants are reachable and erased', () => {
  const whatever=harness({roll:0.9985}); whatever.api.typeNow(text,false); whatever.drain();
  assert(whatever.history.some(s=>s.endsWith(' Whatever.')));
  assert.equal(whatever.ids['gate-line'].textContent,text);
  const burst=harness({roll:0.9995,session:new Map([['gate.damn','1'],['gate.swear','1']])});
  burst.api.typeNow(text,false); burst.drain();
  assert(burst.history.some(s=>['nope.','again?','close enough—','I can type.','apparently not.','one more time.','let’s pretend that didn’t happen.','you saw nothing.'].some(p=>s.endsWith(p))));
  assert.equal(burst.ids['gate-line'].textContent,text);
});

test('repeated errors really occur, including a sentence with only one eligible word', () => {
  const h = harness({roll: 0.98});
  h.api.typeNow('website.', false); h.drain();
  const erasures = h.history.filter((s,i) => i && s === '' && h.history[i-1].length > 0);
  assert.equal(erasures.length, 2);
  assert(h.history.some(s => s.endsWith('...damn')));
  assert.equal(h.ids['gate-line'].textContent, 'website.');
});

test('natural typo kinds change a word and protected words never receive typos', () => {
  const h = harness();
  for (const r of [0.2,0.5,0.8,0.9]) {
    h.random(r);
    const tp = h.api.makeTypo('research',0);
    assert.notEqual(tp.err, tp.correct);
    assert(/^[a-z]+$/.test(tp.err));
  }
  const p = harness({roll:0.995});
  p.api.typeNow('JavaScript NeuroAI Reviewer PDF AI CV STFU.',false); p.drain();
  assert(!p.history.some(s => s.includes('...shit')));
  assert.equal(p.ids['gate-line'].textContent, 'JavaScript NeuroAI Reviewer PDF AI CV STFU.');
});

test('session limits prevent repeat damn and shit on later loads', () => {
  const session = new Map();
  for (const roll of [0.98,0.995,0.98,0.995]) {
    const h = harness({roll,session}); h.api.typeNow(text,false); h.drain();
    const phrase = roll === 0.98 ? '...damn' : '...shit';
    if (session.size === 2 && roll === 0.98) assert(!h.history.some(s => s.endsWith(phrase)));
  }
  assert.equal(session.get('gate.damn'),'1'); assert.equal(session.get('gate.swear'),'1');
  const h = harness({session}); h.random(0);
  assert(!['…damn','…shit'].includes(h.api.pickBurst()));
});

test('okay and STFU cancel typing and delayed font readiness cannot restart it', () => {
  for (const stfu of [false,true]) {
    const h = harness({roll:0.995}); h.api.typeNow(text,false);
    h.api.dismiss(stfu); const atClick = h.ids['gate-line'].textContent; h.drain();
    assert.equal(h.ids['gate-line'].textContent,atClick);
    assert.equal(h.timers.size,0); assert.equal(h.background.inert,false);
    assert.equal(h.doc.activeElement,h.destination);
  }
  const h = harness({fontsPending:true}); h.api.typeLine(text); h.api.dismiss(false);
  h.fontsReady(); h.drain(); assert.equal(h.timers.size,0); assert(!h.history.includes(text));
});

test('STFU during swearing leaves the phrase alone, counts once, and dismisses', () => {
  const h = harness({roll:0.995}); let clicks=0; h.win.recordStfu=()=>clicks++;
  h.api.typeNow(text,false); h.until(()=>h.ids['gate-line'].textContent.endsWith('...shit'));
  const before=h.ids['gate-line'].textContent;
  h.api.dismiss(true); h.api.dismiss(true); h.drain();
  assert.equal(clicks,1); assert.equal(h.ids['gate-line'].textContent,before); assert(h.ids.gate.removed);
});

test('reduced motion is static, and a mid-animation preference change stops all typing', () => {
  const h=harness({reduce:true,roll:0.995}); h.api.typeLine(text);
  assert.equal(h.ids['gate-line'].textContent,text); assert.equal(h.timers.size,0);
  const p=harness({roll:0.995}); p.api.typeLine(text); p.reduceNow(); p.drain();
  assert.equal(p.ids['gate-line'].textContent,text); assert.equal(p.timers.size,0);
});

test('STFU reply tiers, rare replies, silence and the occasional okay reply are reachable', () => {
  const h=harness(); const seen=new Set();
  h.api.EXIT_TIERS.forEach((tier,i)=>{
    for(let n=0;n<tier.lines.length;n++) seen.add(h.api.pickExit(i));
    for(const phrase of tier.lines) assert(seen.has(phrase));
  });
  assert.equal(seen.size,65);
  const silent=harness(); silent.random(0.1); silent.api.dismiss(true);
  assert(silent.ids.gate.classList.contains('gate--open'));
  const okay=harness(); okay.random(0.01); okay.api.dismiss(false);
  assert.equal(okay.ids['gate-line'].textContent,'bold.');
});

test('light-only text stays in the light pool; storage corruption or blocking is harmless', () => {
  const storage=new Map(); const h=harness({light:true,storage});
  const general=[...h.api.GENERAL].flatMap(g=>[...g.lines]);
  const light=[...h.api.LIGHTMODE].flatMap(g=>[...g.lines]);
  assert.equal(general.length,81); assert.equal(light.length,26);
  h.random(0.1); assert(light.includes(h.api.pickLine()));
  h.random(0.9); for(let i=0;i<30;i++) assert(general.includes(h.api.pickLine()));
  const dark=harness({storage,light:false}); dark.random(0.1);
  for(let i=0;i<30;i++) assert(general.includes(dark.api.pickLine()));
  for(const value of ['null','true','123','{}']) {
    const corrupt=harness({storage:new Map([['gate.recent.v1',value],['gate.bag.v4',value],['gate.exit.v2',value]])});
    assert(corrupt.api.pickLine()); assert(corrupt.api.pickExit());
  }
  const blocked=harness({blocked:true}); assert(blocked.api.pickLine()); assert(blocked.api.pickExit());
});

test('screen readers receive the correct full line; Tab stays in dialog and Escape exits', () => {
  const h=harness({roll:0.995}); h.api.typeLine(text);
  assert.equal(h.ids['gate-sr'].textContent,text);
  assert(html.includes('id="gate-line" aria-hidden="true"'));
  h.ids['gate-ok'].focus(); h.ids.gate.fire('keydown',{key:'Tab',preventDefault(){}});
  assert.equal(h.doc.activeElement,h.ids['gate-stfu']);
  h.ids.gate.fire('keydown',{key:'Escape',preventDefault(){}}); h.drain(); assert(h.ids.gate.removed);
});
