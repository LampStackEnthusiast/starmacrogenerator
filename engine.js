/* No dependencies. All lengths exported in metres. */
const LENGTH_UNITS = {mm: .001, cm: .01, m: 1, in: .0254, ft: .3048};
const SPEED_UNITS = {'m/s': 1, mph: .44704, 'km/h': 1/3.6};
function calculate(s) {
  const fail = message => {throw new Error(message);};
  if (typeof s.part_name !== 'string' || !s.part_name.trim() || /[\x00-\x1f]/.test(s.part_name)) fail('Enter the exact part name, on one line.');
  for (const [key,choices] of Object.entries({length_unit:Object.keys(LENGTH_UNITS),speed_unit:Object.keys(SPEED_UNITS),reference:['Largest dimension','X length'],mesh_mode:['Relative to reference length','Absolute size']})) {
    if (!choices.includes(s[key])) fail(`Choose a supported ${key.replaceAll('_',' ')}.`);
  }
  if (typeof s.generate_mesh !== 'boolean') fail('Generate mesh must be true or false.');
  if (typeof s.rolling_floor !== 'boolean') fail('Rolling floor must be true or false.');
  if (!Object.hasOwn(LENGTH_UNITS,s.ride_height_unit)) fail('Choose supported ride height units.');
  if (s.rolling_floor && (!Number.isFinite(s.ride_height) || s.ride_height <= 0)) fail('Ride height must be a finite number greater than zero.');
  const positive = ['upstream','downstream','sides','vertical','mesh_scale','speed','speed_scale','refinement_percent','minimum_surface_percent','target_surface_percent','maximum_cell_percent','prism_layers','prism_thickness','prism_stretching','reference_pressure','turbulence_intensity_percent','viscosity_ratio',s.mesh_mode.startsWith('Relative')?'relative_base':'absolute_base'];
  for (const k of positive) if (!Number.isFinite(s[k]) || s[k]<=0) fail(`${k.replaceAll('_',' ')} must be a finite number greater than zero.`);
  for (const k of ['initial_pressure','outlet_pressure']) if(!Number.isFinite(s[k])) fail(`${k.replaceAll('_',' ')} must be a finite number.`);
  if(!Number.isInteger(s.prism_layers)) fail('Prism layers must be a whole number.');
  if(s.prism_stretching<1) fail('Prism stretching must be at least 1.');
  if(s.minimum_surface_percent>s.target_surface_percent) fail('Minimum surface size cannot exceed target surface size.');
  if(s.refinement_percent>100) fail('Refinement size must be at most 100% of base size.');
  if(s.turbulence_intensity_percent>100) fail('Turbulence intensity must be at most 100%.');
  if(s.reference_pressure+Math.min(s.initial_pressure,s.outlet_pressure)<=0) fail('Absolute initial and outlet pressures must be positive.');
  const unit=LENGTH_UNITS[s.length_unit];
  const base=s.mesh_mode==='Absolute size'?s.absolute_base*unit*s.mesh_scale:null;
  const velocity=s.speed*SPEED_UNITS[s.speed_unit]*s.speed_scale;
  const prism_thickness=s.prism_thickness*unit;
  const ride_height=s.rolling_floor?s.ride_height*LENGTH_UNITS[s.ride_height_unit]:0;
  const refinement_size=base===null?null:base*s.refinement_percent/100;
  for(const value of [velocity,prism_thickness,...(s.rolling_floor?[ride_height]:[]),...(base===null?[]:[base,refinement_size])])
    if(!Number.isFinite(value)||value<=0) fail('Calculated values overflow or are too small.');
  return {base,velocity,prism_thickness,refinement_size,ride_height};
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
  const v=calculate(s), n=javaNumber;
  const r={ROLLINGFLOOR:String(s.rolling_floor),RIDEHEIGHT:n(v.ride_height),REFERENCEISX:String(s.reference==='X length'),UPSTREAM:n(s.upstream),DOWNSTREAM:n(s.downstream),SIDES:n(s.sides),VERTICAL:n(s.vertical),RELATIVEMESH:String(s.mesh_mode.startsWith('Relative')),RELATIVEBASE:n(s.mesh_mode.startsWith('Relative')?s.relative_base:1),ABSOLUTEBASE:n(s.mesh_mode==='Absolute size'?s.absolute_base*LENGTH_UNITS[s.length_unit]:1),MESHSCALE:n(s.mesh_scale),REFINEPERCENT:n(s.refinement_percent),MINSURFACE:n(s.minimum_surface_percent),TARGETSURFACE:n(s.target_surface_percent),MAXCELL:n(s.maximum_cell_percent),PRISMLAYERS:n(s.prism_layers),PRISMTHICKNESS:n(v.prism_thickness),PRISMSTRETCH:n(s.prism_stretching),REFPRESSURE:n(s.reference_pressure),INITPRESSURE:n(s.initial_pressure),OUTPRESSURE:n(s.outlet_pressure),INTENSITY:n(s.turbulence_intensity_percent/100),VISCOSITYRATIO:n(s.viscosity_ratio),CLASS:className,PART:javaString(s.part_name),SPEED:n(v.velocity),MESH:String(s.generate_mesh),SUMMARY:`Part dimensions, domain and refinement bounds are detected at playback; speed = ${n(v.velocity)} m/s.`};
  return MACRO_TEMPLATE.replace(/@([A-Z]+)@/g,(_,key)=>{if(!(key in r))throw new Error('Unknown macro token: '+key); return r[key];});
}
function loadSettings(text) {
  const data=JSON.parse(text);
  if(!data||![1,2,3,4,5].includes(data.format)||!data.settings||Array.isArray(data.settings)||typeof data.settings!=='object') throw new Error('Choose a supported Macro Builder settings JSON file.');
  const legacy=['x','y','z','position','min_x','min_y','min_z','custom_reference','refinement_padding'];
  const s={...DEFAULT_SETTINGS};
  for(const [key,value] of Object.entries(data.settings)) {
    if(Object.hasOwn(DEFAULT_SETTINGS,key)) s[key]=value;
    else if(!legacy.includes(key)) throw new Error('Unsupported settings field: '+key);
  }
  if(s.reference==='Custom' && data.format<4) s.reference='Largest dimension';
  if(s.reference_pressure===101325&&s.initial_pressure===101000&&s.outlet_pressure===101000) {s.reference_pressure=101000;s.initial_pressure=0;s.outlet_pressure=0;}
  calculate(s); return s;
}
