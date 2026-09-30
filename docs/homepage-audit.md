# Homepage splash audit

Inspected `main` at `7b5c27f0780904ce72aa33e5b9bb205dda67ce82` on 2026-09-30, against the supplied homepage plans.

| Feature | Before this change | Resolution |
| --- | --- | --- |
| Rich random taunts | Already present: 81 general lines in 5 weighted groups, with shuffle bags and recent-history avoidance | Preserved; tolerate malformed or unavailable browser storage |
| Light-mode-specific lines | Already present: 26 lines in 3 weighted groups, selected 30% of light-mode loads | Fixed shared bag IDs that could mix light-specific and general text; dark mode never selects the light pool |
| Natural typewriter typos | Present, but errors occurred at word starts and some error kinds did not model real insertion/deletion | Mutate inside eligible words using transposition, duplicate letters, omission, or neighboring keys; preserve recognizable names |
| Repeated mistakes and frustration | Duplicate or skipped typo locations could prevent reaching the required two mistakes; ordinary repeated-error tier absent | Retry the same word before successfully correcting it; guarantee the causal chain even for a line with only one eligible word |
| Rare damn/shit/Whatever variants | Present but swear phrases were selected from a larger burst pool, making intended paths difficult to reach | Explicit rare mood tiers, session suppression, erase the aside, then resume or paste the correct full line |
| Three-second completion deadline | Already absent | Retained unlimited natural duration; both dismissal buttons now visible and operable immediately |
| STFU random replies | Already present: 65 replies across 6 weighted tiers | Preserve pool and shuffle bags; add 20% silent exit; retain no reply during swearing; ignore duplicate dismissal clicks |
| Unique-IP STFU count at top right | Missing: no endpoint, database, or counter frontend | Added nonblocking frontend and Cloudflare Worker + D1 implementation; deployment is still required |
| Accessibility and interruption | Static accessible text and reduced-motion support existed; pending font readiness could restart dismissed typing, dialog focus was not contained | Guard delayed starts, cancel on preference changes, trap dialog focus, restore page focus, correct hidden-text CSS, disable curtain movement for reduced motion |

## Probabilities

For lines with an eligible English word of at least five letters: 70% normal; 20% one typo; 7% repeated typos without frustration; 2% `...damn`; 0.8% `...shit` followed by paste completion; 0.1% `Whatever.`; 0.1% miscellaneous frustration. Already-used swears fall back to the remaining burst pool. Lines without eligible words finish normally. Swear limits persist when session storage is available. Browser storage failures do not prevent entry.

## Verification

`node --test tests/*.test.mjs`: 15 tests cover controlled probability tiers, single-word repeated mistakes, all 65 exit replies, silence, occasional okay response, final exact text, session suppression, interruption, delayed fonts, reduced motion, storage corruption, keyboard focus, counter error paths, concurrent unique hashes, and stale GET versus POST updates.

Headless Microsoft Edge also exercised normal, damn, shit, Whatever, mobile repeated-error, and reduced-motion paths using fake time and deterministic randomness supplied by the test environment. Final text, event visibility, no page errors, button visibility, viewport fit, and dismissal passed in all six scenarios. Light and dark desktop screenshots and a 375px mobile screenshot were visually inspected. Production has no forced-event query parameters or debug hooks.

The optional counter service was tested with a simulated D1 binding; it has not been deployed or verified against a live Cloudflare account. See [deployment instructions](../counter/README.md). The later service-free change below uses explicitly labeled browser-local clicks until an endpoint is configured.

## Paper palette and scrolling follow-up

The top masthead rule now holds five accessible color buttons: original, sage, mist blue, dusty rose and warm sand. Each has light and dark variants driven by the existing system color-scheme preference. The choice persists across refreshes; storage failure leaves selection usable. Active buttons expose `aria-pressed` and retain a visible keyboard focus outline.

Paper fibers now use seamless 512px SVG tiles in document-positioned layers. The texture scrolls with page content and the existing sakura relief, with no mouse parallax or scroll-event animation. Existing light/dark fiber lighting, two-seed crossfade, print suppression and reduced-motion treatment are preserved. Tiling avoids filtering one enormous document-sized bitmap. The background color also applies to the entrance curtain.

Browser verification passed for all five colors in both light and dark modes at 1280px and 375px, including persistence, adapting the same selection to a system theme change, no horizontal overflow, and paper movement matching a 450px document scroll. Screenshots were visually inspected. All 15 existing automated tests and six splash browser scenarios still pass.

## Service-free count, relief tint and stable lines

STFU now counts browser-local clicks by default. The visible label states `this browser` (or `this page` when storage is blocked), never unique IPs. Counts persist on refresh and copy rotates through playful remarks. No server, IP lookup or network request is needed. A configured Worker remains an optional separate mode.

The embossed relief uses a neutral-color filter whose base surface maps to the selected paper RGB, in all five palettes and both system themes. Highlights, shadows and alpha retain the embossed shape.

The entrance sentence is measured after fonts are ready. Breaks favor punctuation and fit approximately two-thirds of the viewport width; each visual row is reserved before typing starts. Original string offsets, typo replacement lengths and temporary insertion lengths determine which row receives text. Line planning never inserts or deletes text. Typos and backspaces cannot change the planned row count or position. Resizing deliberately replans for the new viewport. Accessible text remains the exact original sentence and reduced-motion mode is static.

Validation: 19 automated tests pass. Six browser splash scenarios and four palette scenarios pass. Six additional desktop/mobile scenarios verify unchanged row positions throughout damn/shit/Whatever playback, all 107 sentences fitting their line plans without altering characters, local count persistence across refresh, and relief base color matching each of the ten palette/theme combinations. Screenshots were visually inspected.

