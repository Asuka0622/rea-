export const NPC_TALK_RADIUS = 22;
export function nearestTalkNpc(npcs, player, radius=NPC_TALK_RADIUS) {
  if(!Number.isFinite(player?.x)||!Number.isFinite(player?.y))return null;
  let pick=null,best=radius;
  for(const npc of npcs){
    const d=Math.hypot(player.x-npc.x,player.y-npc.y);
    if(Number.isFinite(d)&&d<=best&&(!pick||d<best)){pick=npc;best=d;}
  }
  return pick;
}
