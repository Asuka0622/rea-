# Parallel batch C · NPC walking candidates

2026-10-18 · Pigeon Uncle (`pigeon-uncle`), Student (`student`), Watchmaker (`watchmaker`)

Specs: preserve original character design and all non-walk rows; 8 frames per direction at 75 ms; directions ordered down / up / left / right. References used: the approved Baker left-walk strip and map-camera crop. Candidate sheets were normalized to the assembler's 8-cell grid, then assembled with `scripts/assemble-walk-sprite-candidate.py`. See each character folder's `contact-walk-8f-v2.png` and `phase-check-frame1-vs5.png`.

## Strict phase review

| Character | Direction | Status | Review |
|---|---|---|---|
| Pigeon Uncle | Down / up | Hold | Identity and feed pouch are stable; frame 1 vs 5 does not prove a clear leg-and-arm exchange. |
| Pigeon Uncle | Left / right | Reject | Profiles face the requested directions and keep the pouch, but the leading leg is not clearly exchanged at frame 5. The first atlas's left row also faced right and was rejected. |
| Student | Down / up | Hold | Uniform and backpack charm are preserved; opposite lead-leg phase is not clear enough at frames 1 and 5. |
| Student | Left / right | Reject | Both profiles face correctly and the charm stays fixed, but frame 1 and frame 5 retain essentially the same lead leg; arms do not exchange clearly with the legs. |
| Watchmaker | Down | Candidate pass | Front-facing identity, monocle and waist tool are stable; frames 1 and 5 visibly exchange the leading foot and counter-swinging arm. Copy is in `passed-directions/watchmaker/`. |
| Watchmaker | Up | Hold | Tool stays at the waist, but the back-view foot exchange is ambiguous. |
| Watchmaker | Left / right | Reject | Side profiles and monocle are correctly oriented and the tool stays fixed; the frame 1 to 5 leading-leg change is still not clear enough. |

**No complete four-direction atlas in this batch is cleared for runtime integration.** The assembled `*-candidate.png` files are review-only. Image generation hit its usage limit before the held/rejected directions could be regenerated; do not infer approval from the available candidate sheets.
