/** Decorative residents use idle clips, leaving routes and collision geometry untouched. */
const RESIDENTS = {
  center: [['librarian', 250, 193, '书奶奶', '图书馆里有入门教程；上方的小词典可以随时查概念。'], ['smith', 776, 200, '铁叔', '分析引擎按文件类型选择，先检查已安装的工具。'], ['postman', 239, 372, '阿信', '驿站可以把分析工具接入 AI；报告中的结论要对照证据。'], ['doctor', 810, 388, '白医生', '诊所检查设备和工具状态，可选工具缺失并不等于设备故障。'], ['kid', 570, 345, '风筝小孩', '桥上的风可真大！'], ['vendor', 365, 350, '卖菜大婶', '新鲜的蔬菜，不占大家走路的地方。']],
  homes: [['jogger', 505, 277, '晨跑姐姐', '沿路慢跑，再回广场。'], ['archivist', 807, 480, '老秦', '真实世界故事在档案委托里。读故事时，也要分清证据和推测。']],
  craft: [['painter', 375, 183, '彩姐', '来画室试试 ArtCraft。'], ['gamer', 785, 181, '像素哥', '游戏厅里有真实游戏 Mod 的例子。'], ['carpenter', 345, 425, '阿木', '做东西先拆成小功能，一步一步验证。']],
  north: [['clerk', 552, 240, '周姐', '版本变化要靠对比，不靠猜。']],
  south: [['fisher', 738, 224, '钓鱼老人', '慢一点，别惊走鱼。'], ['musician', 230, 331, '街头吉他手', '在河边听一曲吧。']],
};
const ANIMALS = {
  center: [['cat', 552, 300], ['pigeon', 252, 365]], homes: [['dog', 550, 325], ['chicken', 690, 308]],
  south: [['duck', 844, 240], ['butterfly', 260, 245]],
};
export function mountTownLife({ host, region, has, say }) {
  let stopped = false, frame = 0;
  const entries = [], elements = [], timers = [];
  const labels = {cat:'橘猫',dog:'柴犬',chicken:'小鸡',duck:'鸭子',pigeon:'阿信的白鸽',butterfly:'蝴蝶'};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const add = (id, x, y, label, line, animal = null) => {
    const file = animal ? `animal-${id}` : `anim-${id}`;
    if (!has(file)) return;
    const el = document.createElement('button'); el.type = 'button'; el.className = 'game-resident';
    el.setAttribute('aria-label', label); el.title = label;
    el.style.cssText = `left:calc(${x}px * var(--px));top:calc(${y}px * var(--px));z-index:${y};background-image:url(/art/pixel/${file}.png)`;
    el.onclick = () => {
      if (animal) { const entry = entries.find(e=>e.el===el); if (entry) { entry.clip.row = animal.reactionRow; timers.push(setTimeout(()=>{entry.clip.row=0},1400)); } }
      say([{ text: line, who: animal ? 'lumi' : id }]);
    };
    host.append(el); elements.push(el);
    const setup = (data) => {
      if (stopped) return;
      const [cols, rows] = data.sheet || [4,3];
      const clip = data.animations?.idle || { row: 0, frames: 4, ms: 240 };
      const [w,h] = animal?.frameSize || [16,32];
      el.style.width = `calc(${w}px * var(--px))`; el.style.height = `calc(${h}px * var(--px))`;
      el.style.backgroundSize = `${cols*100}% ${rows*100}%`;
      entries.push({ el, cols, rows, clip });
    };
    if (animal) setup({});
    else fetch(`/art/pixel/${file}.json`).then(r=>r.ok?r.json():null).then(data=>data&&setup(data)).catch(()=>{});
  };
  for (const row of RESIDENTS[region] || []) add(...row);
  fetch('/art/pixel/animal-manifest.json').then(r=>r.json()).then(data=>{
    if (stopped) return;
    for (const [id,x,y] of ANIMALS[region] || []) {
      const animal=data.animals.find(a=>a.id===id); if(animal) add(id,x,y,labels[id] || id,'小动物在这里安静地休息。',animal);
    }
  }).catch(()=>{});
  const tick = (now) => {
    if(stopped) return;
    for(const {el,cols,rows,clip} of entries) {
      const ms=Array.isArray(clip.ms)?clip.ms:Array(clip.frames).fill(clip.ms);
      let t=reduced?0:now%ms.reduce((a,b)=>a+b,0),index=0;
      while(index<ms.length-1&&t>=ms[index])t-=ms[index++];
      el.style.backgroundPosition=`${cols>1?index/(cols-1)*100:0}% ${rows>1?clip.row/(rows-1)*100:0}%`;
    }
    if(!reduced || !entries.length) frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return ()=>{stopped=true;cancelAnimationFrame(frame);elements.forEach(el=>el.remove());timers.forEach(clearTimeout);};
}
