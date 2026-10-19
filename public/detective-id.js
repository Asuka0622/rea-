import { lumiArt } from './lumi-look.js';
export const DETECTIVE_PHOTO_KEY = 'rea-lumi-id-photo-v1';
export const PHOTO_FACES = [
  { id: 'normal', label: '自然', note: '今天也要认真找线索。' },
  { id: 'happy', label: '开心', note: '第一份档案，笑一下！' },
  { id: 'thinking', label: '思考', note: '相机里会不会也有线索？' },
  { id: 'surprised', label: '惊讶', note: '已经开始拍了吗？' },
];
export function validPhoto(value) {
  return value?.version === 1 && PHOTO_FACES.some(face => face.id === value.face) && typeof value.takenAt === 'string' && Number.isFinite(Date.parse(value.takenAt))
    ? { version: 1, face: value.face, takenAt: value.takenAt } : null;
}
export function loadDetectivePhoto(storage = globalThis.localStorage) {
  try { return validPhoto(JSON.parse(storage?.getItem(DETECTIVE_PHOTO_KEY) || 'null')); } catch { return null; }
}
export function saveDetectivePhoto(photo, storage = globalThis.localStorage) {
  const value = validPhoto(photo); if (!value) return false;
  try { if (!storage) return false; storage.setItem(DETECTIVE_PHOTO_KEY, JSON.stringify(value)); return true; } catch { return false; }
}
export const photoLabel = photo => PHOTO_FACES.find(face => face.id === photo?.face)?.label || '未拍摄';
export function renderDetectivePhoto(h, value) {
  const photo = validPhoto(value);
  return h('figure', { class: 'detective-id-photo' },
    ...(photo ? [h('img', { src: `/art/faces/${lumiArt(`lumi-${photo.face}`)}.webp`, alt: `路米的证件照，${photoLabel(photo)}表情`, width: 120, height: 144 })] : [h('div', { class: 'detective-photo-empty' }, '证件照待补拍')]),
    h('figcaption', {}, '路米', h('small', {}, '比特镇侦探档案')));
}
// Only confirmation returns a saved photo; expression previews and retakes are drafts.
export function mountPhotoBooth({ h, initial = null, intro = true, onConfirm, onCancel = null }) {
  const host = h('section', { class: 'detective-photo-booth', 'aria-label': '路米的证件照' });
  let face = validPhoto(initial)?.face || 'normal', captured = null;
  const focus = selector => host.querySelector(selector)?.focus({ preventScroll: true });
  function shoot() { captured = { version: 1, face, takenAt: new Date().toISOString() }; render(); focus('.detective-photo-confirm'); }
  function render() {
    host.replaceChildren(
      h('p', { class: 'detective-photo-kicker' }, '比特镇侦探事务所 · 档案登记'),
      h('h2', {}, captured ? '这张照片，要收进档案吗？' : '选个表情，给路米拍张证件照'),
      h('p', {}, '照片会贴在预告版结业报告的右上角。表情由你决定，不影响成绩。'),
      h('div', { class: `detective-photo-stage${captured ? ' captured' : ''}` }, renderDetectivePhoto(h, captured || { version: 1, face, takenAt: new Date().toISOString() })),
      h('p', { class: 'detective-photo-status', role: 'status' }, captured ? '咔嚓！照片已拍好，确认后才会归档。' : PHOTO_FACES.find(option => option.id === face).note),
      ...(!captured ? [h('div', { class: 'detective-photo-choices', role: 'group', 'aria-label': '选择路米的表情' }, ...PHOTO_FACES.map(option => h('button', { class: 'btn', type: 'button', 'aria-pressed': String(face === option.id), onclick: () => { face = option.id; render(); focus(`[data-face="${face}"]`); }, 'data-face': option.id }, option.label, ...(face === option.id ? [h('span', { 'aria-hidden': 'true' }, ' ✓')] : []))))] : []),
      h('div', { class: 'detective-photo-actions' }, ...(captured ? [h('button', { class: 'btn primary detective-photo-confirm', type: 'button', onclick: () => onConfirm(captured) }, '确认归档'), h('button', { class: 'btn', type: 'button', onclick: () => { captured = null; render(); focus(`[data-face="${face}"]`); } }, '重新拍一张')] : [h('button', { class: 'btn primary detective-photo-shoot', type: 'button', onclick: shoot }, '拍照')]), ...(onCancel ? [h('button', { class: 'btn', type: 'button', onclick: onCancel }, '取消，保留原照片')] : [])));
  }
  if (intro) host.append(h('p', { class: 'detective-photo-kicker' }, '序章 · 路米的第一份档案'), h('h2', {}, '这次，你就是路米'),
    h('div', { class: 'detective-photo-stage' }, renderDetectivePhoto(h, { version: 1, face: 'normal', takenAt: new Date().toISOString() })),
    h('p', {}, '你叫路米，是比特镇的新手侦探。接下来，你会拜访居民、调查物品，查清可疑软件里的秘密。'),
    h('p', {}, '用方向键或 WASD 走动，也可以点击地点前往。靠近人物或物品后按 E 互动；J 可以查看任务日志。'),
    h('p', {}, '出发前，先给自己的侦探档案拍张证件照。结业时，这张照片会陪你一起领到见习侦探报告。'),
    h('button', { class: 'btn primary', type: 'button', onclick: () => { render(); focus('.detective-photo-shoot'); } }, '认识了，去拍证件照'));
  else render();
  return host;
}
