# 人物模型 Mod 扩展 — 2026-10-13

User request: extend the workbench, explain required tools, investigate official MCP integrations. Scope: learning/tool guide and actual local Mod directory inspection, preserving incumbent RPG world and distinct ArtCraft/game galleries. No external MCP installation, client configuration change, game execution or renderer injection performed.

## Verified source findings

Blender Lab official MCP verified through https://www.blender.org/lab/mcp-server/ (official page also fetched through PowerShell; source and extension links point to projects.blender.org/lab/blender_mcp). Requires Blender 5.1+ and external add-on, Server and MCP client. Setup subpage blocked by access verification; exact startup configuration not asserted. Official MCP and 3DMigoto model export plug-in interoperability not tested.

ahujasid/mcp-for-blender explicitly community/unaffiliated. Krita SanSaSane and Painter jwang47 projects are community implementations, not vendor-official MCPs. No author/vendor official MCP found in this investigation for GIMI/XXMI or Microsoft texconv; not a claim that none can exist. Plugin directory search Blender/Painter returned no entries. Source dates, URLs, scope and limits stored in docs/model-mods/guide.json and README.md.

## Validation

- npm test: 32/32 passed, including prior regression checks.
- New checks distinguish found/missing/dynamic/outside-directory filename references and resolve paths relative to their INI; generic INI and oversized input rejected; scanner inert; guide/API authentication and report storage verified.
- Browser: six tool rows and official link correct; expanded Blender provenance/setup/AI task work; clipboard action succeeds. Test fixture with one existing buffer and one missing DDS proceeds through file analysis, chest and actual report. Fixture is test-only, not a genuine Genshin model; no game compatibility claimed.
- No console warnings/errors. No horizontal document overflow at 1440, 390 or actual user1280 viewport.
- Raw UI report saved under D:\gpt\rea\data\game-mods\results. Test reports isolated in test sandbox. Service running hidden on localhost7321.

## Fresh independent finish review

disposition: ship

persistence: PRODUCT records scope/limits, DESIGN incumbent preserved; comp, card and build state inapplicable to ordinary extension. No detector ran (session launcher unavailable).

fidelity: three valid full-page captures; typography, material, palette, purpose, gallery/sidebar integration, five-step story, six ruled tool rows, responsive actions and truthful MCP status match contract. No new floor violations.

ceiling: reached for scoped extension.

material_fixes: none.

keep: ruled list, MCP provenance and connection limits, mobile reflow, actual inspection-to-chest flow.

Required captures: model-mods-desktop.png, model-mods-mobile.png, model-mods-user-1280.png. Supplemental preview: model-mods-preview.png.

## Fresh documenter comparison

Read-only comparison preserved DESIGN.md and .impeccable/design.json. Checked product, model module, HTML, RPG/base CSS, guide JSON/README and all three captures. Incumbent palette/type/layout/components retained; no new visual world or system change.

Preexisting drift recorded without repair: DESIGN describes fixed header while CSS uses relative; mobile journal title ends at24px versus documented27px; existing --field/--midnight references lack declarations in checked stylesheets. These preceded this extension; no unrequested system refresh performed.
