export function mountGameCases({h,api,analyze,busy,toast,showHome}){
  const library=document.querySelector('#game-mods'),list=document.querySelector('#game-mod-list'),editor=document.querySelector('#game-mod-editor');let request=0;
  const open=()=>{showHome();library.open=true;library.scrollIntoView({behavior:'smooth',block:'start'});library.querySelector('summary').focus({preventScroll:true});};
  const scan=item=>{if(busy())return toast('探索进行中，请先停止当前探索');library.open=false;analyze(item.path);};
  async function select(item){const version=++request;list.querySelectorAll('[data-case]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.case===item.id)));editor.hidden=false;editor.replaceChildren(h('p',{role:'status'},'正在读取 '+item.name+' 的学习入口…'));
    try{const guide=await api('/api/game-cases/guide',{method:'POST',body:{id:item.id}});if(version!==request)return;
      editor.replaceChildren(h('h3',{tabindex:'-1'},item.name+' · 学习入口'),h('p',{},item.note),h('p',{class:'demo-note'},`作者：${item.author} · 许可证：${item.license} · 固定提交 ${item.commit.slice(0,12)}`),h('p',{class:'case-local-path'},'本地源码：'+item.path),
        ...guide.files.map(file=>h('details',{class:'mod-source'},h('summary',{},file.purpose+' · '+file.path+(file.present?'':'（未找到）')),h('p',{},file.present?'上游文件已保存在本地。展开的代码行来自当前快照。':'该固定版本没有找到此文件，请查看原仓库。'),file.lines.length>0&&h('pre',{},file.lines.map(line=>`${line.line}: ${line.text}`).join('\n')),h('a',{href:item.repository+'/blob/'+item.commit+'/'+(item.subdir?item.subdir+'/':'')+file.path,target:'_blank',rel:'noopener noreferrer'},'打开上游文件'))),
        h('h4',{},'交给 AI 的任务'),h('p',{},item.task),h('div',{class:'mod-controls'},h('button',{class:'btn primary',disabled:!item.ready,onclick:()=>scan(item)},'分析本地源码'),h('a',{href:item.repository+'/tree/'+item.commit+(item.subdir?'/'+item.subdir:''),target:'_blank',rel:'noopener noreferrer'},'查看原仓库')),h('p',{class:'demo-note'},'本地只读分析，未编译或在游戏内验证。这些项目是学习材料，尚无证据表明它们使用 REA 制作。'));
      editor.scrollIntoView({behavior:'smooth',block:'start'});editor.querySelector('h3').focus({preventScroll:true});
    }catch(error){if(version===request)editor.replaceChildren(h('p',{role:'alert'},error.message),h('button',{class:'btn',onclick:()=>select(item)},'重试'));}
  }
  async function load(){try{const {items}=await api('/api/game-cases');list.replaceChildren(...items.map(item=>h('div',{class:'demo-row',role:'listitem'},h('div',{class:'demo-description'},h('h3',{},item.name),h('p',{},item.type+' · '+item.description),h('small',{},`${item.author} · ${item.license||'等待来源信息'}${item.ready?' · 源码已就绪':' · 源码未就绪'}`)),h('div',{class:'demo-actions'},h('button',{class:'btn small',disabled:!item.ready,'data-case':item.id,'aria-pressed':'false',onclick:()=>select(item)},'查看学习入口'),h('button',{class:'btn small',disabled:!item.ready,'aria-label':'分析 '+item.name+' 源码',onclick:()=>scan(item)},'分析源码'),h('a',{href:item.repository,target:'_blank',rel:'noopener noreferrer'},'原仓库')))));
    }catch(error){list.replaceChildren(h('p',{role:'alert'},'真实案例加载失败：'+error.message),h('button',{class:'btn',onclick:load},'重试'));}}
  load();return {open};
}
