
document.body.innerHTML = '<style>div{color: grey;text-align:center;position:absolute;margin:auto;top:0;right:0;bottom:0;left:0;width:500px;height:100px;}</style><body><div id="loading"><p>This could take a while, please give it at least 5 minutes to render.</p><br><h1 class="spin">⏳</h1><br><h3>Press <strong>?</strong> for shortcut keys</h3><br><p><small>Output contains an embedded blueprint for creating an IRL wall sculpture</small></p></div></body>';

paper.install(window);
window.onload = function() {

document.body.innerHTML = '<style>body {margin: 0px;text-align: center;}</style><canvas resize="true" style="display:block;width:100%;" id="myCanvas"></canvas>';

setquery("fxhash",$fx.hash);
var initialTime = new Date().getTime();

//file name 
var fileName = $fx.hash;

var canvas = document.getElementById("myCanvas");

paper.setup('myCanvas');
paper.activate();

//vvvvvvvvvvvvvvv CLIPPER BOOLEAN ENGINE vvvvvvvvvvvvvvv
var CLIP_SCALE = 100;   // Integer precision for Clipper (100 = 0.01 unit resolution)
var CLIP_FLATTEN = 0.1; // Bezier-to-polygon tolerance (lower = smoother, more points)

function _toClipperPaths(paperItem) {
    var clone = paperItem.clone({ insert: false });
    clone.flatten(CLIP_FLATTEN);
    var children = (clone.className === 'CompoundPath') ? clone.children : [clone];
    var result = [];
    for (var i = 0; i < children.length; i++) {
        var segs = children[i].segments;
        if (segs.length < 3) continue;
        var pts = new Array(segs.length);
        for (var j = 0; j < segs.length; j++) {
            pts[j] = { X: Math.round(segs[j].point.x * CLIP_SCALE),
                       Y: Math.round(segs[j].point.y * CLIP_SCALE) };
        }
        result.push(pts);
    }
    clone.remove();
    return result;
}

function _fromClipperPaths(clipperPaths) {
    if (!clipperPaths || clipperPaths.length === 0) return new Path();
    var compound = new CompoundPath({});
    for (var i = 0; i < clipperPaths.length; i++) {
        var pts = clipperPaths[i];
        if (pts.length < 3) continue;
        var paperPts = new Array(pts.length);
        for (var j = 0; j < pts.length; j++) {
            paperPts[j] = new Point(pts[j].X / CLIP_SCALE, pts[j].Y / CLIP_SCALE);
        }
        compound.addChild(new Path({ segments: paperPts, closed: true, insert: false }));
    }
    // Use non-zero winding — matches Paper.js canvas default and Clipper's output orientation.
    // CleanPolygons removes near-degenerate edges that can cause winding flips at fine tolerances.
    ClipperLib.Clipper.CleanPolygons(clipperPaths, 0.5);
    compound.reorient(true, true);
    return compound;
}

function _clipBool(a, b, clipType) {
    var savedStyle = a.style;
    var clipper = new ClipperLib.Clipper();
    clipper.AddPaths(_toClipperPaths(a), ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(_toClipperPaths(b), ClipperLib.PolyType.ptClip, true);
    var solution = new ClipperLib.Paths();
    clipper.Execute(clipType, solution,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero);
    var result = _fromClipperPaths(solution);
    result.style = savedStyle;
    return result;
}

function clipUnite(a, b)     { return _clipBool(a, b, ClipperLib.ClipType.ctUnion); }
function clipSubtract(a, b)  { return _clipBool(a, b, ClipperLib.ClipType.ctDifference); }
function clipIntersect(a, b) { return _clipBool(a, b, ClipperLib.ClipType.ctIntersection); }
//^^^^^^^^^^^^^ END CLIPPER BOOLEAN ENGINE ^^^^^^^^^^^^^

console.log('hash: '+$fx.hash)
console.log('#'+$fx.iteration)

canvas.style.background = "white";

//Set a seed value for Perlin
var seed = Math.floor($fx.rand()*10000000000000000);

//initialize perlin noise 
var noise = new perlinNoise3d();
noise.noiseSeed(seed);

//read in query strings
var qcolor1 = "AllColors";
if(new URLSearchParams(window.location.search).get('c1')){qcolor1 = new URLSearchParams(window.location.search).get('c1')}; //colors1
var qcolor2 = "None";
if(new URLSearchParams(window.location.search).get('c2')){qcolor2 = new URLSearchParams(window.location.search).get('c2')}; //colors2
var qcolor3 = "None";
if(new URLSearchParams(window.location.search).get('c3')){qcolor3 = new URLSearchParams(window.location.search).get('c3')}; //colors3
var qcolors = R.random_int(1,6);
if(new URLSearchParams(window.location.search).get('c')){qcolors = new URLSearchParams(window.location.search).get('c')}; //number of colors
var qsize = "2";
if(new URLSearchParams(window.location.search).get('s')){qsize = new URLSearchParams(window.location.search).get('s')}; //size
var qcomplexity = R.random_int(1,10);
if(new URLSearchParams(window.location.search).get('d')){qcomplexity = new URLSearchParams(window.location.search).get('d')}; //size
qcomplexity = qcomplexity+3;
var qvariation = R.random_int(0,10);
if(new URLSearchParams(window.location.search).get('v')){qvariation = parseInt(new URLSearchParams(window.location.search).get('v'))}; //cell size variation
var qweighting = R.random_int(0,10);
if(new URLSearchParams(window.location.search).get('wt')){qweighting = parseInt(new URLSearchParams(window.location.search).get('wt'))}; //weighted/power voronoi focal strength
var qdepthvar = R.random_int(0,10);
if(new URLSearchParams(window.location.search).get('dv')){qdepthvar = parseInt(new URLSearchParams(window.location.search).get('dv'))}; //depth variance: 0 = all cells cut full depth, 10 = some cells only cut ~3 layers
var qtermstyle = R.random_int(1,10);
if(new URLSearchParams(window.location.search).get('ts')){qtermstyle = parseInt(new URLSearchParams(window.location.search).get('ts'))}; //termination style: 1 = cells stop with large polygons, 10 = cells shrink to tiny points

var qorientation =R.random_int(1,2) < 2 ? "portrait" : "landscape";
var qframecolor = R.random_int(0,3) < 1 ? "White" : R.random_int(1,3) < 2 ? "Mocha" : "Random";     
var qmatwidth = R.random_int(50,100);


//fxparams
definitions = [
    {
        id: "layers",
        name: "Layers",
        type: "number",
        default: 12,
        options: {
            min: 6,
            max: 24,
            step: 1,
        },  
    },
    {
        id: "orientation",
        name: "Orientation",
        type: "select",
        default: qorientation,
        options: {options: ["portrait", "landscape"]},
    },
    {
        id: "aspectratio",
        name: "Aspect ratio",
        type: "select",
        default: "4:5",
        options: {options: ["1:1", "2:5","3:5","4:5","54:86","296:420"]},
    },
    {
        id: "size",
        name: "Size",
        type: "select",
        default: qsize,
        options: {options: ["1", "2", "3"]},
    },
    {
        id: "colors",
        name: "Max # of colors",
        type: "number",
        default: qcolors,
        options: {
            min: 1,
            max: 6,
            step: 1,
        },  
    },
    {
        id: "colors1",
        name: "Pallete 1",
        type: "select",
        default: qcolor1,
        options: {options: palleteNames},
    },
    {
        id: "colors2",
        name: "Pallete 2",
        type: "select",
        default: qcolor2,
        options: {options: palleteNames},
    },
    {
        id: "colors3",
        name: "Pallete 3",
        type: "select",
        default: qcolor3,
        options: {options: palleteNames},
    },
    {
        id: "framecolor",
        name: "Frame color",
        type: "select",
        default: qframecolor,
        options: {options: ["Random","White","Mocha"]},
    },
    {
        id: "gridsize",
        name: "Grids",
        type: "number",
        default: qcomplexity,
        options: {
            min: 3,
            max: 13,
            step: 1,
        },
    },
    {
        id: "variation",
        name: "Cell size variation",
        type: "number",
        default: qvariation,
        options: {
            min: 1,
            max: 10,
            step: 1,
        },
    },
    {
        id: "weighting",
        name: "Weighted focal points",
        type: "number",
        default: qweighting,
        options: {
            min: 0,
            max: 10,
            step: 1,
        },
    },
    {
        id: "depthvar",
        name: "Depth variance",
        type: "number",
        default: qdepthvar,
        options: {
            min: 0,
            max: 10,
            step: 1,
        },
    },
    {
        id: "termstyle",
        name: "Termination style",
        type: "number",
        default: qtermstyle,
        options: {
            min: 1,
            max: 10,
            step: 1,
        },
    },
    {
        id: "matwidth",
        name: "Mat size",
        type: "number",
        default: qmatwidth,
        options: {
            min: 50,
            max: 150,
            step: 10,
        },  
    },
   
    ]


$fx.params(definitions)
var scale = $fx.getParam('size');
var stacks = $fx.getParam('layers');
var numofcolors = $fx.getParam('colors');


//Set the properties for the artwork where 100 = 1 inch
var wide = 800; 
var high = 1000; 

if ($fx.getParam('aspectratio')== "1:1"){wide = 800; high = 800};
if ($fx.getParam('aspectratio')== "2:5"){wide = 400; high = 1000};
if ($fx.getParam('aspectratio')== "3:5"){wide = 600; high = 1000};
if ($fx.getParam('aspectratio')== "4:5"){wide = 800; high = 1000};
if ($fx.getParam('aspectratio')== "54:86"){wide = 540; high = 860};
if ($fx.getParam('aspectratio')== "296:420"){wide =705; high = 1000};


var ratio = 1/scale;//use 1/4 for 32x40 - 1/3 for 24x30 - 1/2 for 16x20 - 1/1 for 8x10
var minOffset = ~~(7*ratio); //this is aproximatly .125"
var framewidth = ~~($fx.getParam('matwidth')*ratio*scale); 
var framradius = 0;


// Set a canvas size for when layers are exploded where 100=1in
var panelWide = 1600; 
var panelHigh = 2000; 
 
paper.view.viewSize.width = 2400;
paper.view.viewSize.height = 2400;


var colors = []; var palette = []; 

// set a pallete based on color schemes
var newPalette = [];
newPalette = this[$fx.getParam('colors1')].concat(this[$fx.getParam('colors2')],this[$fx.getParam('colors3')]);
for (c=0; c<numofcolors; c=c+1){palette[c] = newPalette[R.random_int(0, newPalette.length-1)]}  
console.log(newPalette);

//randomly assign colors to layers
for (c=0; c<stacks; c=c+1){colors[c] = palette[R.random_int(0, palette.length-1)];};

//or alternate colors
p=0;for (var c=0; c<stacks; c=c+1){colors[c] = palette[p];p=p+1;if(p==palette.length){p=0};}

console.log(colors);

if ($fx.getParam('framecolor')=="White"){colors[stacks-1]={"Hex":"#FFFFFF", "Name":"Smooth White"}};
if ($fx.getParam('framecolor')=="Mocha"){colors[stacks-1]={"Hex":"#4C4638", "Name":"Mocha"}};


var woodframe = new Path();var framegap = new Path();
var fColor = frameColors[R.random_int(0, frameColors.length-1)];
fColor = {"Hex":"#60513D","Name":"Walnut"};
var frameColor = fColor.Hex;

//adjust the canvas dimensions
w=wide;h=high;
var orientation="Portrait";
 
if ($fx.getParam('orientation')=="landscape"){wide = h;high = w;orientation="Landscape";};
if ($fx.getParam('orientation')=="portrait"){wide = w;high = h;orientation="Portrait";};

//setup the project variables


//Set the line color
linecolor={"Hex":"#4C4638", "Name":"Mocha"};


//************* Draw the layers ************* 


sheet = []; //This will hold each layer

var px=0;var py=0;var pz=0;var prange=.1; 


//define the Voronoi tessellation (deterministic via $fx.rand)
        var drawareawide = wide-framewidth*2;
        var drawareahigh = high-framewidth*2;
        var densityParam = $fx.getParam('gridsize'); // 3..13
        var avgCellSize = drawareawide / densityParam;
        var avgCellArea = avgCellSize * avgCellSize;
        var numSites = Math.max(8, Math.floor((drawareawide * drawareahigh) / avgCellArea));

        var bbox = {
            minX: framewidth,
            minY: framewidth,
            maxX: wide - framewidth,
            maxY: high - framewidth
        };

        var cellGap = minOffset * R.random_num(1, 2);

        // Helper: Sutherland-Hodgman clip of polygon by a half-plane.
        // Keeps points where (p-m) . d <= 0 (the side where site s lies).
        function clipHalfPlane(poly, mx, my, dx, dy) {
            var out = [];
            var n = poly.length;
            if (n < 3) return out;
            for (var i = 0; i < n; i++) {
                var s = poly[i];
                var e = poly[(i + 1) % n];
                var sd = (s.x - mx) * dx + (s.y - my) * dy;
                var ed = (e.x - mx) * dx + (e.y - my) * dy;
                var sIn = sd <= 0;
                var eIn = ed <= 0;
                if (sIn) {
                    if (eIn) {
                        out.push(e);
                    } else {
                        var t = sd / (sd - ed);
                        out.push({x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t});
                    }
                } else if (eIn) {
                    var t = sd / (sd - ed);
                    out.push({x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t});
                    out.push(e);
                }
            }
            return out;
        }

        // Build one (power) Voronoi cell by intersecting half-planes against every other site.
        // Sites may carry a weight w; bisector shifts toward the lighter site.
        // Power diagram: point p is in site s_i's cell iff |p-s_i|^2 - w_i <= |p-s_j|^2 - w_j.
        // That simplifies to a linear half-plane with the midpoint shifted along (s_j - s_i).
        function computeVoronoiCell(idx, siteList) {
            var cell = [
                {x: bbox.minX, y: bbox.minY},
                {x: bbox.maxX, y: bbox.minY},
                {x: bbox.maxX, y: bbox.maxY},
                {x: bbox.minX, y: bbox.maxY}
            ];
            var s = siteList[idx];
            var sw = s.w || 0;
            for (var i = 0; i < siteList.length; i++) {
                if (i === idx) continue;
                var p = siteList[i];
                var dx = p.x - s.x;
                var dy = p.y - s.y;
                var d2 = dx*dx + dy*dy;
                if (d2 < 1e-9) continue;
                var wShift = (sw - (p.w || 0)) / (2 * d2);
                var mx = (s.x + p.x) * 0.5 + wShift * dx;
                var my = (s.y + p.y) * 0.5 + wShift * dy;
                cell = clipHalfPlane(cell, mx, my, dx, dy);
                if (cell.length < 3) return null;
            }
            return cell;
        }

        function polygonCentroid(poly) {
            var cx = 0, cy = 0, area = 0;
            for (var j = 0; j < poly.length; j++) {
                var p = poly[j], q = poly[(j+1)%poly.length];
                var cross = p.x*q.y - q.x*p.y;
                area += cross;
                cx += (p.x + q.x) * cross;
                cy += (p.y + q.y) * cross;
            }
            area *= 0.5;
            if (Math.abs(area) < 1e-6) return null;
            return {x: cx / (6 * area), y: cy / (6 * area)};
        }

        // Inward polygon offset via Clipper (returns largest resulting piece, or null).
        function offsetPolygonClipper(points, delta) {
            if (!points || points.length < 3) return null;
            var co = new ClipperLib.ClipperOffset();
            var scaled = new Array(points.length);
            for (var k = 0; k < points.length; k++) {
                scaled[k] = { X: Math.round(points[k].x * CLIP_SCALE), Y: Math.round(points[k].y * CLIP_SCALE) };
            }
            co.AddPath(scaled, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
            var solution = new ClipperLib.Paths();
            co.Execute(solution, delta * CLIP_SCALE);
            if (!solution || solution.length === 0) return null;
            var best = null, bestArea = 0;
            for (var s = 0; s < solution.length; s++) {
                if (solution[s].length < 3) continue;
                var a = Math.abs(ClipperLib.Clipper.Area(solution[s]));
                if (a > bestArea) { bestArea = a; best = solution[s]; }
            }
            if (!best) return null;
            var out = new Array(best.length);
            for (var k = 0; k < best.length; k++) {
                out[k] = {x: best[k].X / CLIP_SCALE, y: best[k].Y / CLIP_SCALE};
            }
            return out;
        }

        // Seed sites (deterministic)
        var sites = [];
        for (var si = 0; si < numSites; si++) {
            sites.push({
                x: bbox.minX + R.random_dec() * (bbox.maxX - bbox.minX),
                y: bbox.minY + R.random_dec() * (bbox.maxY - bbox.minY),
                w: 0
            });
        }

        // Partial Lloyd's relaxation — variation controls how far each iteration
        // moves a site toward its cell centroid.
        // variation 1 = full relaxation (even cells), 10 = minimal relaxation
        // (nearly raw random distribution = significant size variation).
        var variation = $fx.getParam('variation');
        var variationT = (variation - 1) / 9; // 0..1
        var blend = 1.0 - variationT * 0.96; // 1.0 at v=1, 0.04 at v=10
        var relaxIters = 4;
        for (var iter = 0; iter < relaxIters; iter++) {
            var relaxed = [];
            for (var i = 0; i < sites.length; i++) {
                var vc = computeVoronoiCell(i, sites);
                if (!vc) { relaxed.push(sites[i]); continue; }
                var cc = polygonCentroid(vc);
                if (!cc) { relaxed.push(sites[i]); continue; }
                relaxed.push({
                    x: sites[i].x + (cc.x - sites[i].x) * blend,
                    y: sites[i].y + (cc.y - sites[i].y) * blend,
                    w: sites[i].w
                });
            }
            sites = relaxed;
        }

        // Power Voronoi — weight each focal site proportional to its own local
        // spacing so the effect stays consistent across densities.
        // For two sites A, B at distance d: weight w on A extends A's cell boundary
        // from d/2 to d/2 + w/(2d). So radius multiplier = 1 + w/d^2.
        // We set w = focalMult * d_nearest^2.
        //   wt=1  -> focalMult ~ 0.3  (~1.3x radius, subtle)
        //   wt=10 -> focalMult ~ 5.0  (~6x radius, strongly dominant)
        var weighting = $fx.getParam('weighting');
        console.log('weighting: ' + weighting);
        if (weighting > 0) {
            var focalCount = Math.max(1, Math.floor(sites.length * 0.03 + weighting * 0.5));
            if (focalCount > sites.length) focalCount = sites.length;
            var focalMult = 0.3 + (weighting - 1) * (4.7 / 9);

            // Deterministic Fisher-Yates shuffle over $fx.rand
            var focalIndices = [];
            for (var fi = 0; fi < sites.length; fi++) focalIndices.push(fi);
            for (var fi = focalIndices.length - 1; fi > 0; fi--) {
                var fj = Math.floor(R.random_dec() * (fi + 1));
                var ftmp = focalIndices[fi]; focalIndices[fi] = focalIndices[fj]; focalIndices[fj] = ftmp;
            }
            for (var fk = 0; fk < focalCount; fk++) {
                var idx = focalIndices[fk];
                var nearestD2 = Infinity;
                for (var fj = 0; fj < sites.length; fj++) {
                    if (fj === idx) continue;
                    var fdx = sites[fj].x - sites[idx].x;
                    var fdy = sites[fj].y - sites[idx].y;
                    var fd2 = fdx*fdx + fdy*fdy;
                    if (fd2 < nearestD2) nearestD2 = fd2;
                }
                sites[idx].w = nearestD2 * focalMult * R.random_num(0.6, 1.0);
            }
        }

        // Final cells with per-cell attributes
        var cells = [];
        var firstVoronoiLayer = stacks - 1; // voronoi now cuts the top layer too
        // Depth variance: 0 = every cell cuts full depth, 10 = shallowest cells stop at ~3 layers.
        var depthvar = $fx.getParam('depthvar');
        var maxDepth = firstVoronoiLayer; // deepest cuts still leave layer 0 solid
        var minDepth = maxDepth - Math.floor((maxDepth - 3) * (depthvar / 10));
        if (minDepth < 3) minDepth = 3;
        if (minDepth > maxDepth) minDepth = maxDepth;
        // Termination style: 1 = cells stop with large terminal polygons,
        // 10 = cells shrink to tiny absolute-size points regardless of cell size.
        // We target a terminal polygon radius directly — so focal (big) cells
        // also shrink small at ts=10 instead of always being 10% of their inradius.
        var termstyle = $fx.getParam('termstyle');
        var termT = (termstyle - 1) / 9; // 0..1
        for (var i = 0; i < sites.length; i++) {
            var polygon = computeVoronoiCell(i, sites);
            if (!polygon || polygon.length < 3) continue;

            // Inradius: min perpendicular distance from the polygon CENTROID to any edge.
            // Using the centroid (not the site) handles cells truncated by the bbox —
            // sites can be very near a bbox edge while the cell is still visually large.
            var cx = 0, cy = 0, cArea = 0;
            for (var k = 0; k < polygon.length; k++) {
                var ca = polygon[k];
                var cb = polygon[(k + 1) % polygon.length];
                var cross = ca.x * cb.y - cb.x * ca.y;
                cArea += cross;
                cx += (ca.x + cb.x) * cross;
                cy += (ca.y + cb.y) * cross;
            }
            cArea *= 0.5;
            if (Math.abs(cArea) > 1e-6) {
                cx /= 6 * cArea;
                cy /= 6 * cArea;
            } else {
                cx = sites[i].x; cy = sites[i].y;
            }
            var minDist = Infinity;
            for (var k = 0; k < polygon.length; k++) {
                var a = polygon[k];
                var b = polygon[(k + 1) % polygon.length];
                var ex = b.x - a.x, ey = b.y - a.y;
                var elen = Math.hypot(ex, ey);
                if (elen < 1e-9) continue;
                ex /= elen; ey /= elen;
                var perp = Math.abs((cx - a.x) * ey - (cy - a.y) * ex);
                if (perp < minDist) minDist = perp;
            }
            var inradius = Math.max(1, minDist);

            // Depth (how many voronoi layers this cell cuts through).
            // Perlin noise seeded from $fx.rand gives spatially coherent variation.
            var nxs = sites[i].x * prange * 0.6;
            var nys = sites[i].y * prange * 0.6;
            var depthNoise = noise.get(nxs, nys); // 0..1-ish
            if (depthNoise < 0) depthNoise = 0;
            if (depthNoise > 1) depthNoise = 1;
            var depth = minDepth + Math.floor(depthNoise * (maxDepth - minDepth + 1));
            if (depth > maxDepth) depth = maxDepth;
            if (depth < minDepth) depth = minDepth;

            // endLayer: lowest z (inclusive) that still gets cut by this cell.
            var endLayer = firstVoronoiLayer - (depth - 1);
            if (endLayer < 1) endLayer = 1;

            // terminalR: target radius of the cell's polygon at its deepest cut.
            // At ts=10 this is a small absolute value (≈ cellGap*2), so even focal
            // cells shrink to a tiny point. At ts=1 it's ~inradius*0.5, leaving a
            // large polygon visible. Per-cell variation via perlin noise.
            var termNoise = noise.get(sites[i].x * prange * 0.4 + 1000,
                                      sites[i].y * prange * 0.4 + 1000);
            if (termNoise < 0) termNoise = 0;
            if (termNoise > 1) termNoise = 1;
            var smallR = 2; // near-zero absolute terminal radius at ts=10
            var largeR = Math.max(smallR + 1, inradius * 0.5);
            // Linear ts blend for mean; spread is biggest at ts=5.5, zero at extremes.
            var centerR = largeR * (1 - termT) + smallR * termT;
            var spreadHalf = Math.min(termT, 1 - termT) * (largeR - smallR);
            var terminalR = centerR + (termNoise - 0.5) * 2 * spreadHalf;
            if (terminalR < smallR) terminalR = smallR;
            if (terminalR > largeR) terminalR = largeR;

            cells.push({
                site: sites[i],
                polygon: polygon,
                inradius: inradius,
                endLayer: endLayer,
                terminalR: terminalR
            });
        }
        console.log('Voronoi cells: ' + cells.length);



var features = {};
var renderTime;

paper.view.autoUpdate = false;

(async () => {

//---- Draw the Layers


for (z = 0; z < stacks; z++) {
    pz=z*prange;
    
    drawFrame(z); // Draw the initial frame
    solid(z);

         //-----Draw each layer
        if(z<stacks-1 && z!=0 ){
            if (z==stacks-2){oset = minOffset}else{oset = ~~(minOffset*(stacks-z-1))}
            var li = R.random_int(12, 12);
            for (l=0;l<li;l++){
                //somelines(z); 
            }
            

        }


        
for (var i = 0; i < cells.length; i++) {
    var cell = cells[i];
    if (z < cell.endLayer) continue; // this cell terminates above z — keep solid here (shows color)

    // Shrink ratio: 0 on the top voronoi layer, 1 on the cell's deepest cut layer.
    var distFromTop = firstVoronoiLayer - z;
    var depthSpan = firstVoronoiLayer - cell.endLayer;
    var shrinkRatio = depthSpan > 0 ? (distFromTop / depthSpan) : 0;

    // Top-layer inset — small absolute gap between cells.
    var topInset = Math.min(cellGap, cell.inradius * 0.4);
    // Deepest-layer inset chosen so the terminal polygon has radius ~cell.terminalR.
    // Minimum terminal radius of 2 keeps Clipper stable while still "pinpoint" visually.
    var finalInset = cell.inradius - cell.terminalR;
    if (finalInset < topInset + 0.5) finalInset = topInset + 0.5;
    var maxFinalInset = cell.inradius - 2;
    if (finalInset > maxFinalInset) finalInset = maxFinalInset;

    var inset = topInset + shrinkRatio * (finalInset - topInset);

    var insetPoly = offsetPolygonClipper(cell.polygon, -inset);
    if (!insetPoly || insetPoly.length < 3) continue;

    var segs = new Array(insetPoly.length);
    for (var k = 0; k < insetPoly.length; k++) {
        segs[k] = new Point(insetPoly[k].x, insetPoly[k].y);
    }
    var cellPath = new Path({segments: segs, closed: true});
    cut(z, cellPath);
}

    frameIt(z);// finish the layer with a final frame cleanup 

    cutMarks(z);
    hanger(z);// add hanger holes
    if (z == stacks-1) {signature(z);}// sign the top layer
    sheet[z].scale(2.2);
    sheet[z].position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
   
    var group = new Group(sheet[z]);
    
    console.log(z)//Show layer completed in console

    paper.view.update();
    await new Promise(resolve => setTimeout(resolve, 0));

}//end z loop

//--------- Finish up the preview ----------------------- 

    // Build the features and trigger an fxhash preview
    features = {};
    features.Size =  ~~(wide/100/ratio)+" x "+~~(high/100/ratio)+" inches";
    features.Width = ~~(wide/100/ratio);
    features.Height = ~~(high/100/ratio);
    features.Depth = stacks*0.0625;
    features.Layers = stacks;
    for (l=stacks;l>0;l--){
    var key = "layer: "+(stacks-l+1)
    features[key] = colors[l-1].Name
    }
    console.log(features);
    $fx.features(features);
    //$fx.preview();

//Begin send to studio.shawnkemp.art **************************************************************
     // Only set the API base if the renderer hasn't injected one — otherwise we
     // clobber __STUDIO_API_BASE__ and push artifacts to the wrong environment.
     if (!window.__STUDIO_API_BASE__) {
         studioAPI.setApiBase('https://studio-shawnkemp-art.vercel.app');
     }
     if(new URLSearchParams(window.location.search).get('skart')){sendAllExports()};
//End send to studio.shawnkemp.art **************************************************************

      var finalTime = new Date().getTime();
    renderTime = (finalTime - initialTime)/1000
    console.log ('Render took : ' +  renderTime.toFixed(2) + ' seconds' );

    paper.view.autoUpdate = true;
    paper.view.update();

})();

async function sendAllExports() {

        paper.view.update();
        // Send canvas as PNG
        await studioAPI.sendCanvas(myCanvas, $fx.hash, $fx.hash+".png");

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, $fx.hash+".svg");

        // send colors
        var content = JSON.stringify(features,null,2);

        // Send text/JSON
        await studioAPI.sendText(JSON.stringify(colors), $fx.hash, "Colors-"+$fx.hash+".json");

        // 2. Add frame
        floatingframe();
        paper.view.update();
        // 3. Framed PNGs (Black, White, Walnut, Maple)
        var frameOptions = [
            { name: "Black", hex: "#1f1f1f" },
            { name: "White", hex: "#f9f9f9" },
            { name: "Walnut", hex: "#60513D" },
            { name: "Maple", hex: "#ebd9c0" }
        ];
        for (var i = 0; i < frameOptions.length; i++) {
            woodframe.style = { fillColor: frameOptions[i].hex };
            var fileName = "Framed" + frameOptions[i].name + "-" + $fx.hash;
            paper.view.update();

            await studioAPI.sendCanvas(myCanvas,  $fx.hash, fileName+".png");
        }
        // 4. Remove frame
        floatingframe();
        // 5. Blueprint SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: lightburn[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        paper.view.update();

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Blueprint-" + $fx.hash+".svg");
        // 6. Plotting SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: plottingColors[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        for (var z = 0; z < stacks; z++) {
            if (z < stacks - 1) {
                for (var zs = z + 1; zs < stacks; zs++) {
                    var old = sheet[z];
                    sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                    old.remove();
                }
            }
        }
        paper.view.update();
        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Plotting-" + $fx.hash+".svg");

        // Send features
        await studioAPI.sendFeatures($fx.hash, features);

        console.log("All exports sent!");
        studioAPI.signalComplete();
    }


      

//vvvvvvvvvvvvvvv PROJECT FUNCTIONS vvvvvvvvvvvvvvv 
 
function somelines(z){
        p = []
        y = R.random_int(0, high);
        p[0]=new Point(0,y)
        y2 = R.random_int(0, high);
        p[1]=new Point(wide,y2)
        lines = new Path.Line (p[0],p[1]); 
        mesh = PaperOffset.offsetStroke(lines, minOffset,{ cap: 'butt' });
        mesh.flatten(4);
        mesh.smooth();
        lines.remove();
        join(z,mesh); 
        mesh.remove();

    
}




//^^^^^^^^^^^^^ END PROJECT FUNCTIONS ^^^^^^^^^^^^^ 




//--------- Helper functions ----------------------- 

function floatingframe(){
    var frameWide=~~(34*ratio);var frameReveal = ~~(12*ratio);
  if (framegap.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(~~(wide+frameReveal*2), ~~(high+frameReveal*2)), framradius)
        var insideframe = new Path.Rectangle(new Point(frameReveal, frameReveal),new Size(wide, high)) 
        framegap = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        framegap.scale(2.2);
        framegap.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        framegap.style = {fillColor: '#1A1A1A', strokeColor: "#1A1A1A", strokeWidth: 1*ratio};
    } else {framegap.removeChildren()} 
    
    if (woodframe.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide+frameWide*2+frameReveal*2, high+frameWide*2+frameReveal*2), framradius)
        var insideframe = new Path.Rectangle(new Point(frameWide, frameWide),new Size(wide+frameReveal*2, high+frameReveal*2)) 
        woodframe = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        woodframe.scale(2.2);
        woodframe.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        var framegroup = new Group(woodframe);
        woodframe.style = {fillColor: frameColor, strokeColor: "#60513D", strokeWidth: 2*ratio,shadowColor: new Color(0,0,0,[0.5]),shadowBlur: 20,shadowOffset: new Point(10*2.2, 10*2.2)};
    } else {woodframe.removeChildren()} 
    //fileName = "Framed-"+$fx.hash;
}

