# Montana FSAE CFD generators

Open `index.html` to choose a generator. No install or build step; keep the folders together.

- **Free-stream part:** one imported CAD part; flow −X; optional rolling floor.
- **Full-car workflow:** negative-X half car, symmetry X=0, flow +Y, moving floor, stationary wheels. Required part names are listed in the generator.
- Both accept a custom macro filename, with or without `.java`. The public Java class always matches the downloaded filename.
- Target: STAR-CCM+ 21.04.008. Save an imported-only simulation before playback.

The half-car template includes the tested parallel fix: ordinary unit lookups follow automatic bounds measurement; the internal-unit lookup is removed; inlet, initial velocity and moving-floor velocity use the verified numeric setters. Detailed START/DONE logs are retained; diagnostic step IDs are kept for comparison with earlier logs.

## Hosting
Push these files to a repository, then enable GitHub Pages from its main branch, root folder. All links are relative. For offline use, download/extract the entire repository and open `index.html`.

## Optional checks
Requires Node only for tests:
```sh
node test-half-car.cjs
node free-stream/test-engine.cjs
node free-stream/test-rolling-floor.cjs
```
Generator tests do not execute STAR-CCM+.
