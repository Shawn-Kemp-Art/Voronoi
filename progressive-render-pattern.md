# Progressive Layer Rendering Pattern

A pattern for showing each layer as it renders in Paper.js generative art projects, instead of waiting until all layers are complete before anything appears.

## The Problem

Paper.js render loops are synchronous. JavaScript never yields to the browser's paint cycle while a loop is running, so the user sees a blank canvas until every layer finishes — which can take minutes.

## The Solution

Wrap the render loop in an `async` IIFE and `await` a zero-delay `setTimeout` after each layer. This yields the JS thread back to the browser between layers, allowing it to repaint before starting the next one.

```js
(async () => {

    paper.view.autoUpdate = false; // prevent automatic repaints during construction

    for (let z = 0; z < stacks; z++) {
        // ... render layer z ...

        paper.view.update();                              // repaint now
        await new Promise(resolve => setTimeout(resolve, 0)); // yield to browser
    }

    paper.view.autoUpdate = true;
    paper.view.update(); // final repaint

})();
```

The `setTimeout(resolve, 0)` schedules a macro-task, which gives the browser a full paint cycle before the next layer starts computing.

---

## Scope Considerations

When you wrap a render loop in an async IIFE, variables and functions declared inside it are **not accessible** from outside (e.g., keyboard listeners, export functions). Anything referenced from outside the IIFE must be declared in the outer scope first.

### Variables to hoist

Scan the code after the render loop for any `var` declarations that are used by keyboard listeners or other functions, then move those declarations to before the IIFE:

```js
// Before the IIFE — accessible everywhere in the outer function scope
var features = {};
var renderTime;

(async () => {
    // ... loop ...
    features.Size = "...";   // assign inside, but declared outside
    renderTime = elapsed;
})();
```

### Functions to hoist

Any `function` declarations that are called from outside the IIFE (e.g., a keyboard listener calling `sendAllExports()`) must also live outside it. Move them after the closing `})();`:

```js
(async () => {
    // ... loop ...
    if (condition) { sendAllExports(); } // call is fine — function is hoisted
})();

// Declared outside so keyboard listener can also call it
async function sendAllExports() {
    // uses features, stacks, sheet, etc. from outer scope — all accessible
}
```

`function` declarations are hoisted to the top of their containing scope, so they can be called from inside the IIFE even if physically written after it.

---

## Step-by-Step Implementation for a New Project

### 1. Identify the render loop

Find the main `for` loop that builds layers/frames. It usually looks like:

```js
for (z = 0; z < stacks; z++) {
    // drawFrame, rays, frameIt, etc.
}
```

### 2. Find variables declared after the loop that are used outside it

Search for `var` declarations between the end of the loop and the end of the file. Common ones:
- `features` / `traits` object (used by keyboard listener for export)
- `renderTime` (used by a save/export helper)
- Any state that a keyboard shortcut reads

### 3. Find functions defined after the loop that are called from keyboard listeners

Search for `async function` or `function` declarations in the post-loop section. Check if the keyboard listener (`document.addEventListener('keypress', ...)`) calls any of them.

### 4. Apply the pattern

```js
// STEP A: hoist variables
var features = {};
var renderTime;

// STEP B: wrap loop in async IIFE
(async () => {

    paper.view.autoUpdate = false;

    for (z = 0; z < stacks; z++) {
        // ... existing layer code unchanged ...

        // STEP C: add these two lines at the end of each loop iteration
        paper.view.update();
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // ... existing post-loop setup (assign to features, sheet[stacks], etc.) ...

    paper.view.autoUpdate = true;
    paper.view.update();

})();

// STEP D: move any functions that keyboard listeners call to here (outside IIFE)
async function sendAllExports() { ... }
```

### 5. Check for `var` inside the loop

`var` declarations inside the async IIFE are scoped to the IIFE. If any loop-internal variable is referenced in a keyboard listener, hoist it too. (`let` and `const` are block-scoped and usually fine to leave in place.)

---

## What This Does NOT Fix

- **Individual layer render time** — each layer still computes synchronously. If a single layer takes 30 seconds, the user waits 30 seconds between visible updates.
- **Total render time** — the `setTimeout(0)` adds a negligible overhead (~1ms per layer) but does not speed up the geometry computation itself.
- **fxhash `$fx.preview()`** — the preview capture should still be called after all layers are complete, not inside the loop.

---

## Prompting Claude Code

Paste this into the conversation when starting work on a new project:

> I have a Paper.js generative art project with a synchronous layer render loop. I want to implement the progressive render pattern: wrap the loop in an async IIFE, call `paper.view.update()` + `await new Promise(resolve => setTimeout(resolve, 0))` after each layer, and hoist any variables/functions that keyboard listeners depend on to the outer scope. Read `index.js` first, identify all the scope dependencies, then make the changes.
