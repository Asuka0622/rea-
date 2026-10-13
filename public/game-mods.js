export function mountGameMods({h,api,token,analyze,busy,toast,showHome}) {
  const library=document.querySelector('#game-mods'),list=document.querySelector('#game-mod-list'),editor=document.querySelector('#game-mod-editor');
  let selected=null,items=[],inputs=[],requestVersion=0;
  const open=()=>{showHome();library.open=true;library.scrollIntoView({behavior:'smooth',block:'start'});library.querySelector('summary').focus({preventScroll:true});};
  const values=()=>Object.fromEntries(inputs.map(([f,input])=>[f.key,Number(input.value)]));
  function select(item) {
    requestVersion++;selected=item;inputs=[];
    list.querySelectorAll('button[data-mod]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mod===item.id)));
    const status=h('p',{id:'mod-status',role:'status','aria-live':'polite'},'调整数值，再生成修改预览。');
    const output=h('div',{id:'mod-output'}),frame=h('div',{id:'mod-play'});
    const fields=item.fields.map(f=>{
      const input=h('input',{type:'number',id:'mod-value-'+f.key,name:f.key,min:f.min,max:f.max,step:f.step,value:f.value,required:true,oninput:()=>{requestVersion++;output.replaceChildren();frame.replaceChildren();status.textContent='数值已改变，请重新生成预览。';}});
      inputs.push([f,input]);return h('div',{class:'mod-field'},h('label',{for:input.id},f.label),input,h('small',{},`${f.min}～${f.max} · 默认 ${f.value}`));
    });
    const valid=()=>inputs.every(([,input])=>input.reportValidity());
    const controls=h('div',{class:'mod-controls'},
      h('button',{class:'btn primary',type:'submit'},'生成修改预览'),
      h('button',{class:'btn',type:'button',onclick:()=>{inputs.forEach(([f,input])=>{input.value=f.value;});requestVersion++;output.replaceChildren();frame.replaceChildren();status.textContent='已恢复练习默认值。';}},'恢复默认值'),
      h('button',{class:'btn',type:'button',onclick:async event=>{
        if(!valid())return;if(busy())return toast('探索进行中，请先停止当前探索');
        const button=event.currentTarget;button.disabled=true;
        try {const draft=await api('/api/game-mods/build',{method:'POST',body:{id:item.id,values:values()}});library.open=false;await analyze(draft.path);}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
      }},'分析当前版本'),
      h('button',{class:'btn',type:'button',onclick:async event=>{
        if(!valid())return;const button=event.currentTarget;button.disabled=true;
        try {const response=await fetch('/api/game-mods/export',{method:'POST',headers:{'X-Workbench-Token':token,'Content-Type':'application/json'},body:JSON.stringify({id:item.id,values:values()})});if(!response.ok)throw new Error((await response.json()).error||'导出失败');const location=response.headers.get('X-Artifact-Path');const url=URL.createObjectURL(await response.blob());const link=h('a',{href:url,download:item.id+'.zip'});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='已保存到 '+location+'；包内 README 包含导入方法。';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
      }},'导出 ZIP'));
    const form=h('form',{class:'mod-form',onsubmit:async event=>{
      event.preventDefault();if(!valid())return;const version=++requestVersion;
      const button=controls.querySelector('button[type=submit]');button.disabled=true;status.textContent='正在生成当前数值的文件…';
      try {const result=await api('/api/game-mods/preview',{method:'POST',body:{id:item.id,values:values()}});if(version!==requestVersion||selected.id!==item.id)return;
        output.replaceChildren(h('h4',{},'修改前 → 修改后'),h('table',{class:'mod-comparison'},h('thead',{},h('tr',{},['参数','默认值','当前值'].map(text=>h('th',{},text)))),h('tbody',{},item.fields.map(f=>h('tr',{},h('td',{},f.label),h('td',{},f.value),h('td',{},result.values[f.key]))))),
          h('h4',{},'实际生成的 Mod 文件'),...result.files.map(file=>h('details',{class:'mod-source'},h('summary',{},file.path),h('pre',{},file.text||'原创 32×32 RGBA 像素贴图，已包含在 ZIP 中。'))));
        frame.replaceChildren();if(result.playHtml)frame.append(h('h4',{},'试玩当前数值'),h('iframe',{title:'像素战斗 Demo 试玩',sandbox:'allow-scripts',srcdoc:result.playHtml}));
        status.textContent=result.playHtml?'文件已生成，下方可试玩当前数值。':'文件已生成；数值效果需导入目标游戏验证。';
      }catch(error){if(version===requestVersion)status.textContent=error.message;}finally{button.disabled=false;}
    }},h('div',{class:'mod-fields'},fields),controls);
    editor.replaceChildren(h('h3',{tabindex:'-1'},item.name+' · 制作练习'),h('p',{},item.lesson),form,status,output,frame,h('details',{class:'mod-install'},h('summary',{},'如何导入与测试'),h('p',{},item.install),h('p',{},'这是工作台原创教学样本。Luanti / Mindustry 模组未在真实游戏内加载验证。')));
    editor.hidden=false;editor.scrollIntoView({behavior:'smooth',block:'start'});editor.querySelector('h3').focus({preventScroll:true});
  }
  async function load() {
    try {({items}=await api('/api/game-mods'));list.replaceChildren(...items.map(item=>h('div',{class:'demo-row',role:'listitem'},h('div',{class:'demo-description'},h('h3',{},item.name),h('p',{},item.game+' · '+item.description),h('small',{},item.lesson)),h('div',{class:'demo-actions'},h('button',{class:'btn small',type:'button','data-mod':item.id,'aria-pressed':'false',onclick:()=>select(item)},'制作与改数值'),h('button',{class:'btn small',type:'button',disabled:!item.ready,'aria-label':'分析 '+item.name+' 示例',onclick:()=>{if(busy())return toast('探索进行中，请先停止当前探索');library.open=false;analyze(item.path);}},'分析示例'),item.docs&&h('a',{href:item.docs,target:'_blank',rel:'noopener noreferrer'},'官方制作文档')))));
    }catch(error){list.replaceChildren(h('p',{role:'alert'},'游戏例子加载失败：'+error.message),h('button',{class:'btn',onclick:load},'重试'));}
  }
  load();return {open};
}
