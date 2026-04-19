# Paper.js → Clipper.js Boolean Engine Upgrade

Replaces Paper.js's slow built-in boolean operations (`unite`, `subtract`, `intersect`) with [Clipper.js](https://sourceforge.net/p/jsclipper/wiki/documentation/) (v6.4.2), which is dramatically faster — typically 10–100×. Paths are flattened to polygons, processed by Clipper's C++-derived engine, then reconstructed as Paper.js `CompoundPath` objects.

---

## Prompt for Claude Code

Paste this into Claude Code on any Paper.js project:

---

> I want to replace all Paper.js boolean operations (`unite`, `subtract`, `intersect`) with Clipper.js for much faster performance. Here's exactly what to do:
>
> **Step 1 — Get clipper.js**
> Run this in the project directory to download Clipper.js v6.4.2 via npm pack:
> ```
> npm pack clipper-lib && tar -xzf clipper-lib-6.4.2.tgz && cp package/clipper.js ./clipper.js && rm -rf package clipper-lib-6.4.2.tgz
> ```
>
> **Step 2 — Add to HTML**
> In `index.html`, add `<script src="clipper.js"></script>` immediately after `<script src="paper-full.min.js"></script>`.
>
> **Step 3 — Add wrapper functions to index.js**
> Add the following block near the top of the main drawing code (after Paper.js setup, before any boolean operations are called):
>
> ```javascript
> //vvvvvvvvvvvvvvv CLIPPER BOOLEAN ENGINE vvvvvvvvvvvvvvv
> var CLIP_SCALE = 100;   // Integer precision for Clipper (100 = 0.01 unit resolution)
> var CLIP_FLATTEN = 0.1; // Bezier-to-polygon tolerance (lower = smoother, more points)
>
> function _toClipperPaths(paperItem) {
>     var clone = paperItem.clone({ insert: false });
>     clone.flatten(CLIP_FLATTEN);
>     var children = (clone.className === 'CompoundPath') ? clone.children : [clone];
>     var result = [];
>     for (var i = 0; i < children.length; i++) {
>         var segs = children[i].segments;
>         if (segs.length < 3) continue;
>         var pts = new Array(segs.length);
>         for (var j = 0; j < segs.length; j++) {
>             pts[j] = { X: Math.round(segs[j].point.x * CLIP_SCALE),
>                        Y: Math.round(segs[j].point.y * CLIP_SCALE) };
>         }
>         result.push(pts);
>     }
>     clone.remove();
>     return result;
> }
>
> function _fromClipperPaths(clipperPaths) {
>     if (!clipperPaths || clipperPaths.length === 0) return new Path();
>     var compound = new CompoundPath({});
>     for (var i = 0; i < clipperPaths.length; i++) {
>         var pts = clipperPaths[i];
>         if (pts.length < 3) continue;
>         var paperPts = new Array(pts.length);
>         for (var j = 0; j < pts.length; j++) {
>             paperPts[j] = new Point(pts[j].X / CLIP_SCALE, pts[j].Y / CLIP_SCALE);
>         }
>         compound.addChild(new Path({ segments: paperPts, closed: true, insert: false }));
>     }
>     // Use non-zero winding — matches Paper.js canvas default and Clipper's output orientation.
>     // CleanPolygons removes near-degenerate edges that can cause winding flips at fine tolerances.
>     ClipperLib.Clipper.CleanPolygons(clipperPaths, 0.5);
>     compound.reorient(true, true);
>     return compound;
> }
>
> function _clipBool(a, b, clipType) {
>     var savedStyle = a.style;
>     var clipper = new ClipperLib.Clipper();
>     clipper.AddPaths(_toClipperPaths(a), ClipperLib.PolyType.ptSubject, true);
>     clipper.AddPaths(_toClipperPaths(b), ClipperLib.PolyType.ptClip, true);
>     var solution = new ClipperLib.Paths();
>     clipper.Execute(clipType, solution,
>         ClipperLib.PolyFillType.pftNonZero,
>         ClipperLib.PolyFillType.pftNonZero);
>     var result = _fromClipperPaths(solution);
>     result.style = savedStyle;
>     return result;
> }
>
> function clipUnite(a, b)     { return _clipBool(a, b, ClipperLib.ClipType.ctUnion); }
> function clipSubtract(a, b)  { return _clipBool(a, b, ClipperLib.ClipType.ctDifference); }
> function clipIntersect(a, b) { return _clipBool(a, b, ClipperLib.ClipType.ctIntersection); }
> //^^^^^^^^^^^^^ END CLIPPER BOOLEAN ENGINE ^^^^^^^^^^^^^
> ```
>
> **Step 4 — Replace all boolean operations**
> Find every `.unite()`, `.subtract()`, and `.intersect()` call in the project and replace them using the patterns below. The key difference from Paper.js boolean ops is that **the inputs are NOT automatically removed** — you must explicitly remove the old paths and reassign.
>
> **unite pattern:**
> ```javascript
> // BEFORE:
> result = a.unite(b);
> a.remove(); // or previousSibling.remove() / children[length-2].remove()
>
> // AFTER:
> var savedStyle = a.style;
> result = clipUnite(a, b);
> result.style = savedStyle;
> a.remove();
> b.remove(); // only if b is no longer needed
> ```
>
> **subtract pattern:**
> ```javascript
> // BEFORE:
> result = a.subtract(b);
> b.remove();
>
> // AFTER:
> var savedStyle = a.style;
> result = clipSubtract(a, b);
> result.style = savedStyle;
> a.remove();
> b.remove(); // only if b is no longer needed
> ```
>
> **intersect pattern:**
> ```javascript
> // BEFORE:
> result = a.intersect(b);
> a.remove();
>
> // AFTER:
> var savedStyle = a.style;
> result = clipIntersect(a, b);
> result.style = savedStyle;
> a.remove();
> b.remove(); // only if b is no longer needed
> ```
>
> **Important:** After replacing, remove any old Paper.js cleanup lines like `sheet[z].previousSibling.remove()` or `project.activeLayer.children[project.activeLayer.children.length-2].remove()` — those existed to clean up Paper.js boolean intermediates and are no longer needed.
>
> **Also important:** If an input path is reused after a boolean op (e.g. used again for a second operation), do NOT remove it inside that op's replacement. Remove it only after its last use. Example:
> ```javascript
> // circlePath used twice — don't remove it after the first op
> var meshMinusCircle = clipSubtract(mesh, circlePath);
> mesh.remove();
> mesh = meshMinusCircle;
> // circlePath still alive here — used for PaperOffset below
> ring = PaperOffset.offsetStroke(circlePath, minOffset, { cap: 'round' });
> var meshPlusRing = clipUnite(mesh, ring);
> mesh.remove();
> ring.remove();
> circlePath.remove(); // removed here, after last use
> mesh = meshPlusRing;
> ```

---

## Tuning `CLIP_FLATTEN`

| Value | Quality | Speed impact |
|-------|---------|--------------|
| `1.0` | Visibly faceted on curves | Fastest |
| `0.25` | Smooth at normal display sizes | Fast |
| `0.1` | Sub-pixel accurate, indistinguishable from beziers | Moderate |
| `0.05` | Overkill for display; useful for high-res SVG export | Slower |

A good default is `0.1`. If the project exports SVG for laser cutting or plotting, consider `0.05`.

## Tuning `CLIP_SCALE`

`100` (default) means integer coordinates at 0.01-unit resolution. Safe for coordinate spaces up to ~20,000 units. If your project uses very large coordinates (e.g. after scaling paths up by 10×), increase to `1000`.

## Notes

- The result of any Clipper boolean op is always a `CompoundPath`, even for simple shapes. This is fine for Paper.js rendering and SVG export.
- Styles are preserved from the first argument (`a`). If the result needs a different style, set it explicitly after the operation.
- SVG exports will contain straight-line polygon paths rather than bezier curves. For plotting/laser cutting SVG, `CLIP_FLATTEN = 0.05` or lower gives edges smooth enough for most cutters.
