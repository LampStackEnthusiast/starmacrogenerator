// node test-half-car.cjs — generator checks, no STAR installation required.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'full-car/index.html'),'utf8');
const elements={};
for(const match of html.matchAll(/<input\b([^>]*)>/g)){
 const attrs=match[1],id=attrs.match(/\bid="([^"]+)"/)[1];
 const value=(attrs.match(/\bvalue="([^"]*)"/)||[])[1]||'';
 elements[id]={value,defaultValue:value,checked:/\bchecked\b/.test(attrs),disabled:false,type:(attrs.match(/\btype="([^"]+)"/)||[])[1]||'text',checkValidity(){return this.value.trim()!==''&&Number.isFinite(Number(this.value));}};
}
for(const [id,value] of [['mode','auto'],['speedUnit','mph']])elements[id]={value};
const handlers={};let downloaded=null;
function element(id){
 const el=elements[id]||(elements[id]={value:'',hidden:true});
 el.addEventListener=(event,fn)=>{handlers[id+':'+event]=fn;};
 el.classList={toggle(){}};el.scrollIntoView=()=>{};
 return el;
}
const form=element('form');
form.querySelectorAll=()=>Object.values(elements).filter(x=>x.type==='number');
form.reset=()=>{for(const el of Object.values(elements))if('defaultValue' in el)el.value=el.defaultValue;};
const context={document:{getElementById:element,body:{append(){}},createElement(){return {click(){downloaded=this.download;},remove(){}};}},Blob:class{constructor(parts){this.parts=parts;}},URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},setTimeout(){}};
vm.createContext(context);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
const generate=()=>context.generate();
let code=generate();
assert.match(code,/public class LarryHalfCarSetup extends StarMacro/);
assert.doesNotMatch(code,/getInternalUnits|speedUnits|@@\w+@@/);
assert.match(code,/\.setComponents\(0, SPEED, 0\)/);
assert.match(code,/\.setValue\(SPEED\)/);
assert.ok(code.indexOf('Units m =')>code.indexOf('b = readRefinementBounds'));
assert.match(code,/traceBegin/);assert.match(code,/traceEnd/);
for(const name of ['TeamRun','Wing_2027.java','Run42.JAVA']){
 elements.filename.value=name;
 const className=name.replace(/\.java$/i,'');
 assert.ok(generate().includes('public class '+className+' extends StarMacro'));
 handlers['download:click']();assert.equal(downloaded,className+'.java');
}
for(const name of ['', '9Car','bad name','../Car','class','record','CON.java','Bad.java.java','A;bad']){
 elements.filename.value=name;assert.throws(generate);
}
elements.filename.value='Car2027.java';
elements.mode.value='manual';handlers['form:change']();
code=generate();assert.match(code,/AUTO_BOUNDS = false/);assert.match(code,/MANUAL_MIN = \{-2.6464543248505645/);
elements.mode.value='auto';handlers['form:change']();
elements.speed.value='50';elements.speedUnit.value='mph';
assert.ok(generate().includes('SPEED = '+String(50*.44704)+';'));
elements.mesh.checked=true;assert.match(generate(),/GENERATE_MESH = true/);
elements.minimum.value='3';assert.throws(generate);elements.minimum.value='1';
elements.speed.value='';assert.throws(generate);
console.log('PASS: half-car exports, custom filenames/downloads, invalid names, unit regression, auto/manual modes, speed conversion and mesh toggle.');
