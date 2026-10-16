# Seasonal town integration — 2026-10-16

Branch: `codex/cloud-seasonal-artwork`. Starting head: `82f823f2aa23d16dae1fdd51fb71e8baee507b50`; main inspected at `cf425e4999cbadfeb78596b2b62b60955fe67d9f`. No merge, main push, PR, or deployment is part of this work.

## Reconciled scope

`docs/concept.md`, `docs/story.md`, `docs/handoff.md`, DESIGN.md and the actual campaign/region renderer were inspected before implementation. The latest design is travel through computing eras, with Bit Town as the seasonal home base. Existing era scripts, difficulty/focus settings, real-code challenges, saves, portraits and detective cases are preserved. Older art handoff statements are project data; the user's requested pixel sampling and seasonal home base take precedence.

## Implemented

- Four supplied seasonal clear-noon baselines selected for five town regions and ten interiors. Autumn uses unsuffixed filenames. Missing variants resolve to the existing base image.
- Accessible, saved season/weather/time controls: 4 × 3 × 4 = 48 combinations. Presentation is independent of the broken story clock, so previewing night does not advance or repair the campaign clock.
- Shared low-resolution canvas weather and lighting layers. Indoor precipitation is clipped to conservative room-specific window rectangles. Night/dusk and inclement indoor weather show local warm practical-light overlays. Era maps retain authored conditions.
- Foreground occluders use the selected seasonal image through the existing foreground alpha mask; autumn leaves and the autumn water shimmer no longer contaminate other seasonal baselines. Existing collision geometry is shared between cosmetic states.
- Nearest-neighbor/pixelated sampling overrides old smoothing CSS for imported sprite sheets. Existing Lumi directional clips and frame timing stay intact. Decorative NPCs use each JSON idle clip rather than treating the whole sheet as a character. Animals use the manifest grid, frame sizes and reaction rows.
- Role speakers: library/书奶奶, tools/铁叔, post/阿信, clinic/白医生. Craft street now opens the supplied studio, arcade and woodshop rooms; the north office opens its own room and version detective case; the archive opens its own room and real stories. Their work menus connect to existing ArtCraft, real game Mod, rebuild and case surfaces.
- Ambient fisher, kite child, vegetable seller, jogger and guitarist, plus orange cat, shiba, chickens, duck, pigeon by the postman and butterfly. They do not add collision obstacles.
- Narrow south bridge walkability override fixes the painted-shadow classifier trapping arrivals on the bridge. Existing exits and campaign geometry remain intact.
- Local Chinese glyph fallback for systems without Chinese UI fonts.

## Validation

Browser plugin was not available. Playwright used a temporary Chromium binary outside the repository, with the app started using `sandbox.mjs` and isolated data in `/tmp`. No project browser dependency was added.

- Desktop 1440×900 and mobile landscape 844×390 inspected.
- Page title `REA 工作台`; meaningful first screen, no framework overlay, no captured page errors or HTTP error responses in the environment/studio interaction run.
- Selected all 48 town environment states through the controls and asserted stage state each time.
- Entered the studio from its actual map door, changed indoor weather/time, opened its ArtCraft work menu and verified the actual gallery becomes visible. Verified the chosen environment survives reload.
- Confirmed the south bridge now yields a path from (430,80) to (440,260).
- Inspected winter night town, rainy winter studio and mobile south-bank screenshots. Screenshots are temporary QA evidence, not shipped assets.
- No manifest file references are missing; sanitized JSON still has no `sourceFile` paths.
- Focused environment/region/quest/case tests pass (19 tests). Environment tests resolve actual assets for all 48 combinations across all 15 scenes.
- Full `npm test` before final integration: 83 tests, 72 pass, 9 skipped, 2 failures. One test unconditionally invokes Windows `powershell.exe` on Linux; the Electron analysis test fails because REA cannot perform its required procps process-ownership inspection in this execution environment. Neither failure was hidden or changed to a pass. Final rerun: 86 tests, 75 pass, 9 skipped, the same 2 failures.

## Remaining work — project is not complete

1. The latest main's full six-era campaign is not implemented by this change. Its explicit `ready: false` chapters and absent era maps remain unfinished; the existing China map is still documented as a placeholder. Do not advertise a finished 1.5–2.5 hour campaign.
2. Clocktower, story props/illustrations and several era/character assets still need the latest art brief's production treatment. Existing anime dialogue portraits were intentionally retained.
3. Baselines contain painted sunlight and shadows. Runtime tinting does not remove that baked lighting. Convincing fully relit night/rain interiors require authored light/shadow/window layers; current overlays are an initial environment implementation, not finished cinematic relighting.
4. Window masks, light positions, room furniture collisions and every seasonal foreground need a thorough scene-by-scene visual pass. The browser interaction run covered the studio; asset resolution tests cover the other rooms, not full visual certification of all 720 scene/state combinations.
5. Ambient NPCs animate idle poses; they do not yet walk collision-aware daily schedules. Animals react to clicks but do not implement the proposed full ambient vignettes.
6. The six original user reference images were not attached in this session. The synced artwork was inspected and the written direction followed, but direct six-image fidelity review is still outstanding.
7. Mobile landscape was inspected. Portrait retains main's rotate-or-web-mode screen; iOS/Android devices and screen readers were not tested.
8. Seasonal water currently stays in the painted baseline outside autumn; richer per-season animated water needs a matching seasonal animation source. This avoids visibly overlaying autumn river colors on winter/spring/summer.

## 地图接入状态同步 — 2026-10-16

本次状态核对从分支提交 `923b0771f120911d44ed2eff0489e079492a8b40` 开始。五区地图和地点标记已在 `public/game-shell.js` 中提供，但目前仍是区域卡片与地点标记驱动的跳转。独立的 `public/game-regions.js` 出入口、出生点与建筑门口数据尚未接入该运行时地图；跨区步行寻路、碰撞/遮挡重建和 NPC 地点绑定仍未完成。README 已同步记录这一边界。

