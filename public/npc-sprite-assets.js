// Runtime aliases for delivered assets; review-only candidates are never searched.
export const NPC_SPRITE_ALIASES = {
  duoduo: "anim-duoduo", "wang-nainai": "anim-grandma", "smith-release": "anim-smith"
};
export function npcSpriteAsset(npc, has) {
  const normal="sprite-"+(npc.sprite||npc.id);
  if(has(normal))return normal;
  const alias=NPC_SPRITE_ALIASES[npc.id];
  return alias&&has(alias)?alias:null;
}
export function npcSpriteLayout(meta) {
  const frame=meta?.frame, sheet=meta?.sheet;
  if(!Array.isArray(frame)||!Array.isArray(sheet)||![...frame,...sheet].every(n=>Number.isFinite(n)&&n>0))return null;
  return {columns:sheet[0],rows:sheet[1],aspect:frame[0]/frame[1]};
}
export function npcSpriteAnimation(meta, talking) {
  const layout=npcSpriteLayout(meta);
  if(!layout)return null;
  const anim=(talking&&meta.animations?.talk)||meta.animations?.idle;
  if(!anim||!Number.isInteger(anim.row)||anim.row<0||anim.row>=layout.rows||!Number.isInteger(anim.frames)||anim.frames<1||anim.frames>layout.columns)return null;
  return anim;
}
