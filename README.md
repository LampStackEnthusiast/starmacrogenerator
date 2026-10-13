# STAR Macro Builder: verified refinement measurement integrated

## Status

The user verified native bounded refinement creation and visually confirmed the block is correctly placed. The standalone measurement macro also compiled and ran successfully in STAR-CCM+ 21.04.008. It passed the known-box self-check and measured all six KM_Refinement surfaces.

The successful measurement was:

- Minimum (m): [0.30480000376701355, -0.39382943511009216, -8.673617379884035E-19]
- Maximum (m): [0.6901667714118958, 0.533270537853241, 0.20123222470283508]
- Approximate size (mm): 385.367 x 927.100 x 201.232

The tiny negative minimum Z is numerical roundoff. These coordinates are evidence from one part, not constants used by the generator.

## Use the updated generator

1. Extract this archive. Open index.html locally or replace the browser generator files on your existing website.
2. Load your saved settings if needed and generate a fresh Java macro. Existing downloaded macros contain the previous implementation.
3. Reopen your saved imported-only simulation, with no regions and no KM_ test parts from earlier runs.
4. Play the newly generated macro with Generate mesh disabled for the first full setup check.
5. Expect BOUNDS SELF-CHECK PASSED followed by REFINEMENT BOUNDS and the calculated domain/reference length. Inspect the complete setup before generating the mesh.

ConfiguredMacro.java is a ready-generated example using DEFAULT_SETTINGS. It selects Part 6__Part 6.

## What fixed measurement

The scene displayers rejected GeometryPart container selections and reported empty inputs. Selecting the actual PartSurface objects fixed the selection. Surface access must use MeshPart rather than GeometryPart. STAR's Geometry representation is an actual star.meshing.PartRepresentation object; the code passes that runtime object to the compatible representation setter without assuming an unavailable GeometryRepresentation class.

The integrated helper preserves the successful initialization, surface selection, and completed-render sequence. It verifies selection both before and after rendering. A temporary box with known SI coordinates checks the measurement before any detected values are used in domain calculations.

On successful measurement, the full setup macro deletes only its temporary measurement scenes and probe. Successfully rendered synchronization PNGs are removed. On measurement failure the scenes and probe remain for inspection. Cleanup is the integration change that has not yet been played in STAR.

The native refinement output remains selected by the volumetric custom mesh control. The outer domain is calculated from its measured bounds once during setup. This remains a single-use setup macro.

## Verification limits

Local generator tests passed for 50 export/settings configurations, settings migration, string escaping, validation, flow-direction wiring and the surface-selection wiring. The readable Java template, embedded browser template and generated example are synchronized.

The native creation and standalone measurement paths have been tested in STAR by the user. The full integrated setup and success cleanup still require STAR playback. STAR is unavailable in this development environment. Deprecation warnings alone do not indicate a compilation failure.

## Included independent tests

AttachRefinementMacro.java tests native block creation and attaches it to a single existing automated trimmed-cell mesher if one exists. Its default source part is Part 6__Part 6.

MeasureRefinementRenderedMacro.java is the exact diagnostic version that the user successfully ran. Its default target is KM_Refinement. It deliberately retains its diagnostic scenes, probe and PNGs for inspection. Do not run these standalone tests in the clean simulation immediately before the full setup, because they leave reserved KM_ objects.

## Maintenance

The browser executes template.js. macro_template.java.txt is its readable source copy; bounds_helpers.java.txt is a readable helper copy. Keep these synchronized when editing. engine.js performs preferences validation and exports Java; app.js contains the form and illustrative diagram.

Run node test-engine.cjs for local generator checks.

Reference for the published scene bounds call: https://community.sw.siemens.com/s/question/0D54O00007OhOTqSAN/how-to-get-a-parts-enclosing-box-vertices-using-a-macro
