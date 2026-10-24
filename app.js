'use strict';
const groups=[
 ['Part','Your imported part','STAR-CCM+ detects the selected part’s size and position when the macro runs. No dimensions are needed.',[
 ['part_name','Part name','text','Match the name of your single, combined CAD part in the STAR-CCM+ Parts tree.','wide'],
 ['length_unit','Mesh length units',['mm','cm','m','in','ft'],'For absolute mesh base size and prism thickness. Geometry is measured automatically.']]],
 ['Domain','Space around the part','Air enters from +X and travels toward −X. Padding is measured from the part bounds.',[
 ['reference','Reference length L',['Largest dimension','X length']],
 ['upstream','Upstream padding × L','number','On the +X side, before the part.'],['downstream','Downstream padding × L','number','On the −X side, behind the part.'],['sides','Side padding × L','number','On each Y side.'],['vertical','Vertical padding × L','number','Above on +Z; also below on −Z when rolling floor is off.']]],
 ['Ground','Rolling floor','Ride height is the vertical clearance below the lowest point of the selected model. The floor moves with the air toward −X.',[
 ['rolling_floor','Enable rolling floor','checkbox','','wide'],
 ['ride_height','Ride height','number','Absolute clearance, independent of model size. Must be greater than zero.'],
 ['ride_height_unit','Ride height units',['mm','cm','m','in','ft']]]],
 ['Mesh & air','Mesh and air speed','Scale the global mesh and incoming air speed independently.',[
 ['mesh_mode','Base size mode',['Absolute size','Relative to reference length'],'','wide'],['absolute_base','Absolute base size'],['relative_base','Base size (% of L)'],['mesh_scale','Base size multiplier'],['speed','Air speed'],['speed_unit','Speed units',['m/s','mph','km/h']],['speed_scale','Speed multiplier'],['generate_mesh','Generate mesh on macro playback','checkbox','Leave off to inspect the setup before meshing.','wide']]],
 ['Refinement','Local mesh refinement','The refinement block fits the detected part bounds in STAR-CCM+, with no padding.',[
 ['refinement_percent','Local cell size (% of base)'],['minimum_surface_percent','Minimum surface size (% of base)'],['target_surface_percent','Target surface size (% of base)'],['maximum_cell_percent','Maximum cell size (% of base)'],['prism_layers','Prism layers'],['prism_thickness','Total prism thickness'],['prism_stretching','Prism stretching ratio']]],
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
let previousUnit='mm';let previousSpeedUnit='m/s';let previousRideUnit='mm';
function fill(s){for(const [key,value] of Object.entries(s)){const el=form.elements.namedItem(key);if(typeof value==='boolean')el.checked=value;else el.value=value;}previousUnit=s.length_unit;previousSpeedUnit=s.speed_unit;previousRideUnit=s.ride_height_unit;update();}
const fmt=v=>Number(v.toPrecision(6)).toLocaleString('en-US',{maximumSignificantDigits:6});
function update(){
 const s=readForm();
 form.elements.ride_height.disabled=!s.rolling_floor;form.elements.ride_height_unit.disabled=!s.rolling_floor;
 form.elements.relative_base.disabled=s.mesh_mode==='Absolute size';form.elements.absolute_base.disabled=s.mesh_mode!=='Absolute size';
 try{
  const d=calculate(s),u=LENGTH_UNITS[s.length_unit],unit=s.length_unit;
  renderMacro(s,className());
  const items=[['Part size & position','Detected in STAR-CCM+'],['Reference L',s.reference+' (detected)'],['Domain','Calculated from detected bounds'],['Ground',s.rolling_floor?'Moving −X at '+fmt(d.velocity)+' m/s; clearance '+fmt(s.ride_height)+' '+s.ride_height_unit:'Free air'],['Base size',d.base===null?fmt(s.relative_base*s.mesh_scale)+'% of detected L':fmt(d.base/u)+' '+unit],['Refinement block','Fits detected part bounds'],['Refined cell size',d.refinement_size===null?fmt(s.refinement_percent)+'% of base':fmt(d.refinement_size/u)+' '+unit],['Air speed',fmt(d.velocity)+' m/s toward −X'],['Initial / outlet absolute pressure',fmt(s.reference_pressure+s.initial_pressure)+' / '+fmt(s.reference_pressure+s.outlet_pressure)+' Pa'],['Generate mesh',s.generate_mesh?'Yes':'No — setup only']];
  const dl=document.querySelector('#summary');dl.replaceChildren();for(const [label,value] of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
  draw();document.querySelector('#error').textContent='';document.querySelector('#download').disabled=false;document.querySelector('#save').disabled=false;
 }catch(error){document.querySelector('#error').textContent=error.message;document.querySelector('#download').disabled=true;document.querySelector('#save').disabled=true;document.querySelector('#summary').textContent='Complete valid inputs to see the summary.';document.querySelector('#preview').replaceChildren();}
}
function className(){const name=document.querySelector('#filename').value.trim();if(!name.endsWith('.java'))throw new Error('Use a filename ending in Macro.java.');return name.slice(0,-5);}
function draw(){
 const rolling=readForm().rolling_floor;
 const svg=document.querySelector('#preview');
 // Illustrative only: no synthetic dimensions are used to generate the macro.
 svg.innerHTML='<rect x="50" y="65" width="500" height="175" fill="#edf4f6" stroke="#7394a2"/><rect x="310" y="110" width="95" height="85" fill="#edb173"/><rect x="310" y="110" width="95" height="85" fill="none" stroke="#108968" stroke-width="3" stroke-dasharray="6 4"/><text x="300" y="42" text-anchor="middle" fill="#167256" font-size="18">← AIRFLOW −X</text><text x="58" y="90" fill="#61757e" font-size="12">OUTLET −X</text><text x="465" y="90" fill="#167256" font-size="12">INLET +X</text><text x="180" y="155" text-anchor="middle" fill="#61757e" font-size="12">Downstream</text><text x="480" y="155" text-anchor="middle" fill="#61757e" font-size="12">Upstream</text><text x="300" y="274" text-anchor="middle" fill="#61757e" font-size="12">Actual bounds detected during macro playback</text>';
 if(rolling) svg.innerHTML += '<rect x="50" y="215" width="500" height="25" fill="white"/><path d="M50 215 H550" stroke="#273e47" stroke-width="4"/><text x="65" y="235" fill="#273e47" font-size="12">← MOVING FLOOR −X</text><path d="M420 195 V215 M415 195 H425 M415 215 H425" stroke="#273e47"/><text x="432" y="209" fill="#273e47" font-size="12">Ride height</text>';
}
form.addEventListener('input',e=>{
 if(e.target.id==='length_unit'){
  const next=e.target.value;for(const key of ['absolute_base','prism_thickness']){const el=form.elements[key];if(el.value.trim()!==''&&Number.isFinite(Number(el.value)))el.value=Number((Number(el.value)*LENGTH_UNITS[previousUnit]/LENGTH_UNITS[next]).toPrecision(15));}previousUnit=next;
 }
 if(e.target.id==='ride_height_unit'){
  const el=form.elements.ride_height,next=e.target.value;
  if(el.value.trim()!==''&&Number.isFinite(Number(el.value)))el.value=Number((Number(el.value)*LENGTH_UNITS[previousRideUnit]/LENGTH_UNITS[next]).toPrecision(15));
  previousRideUnit=next;
 }
 if(e.target.id==='speed_unit'){const el=form.elements.speed,next=e.target.value;if(el.value.trim()!==''&&Number.isFinite(Number(el.value)))el.value=Number((Number(el.value)*SPEED_UNITS[previousSpeedUnit]/SPEED_UNITS[next]).toPrecision(15));previousSpeedUnit=next;}
 document.querySelector('#status').textContent='';update();
});
document.querySelector('#filename').addEventListener('input',update);
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
document.querySelector('#download').addEventListener('click',()=>{try{const name=className();download(renderMacro(readForm(),name),name+'.java','text/plain;charset=utf-8');document.querySelector('#status').textContent='Macro downloaded. Flow enters at +X and travels toward −X.';}catch(e){document.querySelector('#error').textContent=e.message;}});
document.querySelector('#save').addEventListener('click',()=>{const s=readForm();calculate(s);download(JSON.stringify({format:5,flow_direction:'-X',settings:s},null,2),'macro-settings.json','application/json');document.querySelector('#status').textContent='Settings saved.';});
document.querySelector('#import').addEventListener('click',()=>document.querySelector('#settingsFile').click());
document.querySelector('#settingsFile').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;const s=loadSettings(await file.text());fill(s);document.querySelector('#status').textContent='Settings loaded. Part size and position will be detected; legacy dimensions, custom reference lengths and refinement padding are ignored.';}catch(error){document.querySelector('#status').textContent='Could not load settings: '+error.message;}finally{e.target.value='';}});
document.querySelector('#reset').addEventListener('click',()=>{fill(DEFAULT_SETTINGS);document.querySelector('#status').textContent='Default settings restored.';});
fill(DEFAULT_SETTINGS);
