export const MAX_PRACTICE_BYTES = 2 * 1024 * 1024;

export function extractHtml(text) {
  const value = String(text || '').replace(/^\uFEFF/, '').trim();
  const looksHtml = code => /^\s*(?:<!--[\s\S]*?-->\s*)*(?:<!doctype\s+html\b|<html\b)/i.test(code);
  const blocks = [...value.matchAll(/```[ \t]*([\w-]*)[^\n]*\n([\s\S]*?)```/g)]
    .map(([,lang,body])=>({lang:lang.toLowerCase(),body:body.trim()}));
  const block = blocks.find(item=>item.lang==='html' && looksHtml(item.body)) || blocks.find(item=>!item.lang && looksHtml(item.body));
  if(block) return block.body;
  if(blocks.length) return '';
  const start=value.search(/<!doctype\s+html\b|<html\b/i);
  if(start<0) return '';
  const end=value.toLowerCase().indexOf('</html>',start);
  return end>=0 ? value.slice(start,end+7) : value.slice(start);
}

export function practiceHtml(text) {
  const value=String(text||'');
  if(value.length>MAX_PRACTICE_BYTES || new TextEncoder().encode(value).length>MAX_PRACTICE_BYTES) throw new Error('内容超过 2 MB。请只粘贴这个网页的完整代码。');
  const html=extractHtml(value);
  if(!html) throw new Error('没有找到完整网页代码。请粘贴 AI 回答中的 HTML 代码，或让 AI 提供一个完整的 HTML 文件。');
  return html;
}

export function previewDocument(html) {
  const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  // This prefix is before supplied markup, so supplied CSP cannot relax these restrictions.
  return `<meta http-equiv="Content-Security-Policy" content="${policy}"><script>addEventListener('error',e=>parent.postMessage({type:'rea-practice-error',message:String(e.message).slice(0,200)},'*'));addEventListener('unhandledrejection',e=>parent.postMessage({type:'rea-practice-error',message:String(e.reason&&e.reason.message||e.reason).slice(0,200)},'*'));<\/script>`+html;
}
