// Pure validation of authored teaching fixtures. Never executes supplied code or makes requests.
const readPath = (value, path) => path.split('.').reduce((v, key) => v?.[key], value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function reviewTransfer(lab, draft, evidence) {
  const original = lab.sources['client.json'];
  const contract = JSON.parse(lab.sources['contract.json']);
  let config;
  try {
    if (typeof draft !== 'string' || draft.length > 65536) throw new Error();
    config = JSON.parse(draft);
    if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error();
    const stack=[[config,0]];
    while(stack.length){const [value,depth]=stack.pop();if(depth>24)throw new Error();if(value && typeof value==='object')for(const child of Object.values(value))stack.push([child,depth+1]);}
  } catch { return {ok:false, checks:[{ok:false,text:'配置应是完整的 JSON 对象（不超过 64 KB、嵌套不超过 24 层）。'}], trace:[]}; }
  const checks = [], add = (ok, text) => checks.push({ok:Boolean(ok),text});
  const line = Number.isInteger(evidence) ? original.split('\n')[evidence - 1] : '';
  add(Boolean(line?.includes(contract.evidenceNeedle)), '提交的源码行能直接支持这次判断。');
  for (const [path, value] of Object.entries(contract.required)) add(equal(readPath(config,path),value), `保留功能合同：${path} = ${JSON.stringify(value)}`);
  if (contract.kind === 'secret') {
    add(!JSON.stringify(config).includes('DEMO_SECRET_'), '客户端发布副本里不再携带样本中的私密凭据。');
    for (const path of contract.remove) add(readPath(config,path) === undefined, `从发布副本移除 ${path}，遮盖或改名不等于撤回泄露凭据。`);
  } else {
    const permissions = config.permissions;
    add(Array.isArray(permissions) && permissions.length === contract.permissions.length && new Set(permissions).size === permissions.length && permissions.every(x=>contract.permissions.includes(x)), '只保留核心操作实际需要的能力声明。');
    const matches=(flow,allowed)=>flow && typeof flow==='object' && Object.keys(flow).length===2 && flow.from===allowed.from && flow.to===allowed.to;
    add(Array.isArray(config.flows) && config.flows.length===contract.flows.length && contract.flows.every(allowed=>config.flows.filter(flow=>matches(flow,allowed)).length===1), '数据只沿功能合同中的本地路径流动。');
  }
  const ok = checks.every(x=>x.ok), trace=[];
  // This is a deterministic teaching model, not a claim about a live service or installed app.
  if (ok && contract.kind === 'secret') trace.push(`请求 → ${readPath(config,contract.routePath)} → 教学服务端代办；浏览器副本无私密凭据。`);
  if (ok && contract.kind === 'permission') for (const flow of config.flows) trace.push(`${flow.from} → ${flow.to}（隔离模型）`);
  return {ok,checks,trace};
}

export function transferResult(lab, draft, evidence, hints=0, mistakes=0) {
  const review=reviewTransfer(lab,draft,evidence);
  return review.ok ? {independent:hints===0,hints,mistakes,evidence,draft} : null;
}

export function mountTransfer({h, item, onComplete, onClose, preview=false, storage=globalThis.localStorage}) {
  const lab=item.game.lab, contract=JSON.parse(lab.sources['contract.json']);
  const revision=JSON.stringify(lab.sources), key=`rea-transfer-work:${item.id}`;
  let saved={};
  try {const value=JSON.parse(storage?.getItem(key)||'null');if(value?.revision===revision)saved=value;}catch{}
  let evidence=Number.isInteger(saved.evidence)?saved.evidence:null;
  let hints=Number.isInteger(saved.hints)&&saved.hints>0?saved.hints:0;
  let mistakes=Number.isInteger(saved.mistakes)&&saved.mistakes>0?saved.mistakes:0;
  let finished=false;
  const feedback=h('div',{class:'transfer-feedback',role:'status','aria-live':'polite'});
  const evidenceText=h('p',{class:'transfer-evidence'},evidence?`证据：client.json:${evidence}`:'尚未选择证据行。');
  const editor=h('textarea',{'aria-label':'发布副本 JSON',spellcheck:'false'},typeof saved.draft==='string'?saved.draft:lab.sources['client.json']);
  const save=()=>{try{storage?.setItem(key,JSON.stringify({revision,draft:editor.value,evidence,hints,mistakes}));}catch{feedback.textContent='暂时无法保存草稿，请保持页面打开。';}};
  const submit=h('button',{type:'button',class:'btn primary',disabled:true,onclick:()=>{
    if(finished)return;
    const result=transferResult(lab,editor.value,evidence,hints,mistakes);
    if(!result){submit.disabled=true;return;}
    finished=true;submit.disabled=true;editor.disabled=true;test.disabled=true;help.disabled=true;
    save();onComplete(result);
    feedback.replaceChildren(h('h3',{},'交付完成'),h('p',{},preview?'调试副本已通过，正式委托与知识记录未改变。':hints?'这次有提示辅助，记录为练习完成。下次独立复核两份不同样本，才确认迁移能力。':'这次独立完成，已计入陌生样本记录。'),h('p',{},contract.recap));
  }},'提交修复与证据');
  const invalidate=()=>{submit.disabled=true;feedback.textContent='草稿已改变，请重新验证。';save();};
  editor.addEventListener('input',invalidate);
  const source=h('div',{class:'transfer-source','aria-label':'原始客户端源码'},...lab.sources['client.json'].split('\n').map((text,index)=>h('button',{type:'button','aria-pressed':String(evidence===index+1),'data-line':index+1,onclick:event=>{
    if(finished)return;evidence=index+1;evidenceText.textContent=`证据：client.json:${evidence}`;
    for(const button of source.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button===event.currentTarget));
    invalidate();
  }},h('small',{},String(index+1)),h('code',{},text))));
  const test=h('button',{type:'button',class:'btn',onclick:()=>{
    if(finished)return;
    const result=reviewTransfer(lab,editor.value,evidence);
    if(!result.ok)mistakes++;
    submit.disabled=!result.ok;
    feedback.replaceChildren(h('h4',{},result.ok?'隔离检查通过':'还不能交付'),h('ul',{},...result.checks.map(x=>h('li',{},`${x.ok?'通过':'待修正'}：${x.text}`))),...result.trace.map(text=>h('p',{},text)));
    save();
  }},'运行隔离检查');
  const hint=h('p',{class:'transfer-hint',hidden:true});
  const help=h('button',{type:'button',class:'btn ghost',onclick:()=>{
    if(finished)return;
    hints++;hint.hidden=false;hint.textContent=contract.hint;save();
    help.textContent='已使用提示 · 本次记录为辅助完成';
  }},'需要一点提示（计为辅助完成）');
  if(hints){hint.hidden=false;hint.textContent=contract.hint;help.textContent='已使用提示 · 本次记录为辅助完成';}
  const retry=h('button',{type:'button',class:'btn ghost',onclick:()=>{
    // Restart means another independent attempt, not hiding hints within the current attempt.
    try{storage?.removeItem(key);}catch{}
    onClose(true);
  }},'重新开始一次');
  return h('section',{class:'transfer-practice','aria-label':item.title},
    h('header',{class:'game-panel-head'},h('h2',{},item.title),h('button',{type:'button',class:'btn small',onclick:()=>{save();onClose(false);}},'暂时离开')),
    h('p',{},item.story),h('p',{class:'transfer-note'},'这是原创教学副本：读取真实样本文件，检查修改后的配置；不联网、不修改你的软件。草稿自动保存在本浏览器。'),
    h('details',{},h('summary',{},'查看功能合同'),h('pre',{},lab.sources['contract.json'])),
    h('div',{class:'transfer-columns'},h('div',{},h('h3',{},'原始源码 · 点一行作为证据'),source,evidenceText),h('div',{},h('h3',{},'修改发布副本'),editor)),
    h('div',{class:'case-actions'},test,submit,help,retry),hint,feedback);
}
