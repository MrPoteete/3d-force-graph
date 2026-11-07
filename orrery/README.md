# Second Brain Orrery

A 3D map of a markdown wiki, drawn with 3d-force-graph (this repo's library, loaded from the
jsDelivr CDN at 1.80.1). Every visual property is a live dial. Looks can be saved, copied as
text and pasted back. Clicking a page shows its summary, its links in both directions and its
sources, which also orbit the page as satellites.

It is published as a private claude.ai artifact. **This repo is a public fork, so it holds only
code: the wiki export and the built page stay out (`.gitignore`).**

## Build

1. Export the wiki graph with Brain Galaxy's exporter (read-only on the vault):
   `npm run export -- --vault <vault> --out orrery/graph.json`, run in the Brain Galaxy repo.
2. Trim it for the page. This also replaces IPv4 addresses with `[address]`:
   `python3 tools/prep.py graph.json data.json`
3. Embed it:
   - `python3 tools/build.py template.html data.json orrery.html` gives the artifact body, which
     is what gets published.
   - Add `--standalone` to get a full page you can open or serve locally.

## Check

Serve a `--standalone` build, then run `node tests/check.cjs <url>`. Set `PLAYWRIGHT` to the
module path if Playwright isn't resolvable from here. It exits 1 when any of these fail:

- **Background colour, with bloom on.** It must measure as the colour that was set.
- **Dial sweep.** Every preset and every dial value must apply without an error, and the dials
  must still drive the view after a preset.
- **Reader.** It must open when a page is selected.

The background check was seen to fail: with the clear-colour bug put back it reads 43.7
against an expected 6.7.

## Known trap: the background is painted in the scene, not as a clear colour

three.js converts a renderer clear colour for whichever surface is bound when the colour is
set. The bloom pass re-sets the clear colour every frame while the screen is bound. So the
off-screen buffer was cleared with screen-ready values, and those were converted again on the
way out: `#04050b` showed as about `#22263b`. On a real GPU that flipped between frames into a
whole-screen strobe (2026-11-07). `applyMood()` now sets `scene.background`. Keep it that way.

> **In plain terms:** the background colour was going through the colour converter twice, and
> that step could flip from one frame to the next, which flashed the screen. Painting the
> background as part of the scene sends it through once.

## Dependencies

All of them load from jsDelivr at exact versions:

- `3d-force-graph@1.80.1`, which pulls in `three@0.186.1`
- three's `UnrealBloomPass` and `CSS2DRenderer`, at that same three version, so they share one
  copy of three.js
- `lil-gui@0.20.0`

The console warns about multiple three.js instances. That warning comes from the library's own
import of `three/webgpu`, and it is harmless here.
