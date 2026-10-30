# Cooking Mode Implementation Plan

## Requirements Summary
- **Entry**: "Start Cooking" button in recipe header
- **Navigation**: Prev/Next buttons (large, touch-friendly) + keyboard arrows
- **Ingredients**: Toggle button (sidebar on desktop, drawer on mobile)
- **Extras**: Wake Lock API + localStorage persistence
- **Steps**: Convert to cleaner format with data attributes
- **Breakpoint**: 760px (existing)
- **Timers**: Out of scope

## Current HTML Structure (to transform)
```html
<div class="recipe__instructions">
  <ol>
    <li><p>Step 1 text</p></li>
    <li><p>Step 2 text</p></li>
  </ol>
  <aside class="recipe-tip">...</aside>
  <ol start="4">
    <li>Step 4 text (no p wrapper)</li>
  </ol>
</div>
```

## Cleaner Step Format (data attributes)
```html
<div class="recipe__instructions" data-cooking-steps>
  <ol class="cooking-steps-list">
    <li class="cooking-step" data-step="1"><p>Step 1 text</p></li>
    <li class="cooking-step" data-step="2"><p>Step 2 text</p></li>
    <!-- recipe-tip stays outside or gets data-step="tip" -->
    <li class="cooking-step" data-step="3"><p>Step 3 text</p></li>
  </ol>
</div>
```

---

## Subagent 1: HTML Template + CSS (Agent A)
**Files**: `layouts/posts/single.html`, `assets/css/main.css`

### Tasks:
1. **single.html**: Add "Start Cooking" button in `.recipe__header`
   - Position: after `.recipe-meta`, before ingredients section
   - Markup: `<button class="cooking-mode-toggle" aria-label="Start cooking mode">Start Cooking</button>`
   - Add `data-cooking-steps` attribute to `.recipe__instructions` container
   - Add `data-step` attributes to each `<li>` in step lists

2. **main.css**: Add `.cooking-mode` styles (~200 lines)
   - Body lock: `overflow: hidden`, full-screen layout
   - Hide: `header`, `footer`, `.back-link`, `.recipe__cover`, `.recipe-meta`, `.recipe__intro`
   - Top bar: fixed, recipe title + step counter + exit button + ingredients toggle
   - Two-panel layout (desktop): ingredients sidebar (300px) + steps main area
   - Mobile: ingredients drawer (bottom sheet), steps full-width
   - Step card: centered, large text (1.5rem+), step number badge
   - Prev/Next buttons: fixed bottom, 60px height, 50% width each
   - Progress bar: thin line at top
   - Transitions for smooth enter/exit
   - Wake lock indicator (optional small icon)

---

## Subagent 2: JavaScript Module (Agent B)
**File**: `assets/js/cooking-mode.js` (new)

### Tasks:
1. **CookingMode class** with:
   - `init()` - find elements, parse steps, bind events
   - `enter()` - add `.cooking-mode` class, request wake lock, build step UI
   - `exit()` - remove class, release wake lock, restore scroll
   - `goToStep(n)` - show step n, update counter, ARIA live
   - `next()` / `prev()` - navigate with bounds checking
   - `toggleIngredients()` - show/hide panel/drawer

2. **Step parsing**:
   - Find `[data-cooking-steps]` container
   - Collect all `.cooking-step` elements in order
   - Store as array of `{index, element, html}`

3. **Step rendering**:
   - Hide all steps initially
   - Show only current step in dedicated `.cooking-step-view` container
   - Inject step number badge: `<span class="cooking-step-number">1</span>`
   - Preserve original HTML (including tips if marked)

4. **Persistence (localStorage)**:
   - Save: `cookingMode: {active: true, currentStep: 2, recipeUrl: '/posts/...' }`
   - On load: if same URL and active, auto-enter cooking mode at saved step
   - Clear on exit or different recipe

5. **Wake Lock**:
   - `navigator.wakeLock.request('screen')` on enter
   - Handle `wakeLock.release()` on exit/visibilitychange
   - Graceful fallback if unsupported

6. **Events**:
   - Button clicks (prev/next/exit/ingredients)
   - Keyboard: ←/→ for prev/next, Esc to exit
   - Touch: swipe left/right on step area
   - Visibilitychange: release wake lock if hidden

7. **Accessibility**:
   - ARIA live region for step announcements
   - Focus management (trap in drawer, restore on exit)
   - Proper button labels

---

## Subagent 3: Integration + Testing (Agent C)
**Files**: `layouts/partials/footer.html`, verification

### Tasks:
1. **footer.html**: Add script tag
   ```html
   <script src="{{ "js/cooking-mode.js" | relURL }}" defer></script>
   ```

2. **Verify HTML output**:
   - Build site (`hugo`)
   - Check generated HTML has correct data attributes
   - Verify button appears in recipe header

3. **Manual testing checklist**:
   - [ ] Click "Start Cooking" → enters mode, hides chrome
   - [ ] Step counter shows "Step 1 of N"
   - [ ] Next/Prev buttons work
   - [ ] Keyboard arrows work
   - [ ] Ingredients toggle opens/closes panel
   - [ ] Mobile: ingredients drawer slides up
   - [ ] Wake lock requests (check DevTools Application tab)
   - [ ] Reload page → restores cooking mode at same step
   - [ ] Exit button → returns to normal view
   - [ ] Esc key exits
   - [ ] Swipe works on mobile

4. **Edge cases**:
   - Recipe with no steps (fallback)
   - Recipe with tips between steps
   - Very long steps (scroll within step card)
   - Orientation change

---

## Coordination Notes
- Agent A and B work in parallel (HTML/CSS vs JS)
- Agent C waits for both to complete
- All agents: **ask questions if unclear** instead of assuming
- Use existing CSS variables (`--ink`, `--muted`, `--paper`, `--surface`, `--line`, `--tomato`, `--tomato-dark`, `--olive`)
- Match existing code style (2-space indent, BEM-ish classes)