function rangeInt(range,x,y,z){
    var v = ~~(range-(noise.get(x,y,z)*range*2));
    return (v);
}

// Add shape s to sheet z
function join(z,s){
    var old = sheet[z];
    sheet[z] = clipUnite(s, sheet[z]);
    old.remove();
    s.remove();
}

// Subtract shape s from sheet z
function cut(z,s){
    var old = sheet[z];
    sheet[z] = clipSubtract(sheet[z], s);
    old.remove();
    s.remove();
}

function drawFrame(z){
    var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
    var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2)) 
    //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
    //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);


    sheet[z] = clipSubtract(outsideframe, insideframe);
    outsideframe.remove();insideframe.remove();
}


function solid(z){
    outsideframe = new Path.Rectangle(new Point(1,1),new Size(wide-1, high-1), framradius)
    //outsideframe = new Path.Circle(new Point(wide/2),wide/2)
    var old = sheet[z];
    sheet[z] = clipUnite(sheet[z], outsideframe);
    old.remove();
    outsideframe.remove();
}



function frameIt(z){
        //Trim to size
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        var old = sheet[z];
        sheet[z] = clipIntersect(outsideframe, sheet[z]);
        old.remove();
        outsideframe.remove();

        //Make sure there is still a solid frame
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2))
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);

        var frame = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        var old = sheet[z];
        sheet[z] = clipUnite(sheet[z], frame);
        old.remove();
        frame.remove();
         
        
        sheet[z].style = {fillColor: colors[z].Hex, strokeColor: linecolor.Hex, strokeWidth: 1*ratio,shadowColor: new Color(0,0,0,[0.3]),shadowBlur: 20,shadowOffset: new Point((stacks-z)*2.3, (stacks-z)*2.3)};
}

