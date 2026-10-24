const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'template.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'engine.js'),'utf8'));
assert.equal(MACRO_TEMPLATE,fs.readFileSync(path.join(__dirname,'macro_template.java.txt'),'utf8'));
const s={...DEFAULT_SETTINGS,rolling_floor:true};
for(const [unit,height] of [['mm',50],['cm',5],['m',.05],['in',50/25.4],['ft',50/304.8]]) {
 const cfg={...s,ride_height:height,ride_height_unit:unit,mesh_scale:7,speed_scale:2};
 assert.ok(Math.abs(calculate(cfg).ride_height-.05)<1e-15);
 assert.deepEqual(loadSettings(JSON.stringify({format:5,settings:cfg})),cfg);
 const macro=renderMacro(cfg);
 assert.match(macro,/getMinZFace\(\)\}\), "KM_Ground"/);
 assert.match(macro,/true \? cadPart_0 : refinementBlock/);
 assert.match(macro,/WallRelativeVelocityProfile.class/);
 assert.match(macro,/setComponentsAndUnits\(-18.0, 0.0, 0.0, units_2\)/);
 assert.doesNotMatch(macro,/@[A-Z]+@/);
}
for(const height of [0,-1,NaN,Infinity,Number.MIN_VALUE])assert.throws(()=>calculate({...s,ride_height:height}));
assert.throws(()=>calculate({...s,ride_height_unit:'yards'}));
assert.throws(()=>calculate({...s,rolling_floor:'true'}));
assert.equal(loadSettings('{"format":4,"settings":{}}').rolling_floor,false);
assert.equal(calculate({...s,rolling_floor:false,ride_height:0}).ride_height,0);
// Execute a mechanical JS translation of the pure Java layout arithmetic.
// This exercises the generated function; it does not compile the STAR macro.
const macro=renderMacro(s),start=macro.indexOf('  private static double[][] calculateLayout('),end=macro.indexOf('  private static String surfaceTag',start);
const java=macro.slice(start,end);
const body=java.slice(java.indexOf(' {')+2,java.lastIndexOf('}'))
 .replace(/new double\[3\]/g,'new Array(3)')
 .replace(/new double\[\]\[\] \{boxMin, boxMax, new double\[\] \{ref, base\}\}/g,'[boxMin, boxMax, [ref, base]]')
 .replace(/new double\[\] \{/g,'[')
 .replace(/(double\[\] \w+ = )\{([^}]+)\}/g,'$1[$2]')
 .replace(/double\[\]|double|int /g,'let ')
 .replace(/Double.isFinite/g,'Number.isFinite')
 .replace(/new IllegalStateException/g,'new Error');
const layout=new Function('lower','upper','useX','upstream','downstream','sides','vertical','relativeMesh','relativePercent','absoluteBase','meshScale','rollingFloor','rideHeight',body);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
for(const z of [-7.5,0,9.25]) {
 const lo=[2,-3,z],hi=[3,1,z+.4];
 const floor=layout(lo,hi,false,5,10,5,5,false,5,.5,1,true,.05);
 near(floor[0][2],z-.05);near(lo[2]-floor[0][2],.05);
 near(floor[0][0],-38);near(floor[1][0],23);near(floor[1][2],z+.4+20);
 const free=layout(lo,hi,false,5,10,5,5,false,5,.5,1,false,0);
 near(free[0][2],z-20);assert.deepEqual(floor[2],free[2]);
}
assert.throws(()=>layout([0,0,1e20],[1,1,1e20+1e6],true,5,10,5,5,false,5,.5,1,true,.05));
console.log('PASS: translated layout arithmetic for min-Z, absolute clearance, translated geometry, free-air layout and precision guard; five units, independent mesh scaling, moving-wall wiring, validation, migration and template synchronization. STAR compilation/playback remains untested.');
