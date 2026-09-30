import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/js/gate-layout.js',import.meta.url),'utf8');
function setup(width=200) {
  function node(){return {clientWidth:width,rows:[],textContent:'',classList:{add(){},remove(){},toggle(){}},replaceChildren(){this.rows=[];},appendChild(row){this.rows.push(row);}};}
  const window={addEventListener(){},removeEventListener(){}}, element=node();
  vm.runInNewContext(source,{window,innerWidth:300,getComputedStyle(){return {fontStyle:'normal',fontWeight:'400',fontSize:'30px',fontFamily:'serif'};},
    document:{createElement(type){return type==='canvas'?{getContext(){return {measureText(s){return {width:s.length*10};}};}}:node();}},setTimeout,clearTimeout});
  return {window,element};
}
test('punctuation-aware lines preserve every original character and fit the measured width',()=>{
  const {window}=setup(),text='Research results. Everything continues, with proper punctuation.';
  const cuts=window.GateLinePlan(text,s=>s.length*10,190);let start=0,chunks=[];
  for(const end of cuts){chunks.push(text.slice(start,end));start=end;}
  assert.equal(chunks.join(''),text);assert.equal(chunks[0],'Research results. ');
  assert(chunks.every(s=>s.trim().length*10<=190));
});
test('extra or missing typo characters never replan the rows; correction restores exact content',()=>{
  const {window,element}=setup(),text='Research results. website content continues.';
  const paint=window.createGateLayout(element,text),rows=[...element.rows];
  for(const [err,delta] of [['websiite',1],['webste',-1],['webiste',0]]) {
    paint.replaceAt(18,25,delta);
    paint.textContent='Research results. '+err;
    assert.equal(element.rows[0].textContent,'Research results. ');
    assert.equal(element.rows[1].textContent,err);
    assert.deepEqual(element.rows,rows);
    paint.textContent='Research results. ';
    paint.clearReplacement();paint.textContent=text;
    assert.equal(element.rows.map(r=>r.textContent).join(''),text);
  }
});
test('frustration insertion does not move earlier completed lines',()=>{
  const {window,element}=setup(),text='Research results. website content continues.';
  const paint=window.createGateLayout(element,text);
  paint.replaceAt(25,25,7);paint.textContent='Research results. website...shit';
  assert.equal(element.rows[0].textContent,'Research results. ');
  paint.clearReplacement();paint.textContent=text;
  assert.equal(element.rows.map(r=>r.textContent).join(''),text);
});
