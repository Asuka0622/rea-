import {gameModCatalog,buildModFiles,writeModFiles} from '../lib/game-mods.mjs';
for(const item of gameModCatalog()) {
  if(item.ready) {console.log('保留已有样本：'+item.path);continue;}
  writeModFiles(item.path,buildModFiles(item.id).files);
  console.log('已生成：'+item.path);
}
