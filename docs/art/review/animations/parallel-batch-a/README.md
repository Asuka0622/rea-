# Parallel walking batch A — review status

This batch covers `apprentice`, `barista`, `cobbler`, and `disk-vendor`. It is a review-only deliverable: no runtime art was changed, and nothing here has been committed.

## Output layout

Each character folder contains the original sprite and metadata snapshot, four independently generated 8-frame direction strips, an assembled 8×6 atlas candidate with JSON, physical-size contact previews, and frame 1/5 side-by-side checks. The assembled atlas preserves the original idle/talk rows and uses 96×192 px physical frames (16×32 logical px), 8 frames per walk direction at 75 ms.

The chosen visual/camera references were the map camera crop and user-approved baker left-walk strip. The source strips are retained under each character's `sources/` folder. The v2 side strips are also preserved with `-v2` filenames.

## Acceptance result

| Character | Down | Up | Left | Right | Full atlas |
|---|---|---|---|---|---|
| apprentice | candidate, visual review only | candidate, visual review only | rejected | rejected | rejected |
| barista | candidate, visual review only | candidate, visual review only | rejected | rejected | rejected |
| cobbler | candidate, visual review only | candidate, visual review only | rejected | rejected | rejected |
| disk-vendor | candidate, visual review only | candidate, visual review only | rejected | rejected | rejected |

Down/up strips looked broadly consistent in the contact previews, but they are not approved for integration because each character's four-direction atlas fails side-walk review. For both v1 and v2, frame 1 and frame 5 do not clearly exchange the leading leg. The required opposite maximum stride and opposite arm pose are not reliably demonstrated, and the frame 4→5 transfer into a new leading leg is not legible enough. This can read as foot shuffling/gliding, so all eight left/right rows are rejected despite the left/right facing being independently drawn and visually distinguishable.

Barista's cup remains recognizable in the reviewed strips, but that does not override the gait failure. The other characters' attached tools/clothing details remain visible in the source strips; the side rows are still rejected on gait phase.

## Generation limit

A third side-strip attempt was started with the stricter six-beat phase sequence (A maximum stride → closing steps → weight transfer → opposite maximum stride B → closing steps → repeat). ImageGen returned five partial strips before the built-in generator stopped with HTTP 429 `usage_limit_reached` (`resets_in_seconds: 46629`). The partials were not assembled or represented as accepted output. No alternative generation path was used.

## Per-character files

See each character folder's `README.md` for its exact per-direction status. The assembled `sprite-*-walk-8f-candidate.png` files are retained for inspection only; their JSON status is `rejected`. Do not copy these atlases into `public/` until the side strips pass the frame 1/5 and frame 4→5 checks.
