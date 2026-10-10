# STAR Macro Builder — GitHub Pages edition

A browser-based conversion of the working Python generator. No Python, Node.js, package installation, build step, external fonts, or CDN is needed to use or host it.

## Try it locally

Extract the entire ZIP, then double-click `index.html`. Keep the HTML, JavaScript and CSS files together. All processing happens in the browser; no CAD, settings, or macro data is uploaded.

## Publish on GitHub Pages

1. Create a public GitHub repository (for example `star-macro-generator`).
2. Upload the **extracted files**, not the ZIP. Place `index.html`, `styles.css`, `app.js`, `engine.js`, `template.js`, and `.nojekyll` at the repository root. README and the example files can also be included. If your file picker hides `.nojekyll`, create an empty file with that name using GitHub's Add file → Create new file.
3. Commit the files to `main`.
4. Open Settings → Pages. Under Build and deployment choose **Deploy from a branch**, then **main** and **/(root)**. Save.
5. When deployment completes, open the URL shown there, normally `https://YOUR-USERNAME.github.io/star-macro-generator/`.

All asset paths are relative, so a repository subdirectory URL works. No GitHub Actions workflow is required. To update, upload the changed files and commit again.

## Using the generator

1. Combine the model into one CAD part before importing into STAR-CCM+. This workflow is for isolated parts in free air.
2. Enter the exact imported part name and its bounding dimensions. Select centered geometry or enter the minimum coordinates. The macro does not move or resize the source geometry.
3. Choose domain padding, mesh size, refinement and speed. Length-unit changes convert existing length inputs; speed-unit changes preserve speed.
4. Review the preview and summary. Download the Java macro. Custom filenames must start with a letter and end in `Macro.java` (e.g. `RearWingMacro.java`).
5. Start with a saved, imported-only simulation with no regions. Play the macro. Mesh generation is optional; the solver is not started.

Save/load settings uses JSON. Existing Python format 1 and 2 files are supported. Browser settings use format 3 and explicitly record −X flow; they are not intended for loading into the old Python app. Imported older settings retain their inputs but use the new flow direction. `test2_part_preset.json` contains the earlier reference geometry inputs; use your own part dimensions for other models.

## Flow correction

- Inlet is the domain **maximum-X face**; outlet is the **minimum-X face**.
- Positive air-speed inputs are magnitudes. Initial velocity is **(−speed, 0, 0)**. The velocity inlet uses the existing normal-inflow behavior on the +X face, so air travels toward −X.
- Upstream padding is on the **+X** side; downstream padding is on the **−X** side.
- Drag is measured along **−X**; downforce remains **−Z**.
- Preview increases X to the right, with flow moving right to left.

## Preserved setup

Trimmed-cell automated mesher, part-bound volumetric refinement block, surface size controls, prism settings, steady SST k–ω without transition, and pressure settings are carried over from the working revision. Default reference pressure is **101000 Pa**; initial and outlet working pressures are **0 Pa**, giving 101000 Pa absolute. The working `thickness.getAbsoluteSize().getValue().setValueAndUnits(...)` call is retained.

The refinement block is a sizing volume, not an extra fluid/solid region or subtraction operand. Total prism thickness is an absolute length and does not scale with the base-size multiplier.

## Files and maintenance

- `index.html`, `styles.css`, `app.js`: browser interface and preview.
- `engine.js`: input validation, calculations and macro export.
- `template.js`: preserved Java macro template and default settings.
- `ConfiguredMacro.java`: example output using the default inputs; generate your own for your part.
- `test2_part_preset.json`: loadable reference settings.
- `.nojekyll`: disables Jekyll processing on GitHub Pages.

## Verification

50 combinations of dimensions, position, units, reference length, base-size mode, mesh multiplier, air-speed units, and refinement padding were compared against the working Python generator with the intended flow changes applied. Calculated quantities and all generated Java tokens matched within floating-point rounding. Invalid-input rejection, part-name escaping, pressure migration, and settings round-trip checks also passed.

JavaScript syntax checks passed. A browser smoke test could not run because the environment had no installed browser and its browser download failed; visual layout and download interactions still need a local browser check.

The Java macro was not compiled or played in STAR-CCM+ in the build environment. The underlying template is the user-confirmed working version; this release needs a STAR-CCM+ playback check for the reversed flow setup.
