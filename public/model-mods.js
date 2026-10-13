export function mountModelMods({h,api,analyze,busy,toast,showHome,isPro,isSimple=()=>false}) {
  const library=document.querySelector('#model-mods'),body=document.querySelector('#model-mod-body');
  let data=null,goal='texture',step=0;
  const link=(label,url)=>h('a',{href:url,target:'_blank',rel:'noopener noreferrer'},label);
  const open=()=>{showHome();library.open=true;library.scrollIntoView({behavior:'smooth',block:'start'});library.querySelector('summary').focus({preventScroll:true});};
  const status=h('p',{role:'status','aria-live':'polite',class:'model-status'},'选择现有 Mod 的副本进行检查。');
  const input=h('input',{id:'model-mod-path',name:'path',placeholder:'例如 D:\\gpt\\rea\\我的模型Mod',autocomplete:'off',spellcheck:'false',required:true});
  function start(target){if(busy())return toast('探索进行中，请先停止当前探索');library.open=false;return analyze(target,['inspect-model-mod']);}
  const form=h('form',{class:'model-path-form',onsubmit:event=>{event.preventDefault();const target=input.value.trim().replace(/^"(.*)"$/,'$1');if(target)start(target);}},h('label',{for:'model-mod-path'},'已解压的模型 Mod 文件夹'),h('div',{class:'model-path-actions'},input,h('button',{class:'btn primary',type:'submit'},'检查 Mod 文件')));
  const pick=h('button',{class:'btn primary',type:'button',onclick:async event=>{
    if(busy())return toast('探索进行中，请先停止当前探索');const button=event.currentTarget;button.disabled=true;status.textContent='请在弹出的窗口中选择已解压的 Mod 文件夹。';
    try{const result=await api('/api/pick',{method:'POST',body:{kind:'folder'}});if(result.path){input.value=result.path;start(result.path);}else status.textContent='未选择文件夹，也可粘贴路径。';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  }},'选择 Mod 文件夹并检查');
  // The online-game risk leads both modes, before any step or tool; it is not a footnote.
  function riskBox(){const r=data.risk;if(!r)return null;return h('section',{class:'model-risk',role:'note','aria-labelledby':'model-risk-title'},h('h3',{id:'model-risk-title'},r.title),h('ul',{},r.points.map(point=>h('li',{},point))),h('p',{class:'model-risk-scope'},r.scope),h('p',{class:'model-risk-safe'},r.safePractice));}
  const withBoundary=text=>data.learningBoundary?text+'\n\n'+data.learningBoundary:text;
  function taskBlock(text,title,expanded=false){const area=h('textarea',{readonly:true,'aria-label':'模型 Mod AI 学习任务',rows:isPro()?7:5},text);return h('details',{class:'model-task',open:expanded},h('summary',{},title),area,h('button',{class:'btn',type:'button',onclick:async()=>{try{await navigator.clipboard.writeText(text);toast('已复制模型 Mod 学习任务');}catch{area.focus();area.select();toast('请在选中的文本上按 Ctrl+C 复制');}}},'复制 AI 学习任务'));}
  function sources(){return h('details',{class:'model-references'},h('summary',{},'核查来源与范围'),h('ul',{},data.sources.map(source=>h('li',{},link(source.title,source.url),h('p',{},source.finding)))),h('p',{},data.searchScope),h('p',{class:'case-local-path'},'本地指南：'+data.localGuide));}
  function toolRow(tool,simple=false){const descriptions={blender:'改人物外形的建模软件，负责模型和动作适配。','import-export':'让 Blender 能读入、导出游戏需要的模型文件。',xxmi:'在游戏运行时加载 Mod 的工具。用于原神官服有封号风险，见本页顶部说明。',krita:'绘图软件，用来改衣服颜色、图案等贴图。'};
    return h('div',{class:'demo-row model-tool',role:'listitem'},h('div',{class:'demo-description'},h('h4',{},tool.name),h('p',{},simple?descriptions[tool.id]:tool.need+' · '+tool.purpose),h('p',{class:'model-mcp-status'},tool.mcpStatus),!simple&&h('details',{class:'mod-source'},h('summary',{},'来源与接入说明'),h('p',{},tool.publisher+' · '+tool.detail),h('p',{},tool.automation),tool.mcpSource&&link('MCP 源仓库',tool.mcpSource))),h('div',{class:'demo-actions'},link(simple?'查看工具':'工具来源',tool.url),tool.mcpUrl&&link(tool.mcpKind==='official'?'官方 MCP':'社区 MCP',tool.mcpUrl)));
  }
  const noviceSteps=()=>goal==='texture'?[
    ['准备一份 Mod 副本','先把现有 Mod 文件夹复制一份，记下作者和适用游戏版本。贴图就是人物表面的颜色和图案；先做小范围换色比较容易观察效果。'],
    ['检查文件是否齐全',`选择已解压的 Mod 文件夹。${isSimple()?'检查后查看报告':'检查后打开宝箱看报告'}；如果提示某张贴图或某个文件没找到，先按报告核对文件名和位置。`],
    ['用绘图工具改贴图','在 Krita 或你熟悉的绘图软件中修改贴图。先只改一处颜色，保留原始文件；遇到 DDS 无法打开或导出时，再按工具说明转换格式。'],
    ['导出后再检查一次','把修改后的贴图放回副本中，再检查文件。文件齐全后仍需预览效果，并核对对应游戏和加载器版本；工作台不会自动替你换装。']
  ]:[
    ['准备模型与 Mod 副本','先确定目标角色，准备有权使用的模型和现有 Mod 的副本。完整替换人物还涉及骨骼和动作，建议先从一小处外形修改开始。'],
    ['检查文件是否齐全',`选择已解压的 Mod 文件夹，${isSimple()?'查看检查结果':'开宝箱阅读结果'}。模型文件决定外形，贴图决定表面；报告会指出哪些引用的文件还没找到。`],
    ['在 Blender 中修改外形','先确认导入导出插件与你的 Blender 版本兼容，再编辑模型。骨骼权重决定身体怎样跟着动作变形，需要实际检查。'],
    ['导出并检查动作与资源','用对应插件导出到副本，重新检查文件。在 Blender 中查看材质与动作，再做适用环境的测试；文件检查通过不代表模型适配成功。']
  ];
  function noviceTask(){return withBoundary(`我是新手，想${goal==='texture'?'先改人物衣服的颜色或图案':'先改人物模型的一小处外形'}。请根据我提供的 Mod 检查报告，用大白话解释每种文件的作用，先指出缺失文件并告诉我怎样核对。一次只给一个能完成的步骤，说明需要哪个工具、完成后怎样检查。遇到模型骨骼、DDS 或 MCP 时先解释意思；区分已经验证的内容和需要实际预览的内容。不要假设工作台已经连接 Blender 或能自动导出模型。`);}
  function renderNovice(){
    const steps=noviceSteps(),panel=h('section',{class:'model-beginner-step','aria-label':'新手模型 Mod 当前步骤'});
    function drawStep(){const [title,text]=steps[step];panel.replaceChildren(...[h('p',{class:'model-step-count',role:'status','aria-live':'polite'},`第 ${step+1} 步 / 共 ${steps.length} 步`),h('h3',{},title),h('p',{},text),step===1&&h('div',{class:'model-check-controls'},pick,h('details',{open:!!input.value},h('summary',{},'我知道文件夹路径'),form),status),h('div',{class:'mod-controls'},h('button',{class:'btn',type:'button',disabled:step===0,onclick:()=>{step--;drawStep();}},'上一步'),h('button',{class:'btn',type:'button',disabled:step===steps.length-1,onclick:()=>{step++;drawStep();}},'下一步'))].filter(Boolean));}
    drawStep();
    const ids=goal==='texture'?['krita','xxmi']:['blender','import-export','xxmi'];
    body.replaceChildren(riskBox(),h('h3',{},'新手指南 · 一步一步来'),h('p',{},'先选你想做的事，再跟着当前步骤准备和检查。'),h('div',{class:'mod-controls',role:'group','aria-label':'模型 Mod 修改目标'},h('button',{class:'btn',type:'button','aria-pressed':String(goal==='texture'),onclick:()=>{goal='texture';step=0;renderNovice();}},'改贴图：颜色与图案'),h('button',{class:'btn',type:'button','aria-pressed':String(goal==='model'),onclick:()=>{goal='model';step=0;renderNovice();}},'改模型：人物外形')),
      panel,h('h3',{},'这次需要的工具'),h('div',{role:'list','aria-label':'新手当前目标所需工具'},ids.map(id=>toolRow(data.tools.find(tool=>tool.id===id),true))),
      h('details',{class:'model-setup'},h('summary',{},'MCP 是什么？现在需要装吗？'),h('p',{},'MCP 是让 AI 操作其他软件的连接方式。先学会准备文件、检查和修改，再按需要接入；它不是换模型的加载器。'),h('p',{},'Blender Lab 有官方 MCP，要求 Blender 5.1+，需要另装扩展与服务。模型导出插件的兼容性还要单独确认。'),link('查看 Blender 官方 MCP',data.tools.find(tool=>tool.id==='blender').mcpUrl)),
      taskBlock(noviceTask(),'让 AI 陪我完成当前目标'),h('p',{class:'demo-note'},data.connectionState),h('p',{class:'demo-note'},data.limitations.join(' ')),h('p',{class:'demo-note'},'熟悉后可切换顶部「专业」，查看资源字段、全部工具和 MCP 接入细节。'),sources());
  }
  function renderPro(){
    body.replaceChildren(riskBox(),h('h3',{},'专业工作区 · 资源与工具链'),h('p',{},data.summary),h('p',{class:'demo-note'},`来源核对：${data.checkedAt} · ${data.connectionState}`),
      h('h3',{},'检查模型 Mod 资源'),h('p',{},'解析 INI 的 filename、配置段与 hash，定位相对资源路径；直接查看报告、原始 JSON 与等价命令。'),form,pick,status,
      h('details',{class:'model-scan-spec',open:true},h('summary',{},'扫描范围与限制'),h('ul',{},['支持 INI 配置与 VB / IB / BUF / FMT、DDS、BLEND、OBJ、glTF / GLB 文件盘点。','filename 相对于其 INI 解析；动态表达式单独标记，目录外引用与符号链接不读取。','最多 5,000 文件、4 MiB INI 文本，单个 INI 最多 1 MiB；报告表格最多展示 150 行，完整证据在原始 JSON。','hash 仅按声明提取，重复 hash 不直接判定冲突；未解码拓扑、权重、贴图或验证游戏兼容性。'].map(text=>h('li',{},text))),h('p',{},'CLI 用法（把占位路径替换为自己的目录）：'),h('pre',{class:'code'},'node lib/model-mods.mjs "<Mod 目录>"')),
      h('h3',{},'完整工具链与 MCP'),h('p',{class:'demo-note'},'软件官方、Mod 工具作者与社区 MCP 分开标明；“未找到”仅表示本次核查未发现。'),h('div',{role:'list','aria-label':'专业模型工具链与 MCP 来源'},data.tools.map(tool=>toolRow(tool))),
      h('details',{class:'model-setup',open:true},h('summary',{},'Blender 官方 MCP 接入与验证'),h('ol',{},data.mcpSetup.map(text=>h('li',{},text))),h('p',{},link('Blender 官方说明',data.tools.find(x=>x.id==='blender').mcpUrl),' · ',link('官方 Setup 文档',data.mcpSetupUrl)),h('p',{class:'demo-note'},data.communityAlternative.note+' '+data.communityAlternative.name),link('社区替代项目',data.communityAlternative.url)),
      h('details',{class:'model-production'},h('summary',{},'模型制作与导出检查清单'),h('ol',{class:'model-stages'},data.stages.map(x=>h('li',{},h('strong',{},x.title),h('p',{},x.text))))),taskBlock(withBoundary(data.aiTask),'复制给 AI 的技术任务',true),h('p',{class:'demo-note'},data.limitations.join(' ')),sources());
  }
  function refresh(){if(!data)return;body.dataset.guideMode=isPro()?'pro':'beginner';const summary=library.querySelector('summary');summary.replaceChildren('人物模型 Mod ',h('span',{},isPro()?'资源检查 · 工具链 · MCP 接入':'新手步骤 · 简单说明 · 文件检查'));isPro()?renderPro():renderNovice();}
  async function load(){try{data=await api('/api/model-mods/guide');refresh();}catch(error){body.replaceChildren(h('p',{role:'alert'},'模型 Mod 指南加载失败：'+error.message),h('button',{class:'btn',onclick:load},'重试'));}}
  load();return {open,refresh};
}
