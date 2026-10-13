import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../samples/artcraft');
const entries = [
  ['photocraft','PhotoCraft','图像编辑','Photoshop','photocraft'],
  ['vectorcraft','VectorCraft','矢量绘图','Illustrator','vectorcraft'],
  ['filmcraft','FilmCraft','视频剪辑','Premiere Pro','filmcraft'],
  ['lightcraft','LightCraft','照片与 RAW','Lightroom','lightcraft'],
  ['printcraft','PdfCraft','PDF 编辑','Acrobat','pdfcraft'],
  ['effectcraft','EffectCraft','动态特效','After Effects','effectcraft'],
  ['designcraft','DesignCraft','页面排版','InDesign','designcraft'],
];
export function demoCatalog() {
  let sources = [];
  try {sources = JSON.parse(fs.readFileSync(path.join(root,'SOURCES.json'),'utf8').replace(/^\uFEFF/,''));} catch {}
  return entries.map(([id,name,category,alternative,slug])=>{
    const source = sources.find(item=>item.id===id);
    const target = path.join(root,id);
    const ready = Boolean(source && fs.existsSync(path.join(target,'Cargo.toml')));
    return {id,name,category,alternative,ready,path:ready?target:null,repository:`https://github.com/storytold/${id}`,official:`https://getartcraft.com/apps/${slug}`,commit:source?.commit||null};
  });
}
