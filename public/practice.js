import { practiceHtml, previewDocument } from './practice-html.js';

export function mountPractice({h,api,copy,getTitle}) {
  let disposed=false,busy=false,preview='';
  const local=/^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const input=h('textarea',{rows:8,'aria-label':'粘贴 AI 的网页代码或完整回答',placeholder:'把 AI 的回答粘贴到这里，工作台会提取 HTML 网页代码。',spellcheck:'false'});
  const status=h('p',{class:'rep-note practice-status',role:'status','aria-live':'polite'},'收到 AI 的网页代码后，粘贴到这里，再点“预览作品”。');
  const note=h('p',{class:'rep-note'},'隔离预览中，部分联网或浏览器保存功能可能受限。保存或下载后，单独打开网页再测试关闭重开。');
  const frame=h('iframe',{class:'practice-frame',title:'我的网页作品预览',sandbox:'allow-scripts',referrerpolicy:'no-referrer',hidden:true});
  const locationBar=h('div',{class:'practice-location',hidden:true});
  const show=(text,error=false)=>{if(disposed)return;status.textContent=text;status.setAttribute('role',error?'alert':'status');input.setAttribute('aria-invalid',String(error));};
  const parse=()=>{try{return practiceHtml(input.value);}catch(error){show(error.message,true);return null;}};
  const previewButton=h('button',{type:'button',class:'btn primary',onclick:()=>{
    const html=parse();if(!html)return;preview=html;frame.srcdoc=previewDocument(html);frame.hidden=false;
    show('预览已更新。请在下方点击、输入，试试作品是否符合你的目标。');
    frame.scrollIntoView({behavior:'smooth',block:'nearest'});
  }},'预览作品');
  const saveButton=h('button',{type:'button',class:'btn',hidden:!local,onclick:async()=>{
    const html=parse();if(!html||busy)return;const source=input.value;busy=true;saveButton.disabled=true;show('正在保存到工作台…');
    try {
      const result=await api('/api/practice/save',{method:'POST',body:{html,title:getTitle()||'我的工具'}});
      if(disposed)return;
      if(input.value!==source){show('刚才的版本已保存；代码已修改，请再次保存最新版本。');return;}
      locationBar.replaceChildren(h('details',{class:'practice-path'},h('summary',{},'查看保存位置'),h('span',{class:'mono'},result.path)),
        h('button',{type:'button',class:'btn small',onclick:()=>copy(result.path,'文件位置已复制')},'复制文件位置'),
        h('button',{type:'button',class:'btn small',onclick:async()=>{try{await api('/api/practice/reveal',{method:'POST',body:{path:result.path}});show('已请求打开所在文件夹。双击保存的 HTML 文件即可使用。');}catch(error){show(error.message,true);}}},'打开所在文件夹'));
      locationBar.hidden=false;show('网页已保存。点“打开所在文件夹”，双击选中的 HTML 文件，即可单独使用。');
    }catch(error){show('保存失败：'+error.message+'。你也可以下载 HTML 文件。',true);}
    finally{busy=false;saveButton.disabled=false;}
  }},'保存到工作台');
  const download=h('button',{type:'button',class:'btn',onclick:()=>{
    const html=parse();if(!html)return;
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const link=h('a',{href:url,download:'我的工具.html'});document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);show('已请求下载“我的工具.html”。下载后双击打开，再检查需要保存的内容。');
  }},'下载 HTML');
  input.addEventListener('input',()=>{locationBar.hidden=true;show(preview?'代码已修改；请重新预览，并保存最新版本。':'代码已粘贴，可以预览或保存。');});
  const onMessage=event=>{if(!disposed&&event.source===frame.contentWindow&&event.data?.type==='rea-practice-error')show('预览提示：'+String(event.data.message).slice(0,200)+'。把提示交给 AI 修改；浏览器保存受限时，请下载后单独测试。',true);};
  window.addEventListener('message',onMessage);
  const element=h('section',{class:'practice-workbench','aria-label':'粘贴代码并预览作品'},
    h('h4',{},'把 AI 的代码带回来试试'),h('label',{class:'practice-input'},h('span',{},'粘贴 AI 的网页代码或完整回答'),input),
    h('div',{class:'rep-actions'},previewButton,saveButton,download),status,locationBar,note,frame);
  return {element,dispose(){disposed=true;window.removeEventListener('message',onMessage);frame.removeAttribute('srcdoc');}};
}
