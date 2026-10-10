'use strict';
const groups=[
 ['Part','Your imported part','Enter the bounding dimensions and exact name of your single, combined CAD part.',[
 ['part_name','Part name','text','Match the name in the STAR-CCM+ Parts tree.','wide'],
 ['length_unit','Length units',['mm','m','in'],'Applies to all length inputs; changing units preserves physical sizes.'],
 ['position','Position',['Centered at origin','Enter minimum coordinates']],
 ['x','X dimension'],['y','Y dimension'],['z','Z dimension'],
 ['min_x','Minimum X'],['min_y','Minimum Y'],['min_z','Minimum Z']]],
 ['Domain','Space around the part','Air enters from +X and travels toward −X. Padding is measured from the part bounds.',[
 ['reference','Reference length L',['Largest dimension','X length','Custom']],['custom_reference','Custom L'],
 ['upstream','Upstream padding × L','number','On the +X side, before the part.'],['downstream','Downstream padding × L','number','On the −X side, behind the part.'],['sides','Side padding × L','number','On each Y side.'],['vertical','Vertical padding × L','number','Above and below, on Z.']]],
 ['Mesh & air','Mesh and air speed','Scale the global mesh and incoming air speed independently.',[
 ['mesh_mode','Base size mode',['Absolute size','Relative to reference length'],'','wide'],['absolute_base','Absolute base size'],['relative_base','Base size (% of L)'],['mesh_scale','Base size multiplier'],['speed','Air speed'],['speed_unit','Speed units',['m/s','mph','km/h']],['speed_scale','Speed multiplier'],['generate_mesh','Generate mesh on macro playback','checkbox','Leave off to inspect the setup before meshing.','wide']]],
 ['Refinement','Local mesh refinement','A refinement block follows the entered part bounds. Padding expands it in every direction.',[
 ['refinement_percent','Local cell size (% of base)'],['refinement_padding','Block padding (% of L)'],['minimum_surface_percent','Minimum surface size (% of base)'],['target_surface_percent','Target surface size (% of base)'],['maximum_cell_percent','Maximum cell size (% of base)'],['prism_layers','Prism layers'],['prism_thickness','Total prism thickness'],['prism_stretching','Prism stretching ratio']]],
 ['Physics','Physics settings','Steady SST k–ω with constant-density air. Working pressure is relative to reference pressure.',[
 ['reference_pressure','Reference pressure (Pa)'],['initial_pressure','Initial working pressure (Pa)'],['outlet_pressure','Outlet working pressure (Pa)','number','0 Pa working + 101000 Pa reference = 101000 Pa absolute.'],['turbulence_intensity_percent','Turbulence intensity (%)'],['viscosity_ratio','Turbulent viscosity ratio']]]
];
const form=document.querySelector('#settings');
for(const [index,[title,heading,description,fields]] of groups.entries()) {
 const button=document.createElement('button');button.type='button';button.textContent=title;button.setAttribute('aria-current',String(index===0));button.addEventListener('click',()=>{
  document.querySelectorAll('.panel').forEach((p,i)=>p.hidden=i!==index);
  document.querySelectorAll('#tabs button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
 });document.querySelector('#tabs').append(button);
 const panel=document.createElement('section');panel.className='panel';panel.hidden=index!==0;
 const h=document.createElement('h2');h.textContent=heading;panel.append(h);
 const p=document.createElement('p');p.className='subtitle';p.textContent=description;panel.append(p);
 const grid=document.createElement('div');grid.className='fields';panel.append(grid);
 for(const [key,label,type='number',help='',wide=''] of fields){
  const div=document.createElement('div');div.className='field '+wide;
  const l=document.createElement('label');l.htmlFor=key;l.textContent=label;
  let input;
  if(Array.isArray(type)){input=document.createElement('select');for(const option of type){const o=document.createElement('option');o.value=o.textContent=option;input.append(o);}}
  else{input=document.createElement('input');input.type=type;if(type==='number')input.step='any';}
  input.id=input.name=key;
  if(type==='checkbox'){l.className='check';l.prepend(input);div.append(l);}else div.append(l,input);
  if(help){const hint=document.createElement('p');hint.className='help';hint.id=key+'Help';hint.textContent=help;div.append(hint);input.setAttribute('aria-describedby',hint.id);}
  grid.append(div);
 }form.append(panel);
}
form.addEventListener('submit',e=>e.preventDefault());
function readForm(){const s={};for(const [key,value] of Object.entries(DEFAULT_SETTINGS)){const el=form.elements.namedItem(key);s[key]=typeof value==='boolean'?el.checked:typeof value==='number'?(el.value.trim()===''?NaN:Number(el.value)):el.value;}return s;}
let previousUnit='mm';let previousSpeedUnit='m/s';
function fill(s){for(const [key,value] of Object.entries(s)){const el=form.elements.namedItem(key);if(typeof value==='boolean')el.checked=value;else el.value=value;}previousUnit=s.length_unit;previousSpeedUnit=s.speed_unit;update();}
const fmt=v=>Number(v.toPrecision(6)).toLocaleString('en-US',{maximumSignificantDigits:6});
function update(){
 const s=readForm();
 for(const key of ['min_x','min_y','min_z'])form.elements[key].disabled=s.position!=='Enter minimum coordinates';
 form.elements.custom_reference.disabled=s.reference!=='Custom';form.elements.relative_base.disabled=s.mesh_mode==='Absolute size';form.elements.absolute_base.disabled=s.mesh_mode!=='Absolute size';
 try{
  const d=calculate(s),u=LENGTH_UNITS[s.length_unit],unit=s.length_unit;
  renderMacro(s,className());
  const items=[['Reference L',fmt(d.reference/u)+' '+unit],['Domain X × Y × Z',d.box_size.map(v=>fmt(v/u)).join(' × ')+' '+unit],['Base size',fmt(d.base/u)+' '+unit],['Refined cell size',fmt(d.refinement_size/u)+' '+unit],['Air speed',fmt(d.velocity)+' m/s toward −X'],['Initial / outlet absolute pressure',fmt(s.reference_pressure+s.initial_pressure)+' / '+fmt(s.reference_pressure+s.outlet_pressure)+' Pa'],['Generate mesh',s.generate_mesh?'Yes':'No — setup only']];
  const dl=document.querySelector('#summary');dl.replaceChildren();for(const [label,value] of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
  draw(d);document.querySelector('#error').textContent='';document.querySelector('#download').disabled=false;document.querySelector('#save').disabled=false;
 }catch(error){document.querySelector('#error').textContent=error.message;document.querySelector('#download').disabled=true;document.querySelector('#save').disabled=true;document.querySelector('#summary').textContent='Complete valid inputs to see the summary.';document.querySelector('#preview').replaceChildren();}
}
function className(){const name=document.querySelector('#filename').value.trim();if(!name.endsWith('.java'))throw new Error('Use a filename ending in Macro.java.');return name.slice(0,-5);}
function draw(d){
 const svg=document.querySelector('#preview');svg.replaceChildren();
 function el(tag,attrs,text){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;svg.append(node);return node;}
 for(const [i,axis]of [1,2].entries()){
  const top=25+i*145, scale=Math.min(480/d.box_size[0],96/d.box_size[axis]);
  const w=d.box_size[0]*scale,h=d.box_size[axis]*scale, left=60+(480-w)/2,y=top+22+(96-h)/2;
  el('text',{x:18,y:top+2,fill:'#61757e','font-size':10},axis===1?'TOP · X/Y':'SIDE · X/Z');
  function rect(min,max,attrs){el('rect',{x:left+(min[0]-d.box_min[0])*scale,y:y+(d.box_max[axis]-max[axis])*scale,width:(max[0]-min[0])*scale,height:(max[axis]-min[axis])*scale,...attrs});}
  rect(d.box_min,d.box_max,{fill:'#edf4f6',stroke:'#7394a2','stroke-width':1});
  rect(d.part_min,d.part_max,{fill:'#edb173',stroke:'#b77b38','stroke-width':1});
  rect(d.refinement_min,d.refinement_max,{fill:'none',stroke:'#108968','stroke-width':2,'stroke-dasharray':'4 3'});
  el('text',{x:left-7,y:y+h/2+3,'text-anchor':'end',fill:'#5b7481','font-size':9},'OUT');
  el('text',{x:left+w+7,y:y+h/2+3,fill:'#167256','font-size':9},'IN');
  el('text',{x:left+w/2,y:top+16,'text-anchor':'middle',fill:'#167256','font-size':11},'← AIRFLOW −X');
 }
}
form.addEventListener('input',e=>{
 if(e.target.id==='length_unit'){
  const next=e.target.value;for(const key of ['x','y','z','min_x','min_y','min_z','custom_reference','absolute_base','prism_thickness']){const el=form.elements[key];if(el.value.trim()!==''&&Number.isFinite(Number(el.value)))el.value=Number((Number(el.value)*LENGTH_UNITS[previousUnit]/LENGTH_UNITS[next]).toPrecision(15));}previousUnit=next;
 }
 if(e.target.id==='speed_unit'){const el=form.elements.speed,next=e.target.value;if(el.value.trim()!==''&&Number.isFinite(Number(el.value)))el.value=Number((Number(el.value)*SPEED_UNITS[previousSpeedUnit]/SPEED_UNITS[next]).toPrecision(15));previousSpeedUnit=next;}
 document.querySelector('#status').textContent='';update();
});
document.querySelector('#filename').addEventListener('input',update);
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
document.querySelector('#download').addEventListener('click',()=>{try{const name=className();download(renderMacro(readForm(),name),name+'.java','text/plain;charset=utf-8');document.querySelector('#status').textContent='Macro downloaded. Flow enters at +X and travels toward −X.';}catch(e){document.querySelector('#error').textContent=e.message;}});
document.querySelector('#save').addEventListener('click',()=>{const s=readForm();calculate(s);download(JSON.stringify({format:3,flow_direction:'-X',settings:s},null,2),'macro-settings.json','application/json');document.querySelector('#status').textContent='Settings saved.';});
document.querySelector('#import').addEventListener('click',()=>document.querySelector('#settingsFile').click());
document.querySelector('#settingsFile').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;const s=loadSettings(await file.text());fill(s);document.querySelector('#status').textContent='Settings loaded. This version uses −X airflow; upstream padding is on +X.';}catch(error){document.querySelector('#status').textContent='Could not load settings: '+error.message;}finally{e.target.value='';}});
document.querySelector('#reset').addEventListener('click',()=>{fill(DEFAULT_SETTINGS);document.querySelector('#status').textContent='Default settings restored.';});
fill(DEFAULT_SETTINGS);
