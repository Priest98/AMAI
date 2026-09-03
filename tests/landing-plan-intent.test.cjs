const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../apps/web/src/lib/plan-intent.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(search='',saved=null,blocked=false){const store=new Map(saved?[['oyinca_selected_plan',JSON.stringify(saved)]]:[]);const location={search,href:'http://localhost:3000/register'+search};const context={exports:{},URL,URLSearchParams,Date,window:{location,history:{state:{},replaceState(_state,_title,url){location.href=String(url);location.search=new URL(url).search}}},localStorage:{getItem(k){if(blocked)throw Error('blocked');return store.get(k)||null},setItem(k,v){if(blocked)throw Error('blocked');store.set(k,v)},removeItem(k){if(blocked)throw Error('blocked');store.delete(k)}}};vm.runInNewContext(code,context);return {...context.exports,store,location}}
test('paid selection survives a new auth page and leads to review, not checkout',()=>{const a=load('?plan=CREATOR');assert.equal(a.getSelectedPlan(),'CREATOR');const saved=JSON.parse(a.store.get('oyinca_selected_plan'));const b=load('',saved);assert.equal(b.planDestination(),'/dashboard/settings?tab=billing&plan=CREATOR')});
test('free selection clears earlier paid intent',()=>{const a=load('?plan=FREE',{plan:'PRO',expires:Date.now()+10000});assert.equal(a.getSelectedPlan(),null);assert.equal(a.store.size,0)});
test('untrusted plan values cannot redirect visitors',()=>{const a=load('?plan=https://example.com');assert.equal(a.planDestination(),'/dashboard');assert.equal(a.store.size,0)});
test('expired choices do not redirect returning users',()=>{const a=load('',{plan:'AGENCY',expires:1});assert.equal(a.getSelectedPlan(),null);assert.equal(a.store.size,0)});
test('dismissal clears the query as well as stored intent',()=>{const a=load('?plan=PRO');a.getSelectedPlan();a.clearSelectedPlan();assert.equal(a.getSelectedPlan(),null);assert.equal(a.location.search,'')});
test('blocked browser storage does not break signup',()=>{const a=load('?plan=PRO',null,true);assert.equal(a.getSelectedPlan(),'PRO');assert.equal(a.planDestination(),'/dashboard/settings?tab=billing&plan=PRO')});