function cutMarks(z){
    if (z<stacks-1 && z!=0) {
          for (etch=0;etch<stacks-z;etch++){
                var layerEtch = new Path.Circle(new Point(50+etch*10,25),2)
                cut(z,layerEtch)
            } 
        }
}

function signature(z){
    shawn = new CompoundPath(sig);
    shawn.strokeColor = 'green';
    shawn.fillColor = 'green';
    shawn.strokeWidth = 1;
    shawn.scale(ratio*.9)
    shawn.position = new Point(wide-framewidth-~~(shawn.bounds.width/2), high-framewidth+~~(shawn.bounds.height));
    cut(z,shawn)
}

function hanger (z){
    if (z < stacks-2 && scale>0){
        var r = 30*ratio;
        rt = 19*ratio;
        if (z<3){r = 19*ratio}
        layerEtch = new Path.Rectangle(new Point(framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide-framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(wide-framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide/2, framewidth/2),new Size(r*4, r*2), r)
        layerEtch.position = new Point(wide/2,framewidth/2);   
        cut(z,layerEtch)
    }
}




//--------- Interaction functions -----------------------
var interactiontext = "Interactions\nB = Blueprint mode\nV = Export SVG\nP = Export PNG\nC = Export colors as TXT\nE = Show layers\nF = Add floating frame\nL = Format for plotting"

view.onDoubleClick = function(event) {
    alert(interactiontext);
    console.log(project.exportJSON());
    //canvas.toBlob(function(blob) {saveAs(blob, tokenData.hash+'.png');});
};

document.addEventListener('keypress', (event) => {

       //Save as SVG 
       if(event.key == "v") {
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString:true}));
            var key = [];for (l=stacks;l>0;l--){key[stacks-l] = colors[l-1].Name;}; 
            var svg1 = "<!--"+key+"-->" + paper.project.exportSVG({asString:true})
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(svg1);
            var link = document.createElement("a");
            link.download = fileName;
            link.href = url;
            link.click();
            }


        if(event.key == "f") {
            floatingframe();
            
        }
        
        if(event.key == "1") {
            frameColor = {"Hex":"#4C46380", "Name":"Black"};
            fileName = "FramedBlack-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "2") {
            frameColor = {"Hex":"#f9f9f9","Name":"White"};
            fileName = "FramedWhite-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "3") {
            frameColor = {"Hex":"#60513D","Name":"Walnut"};
            fileName = "FramedWalnut-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "4") {
            frameColor = {"Hex":"#ebd9c0","Name":"Maple"};
            fileName = "FramedMaple-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
            
        if(event.key == "V") {
            fileName = "Vector-"+$fx.hash;
        }  


       //Format for Lightburn
       if(event.key == "b") {
        fileName = "blueprint-"+$fx.hash;
            for (z=0;z<stacks;z++){
                sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: lightburn[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
                sheet[z].selected = true;}
            }

       //Format for plotting
       if(event.key == "l") {
            fileName = "Plotting-"+$fx.hash;

            for (z=0;z<stacks;z++){
            sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: plottingColors[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
            sheet[z].selected = true;
            }
        
            for (z=0;z<stacks;z++){
                if (z<stacks-1){
                    for (zs=z+1;zs<stacks;zs++){
                        var old = sheet[z];
                        sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                        old.remove();
                    }
                }
                console.log("optimizing")
            }
        }

        //new hash
        if(event.key == " ") {
            setquery("fxhash",null);
            location.reload();
            }

        //help
       if(event.key == "h" || event.key == "/") {
            alert(interactiontext);
            }
             
        //Save as PNG
        if(event.key == "p") {
            canvas.toBlob(function(blob) {saveAs(blob, fileName+'.png');});
            }

        //Export colors as txt
        if(event.key == "c") {
            content = JSON.stringify(features,null,2);
            console.log(content);
            var filename = "Colors-"+$fx.hash + ".txt";
            var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
            saveAs(blob, filename);
            }

        //send to studio.shawnkemp.art
        if(event.key == "s") {
            sendAllExports()
            }  

       //Explode the layers     
       if(event.key == "e") {   
            //floatingframe();  
            h=0;t=0;maxwidth=3000;
               for (z=0; z<sheet.length; z++) { 
               sheet[z].scale(1000/2300)   
               sheet[z].position = new Point(wide/2,high/2);        
                    sheet[z].position.x += wide*h;
                    sheet[z].position.y += high*t;
                    sheet[z].selected = true;
                    if (wide*(h+2) > panelWide) {maxwidth=wide*(h+1);h=0;t++;} else{h++};
                    }  
            paper.view.viewSize.width = maxwidth;
            paper.view.viewSize.height = high*(t+1);
           }
 
}, false); 
}