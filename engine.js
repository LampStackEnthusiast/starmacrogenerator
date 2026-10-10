/* No dependencies. All lengths exported in metres. */
const LENGTH_UNITS = {mm: .001, m: 1, in: .0254};
const SPEED_UNITS = {'m/s': 1, mph: .44704, 'km/h': 1/3.6};
function calculate(s) {
  const fail = message => {throw new Error(message);};
  if (typeof s.part_name !== 'string' || !s.part_name.trim() || /[\x00-\x1f]/.test(s.part_name)) fail('Enter the exact part name, on one line.');
  for (const [key,choices] of Object.entries({length_unit:Object.keys(LENGTH_UNITS),speed_unit:Object.keys(SPEED_UNITS),position:['Centered at origin','Enter minimum coordinates'],reference:['Largest dimension','X length','Custom'],mesh_mode:['Relative to reference length','Absolute size']})) {
    if (!choices.includes(s[key])) fail(`Choose a supported ${key.replaceAll('_',' ')}.`);
  }
  if (typeof s.generate_mesh !== 'boolean') fail('Generate mesh must be true or false.');
  const positive = ['x','y','z','upstream','downstream','sides','vertical','mesh_scale','speed','speed_scale','refinement_percent','minimum_surface_percent','target_surface_percent','maximum_cell_percent','prism_layers','prism_thickness','prism_stretching','reference_pressure','turbulence_intensity_percent','viscosity_ratio',s.mesh_mode.startsWith('Relative')?'relative_base':'absolute_base'];
  if (s.reference === 'Custom') positive.push('custom_reference');
  for (const k of positive) if (!Number.isFinite(s[k]) || s[k]<=0) fail(`${k.replaceAll('_',' ')} must be a finite number greater than zero.`);
  for (const k of ['initial_pressure','outlet_pressure','refinement_padding',...(s.position === 'Enter minimum coordinates'?['min_x','min_y','min_z']:[])]) if(!Number.isFinite(s[k])) fail(`${k.replaceAll('_',' ')} must be a finite number.`);
  if(s.refinement_padding<0) fail('Refinement padding cannot be negative.');
  if(!Number.isInteger(s.prism_layers)) fail('Prism layers must be a whole number.');
  if(s.prism_stretching<1) fail('Prism stretching must be at least 1.');
  if(s.minimum_surface_percent>s.target_surface_percent) fail('Minimum surface size cannot exceed target surface size.');
  if(s.refinement_percent>100) fail('Refinement size must be at most 100% of base size.');
  if(s.turbulence_intensity_percent>100) fail('Turbulence intensity must be at most 100%.');
  if(s.reference_pressure+Math.min(s.initial_pressure,s.outlet_pressure)<=0) fail('Absolute initial and outlet pressures must be positive.');
  const unit=LENGTH_UNITS[s.length_unit], dimensions=[s.x,s.y,s.z].map(v=>v*unit);
  const reference=s.reference==='Largest dimension'?Math.max(...dimensions):s.reference==='X length'?dimensions[0]:s.custom_reference*unit;
  const part_min=s.position==='Centered at origin'?dimensions.map(v=>-v/2):[s.min_x,s.min_y,s.min_z].map(v=>v*unit);
  const part_max=part_min.map((v,i)=>v+dimensions[i]);
  // Flow is -X: downstream space is to the left, upstream space to the right.
  const box_min=part_min.map((v,i)=>v-[s.downstream,s.sides,s.vertical][i]*reference);
  const box_max=part_max.map((v,i)=>v+[s.upstream,s.sides,s.vertical][i]*reference);
  const box_size=box_min.map((v,i)=>box_max[i]-v);
  const base=(s.mesh_mode.startsWith('Relative')?reference*s.relative_base/100:s.absolute_base*unit)*s.mesh_scale;
  const velocity=s.speed*SPEED_UNITS[s.speed_unit]*s.speed_scale;
  const padding=s.refinement_padding*reference/100;
  const refinement_min=part_min.map(v=>v-padding), refinement_max=part_max.map(v=>v+padding);
  const refinement_size=base*s.refinement_percent/100,prism_thickness=s.prism_thickness*unit;
  if(!box_min.every((v,i)=>v<refinement_min[i]&&refinement_max[i]<box_max[i])) fail('The refinement block must fit strictly inside the domain; reduce padding.');
  const all=[refinement_size,prism_thickness,...refinement_min,...refinement_max,...dimensions,reference,...part_min,...part_max,...box_min,...box_max,...box_size,base,velocity];
  if(!all.every(Number.isFinite)||Math.min(...dimensions,reference,...box_size,base,velocity,refinement_size,prism_thickness)<=0) fail('Calculated values overflow or are too small; use realistic dimensions and scales.');
  if(!box_min.every((v,i)=>v<part_min[i]&&part_min[i]<part_max[i]&&part_max[i]<box_max[i])) fail('Part dimensions cannot be resolved at these coordinate magnitudes.');
  return {dimensions,reference,part_min,part_max,box_min,box_max,box_size,base,velocity,refinement_min,refinement_max,refinement_size,prism_thickness};
}
function javaNumber(v) {
  // Preserve double precision; a decimal or exponent keeps Java literals doubles.
  const n=String(v); return /[.eE]/.test(n)?n:n+'.0';
}
function javaString(v) {
  return JSON.stringify(v).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
}
function renderMacro(s,className='ConfiguredMacro') {
  if(!/^[A-Za-z][A-Za-z0-9_]*Macro$/.test(className)) throw new Error('Filename must start with a letter, use letters, digits or underscores, and end in Macro.java.');
  const v=calculate(s), n=javaNumber, vec=a=>a.map(n).join(', ');
  const r={REFINEMIN:vec(v.refinement_min),REFINEMAX:vec(v.refinement_max),REFINEPERCENT:n(s.refinement_percent),MINSURFACE:n(s.minimum_surface_percent),TARGETSURFACE:n(s.target_surface_percent),MAXCELL:n(s.maximum_cell_percent),PRISMLAYERS:n(s.prism_layers),PRISMTHICKNESS:n(v.prism_thickness),PRISMSTRETCH:n(s.prism_stretching),REFPRESSURE:n(s.reference_pressure),INITPRESSURE:n(s.initial_pressure),OUTPRESSURE:n(s.outlet_pressure),INTENSITY:n(s.turbulence_intensity_percent/100),VISCOSITYRATIO:n(s.viscosity_ratio),CLASS:className,PART:javaString(s.part_name),MIN:vec(v.box_min),MAX:vec(v.box_max),SPEED:n(v.velocity),BASE:n(v.base),MESH:String(s.generate_mesh),SUMMARY:`Reference length = ${n(v.reference)} m; base = ${n(v.base)} m; speed = ${n(v.velocity)} m/s.`};
  return MACRO_TEMPLATE.replace(/@([A-Z]+)@/g,(_,key)=>{if(!(key in r))throw new Error('Unknown macro token: '+key); return r[key];});
}
function loadSettings(text) {
  const data=JSON.parse(text);
  if(!data||![1,2,3].includes(data.format)||!data.settings||Array.isArray(data.settings)||typeof data.settings!=='object') throw new Error('Choose a supported Macro Builder settings JSON file.');
  for(const key of Object.keys(data.settings)) if(!Object.hasOwn(DEFAULT_SETTINGS,key)) throw new Error('Unsupported settings field: '+key);
  const s={...DEFAULT_SETTINGS,...data.settings};
  if(s.reference_pressure===101325&&s.initial_pressure===101000&&s.outlet_pressure===101000) {s.reference_pressure=101000;s.initial_pressure=0;s.outlet_pressure=0;}
  calculate(s); return s;
}
