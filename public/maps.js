// Coordinates belong to each image, not to the current viewport.
export const MAPS = [
  { id: 'forest', name: '迷雾森林', src: '/assets/adventure-map.png',
    nodes: [[20, 74], [41, 43], [65, 62], [85, 26]],
    traveler: [[22, 79], [40, 48], [62, 56], [84, 29]] },
  { id: 'desert', name: '流沙遗迹', src: '/assets/map-desert.png',
    nodes: [[19, 69], [38, 42], [62, 60], [84, 26]],
    traveler: [[19, 76], [38, 47], [63, 54], [85, 22]] },
  { id: 'snow', name: '霜雪古堡', src: '/assets/map-snow.png',
    nodes: [[21, 73], [37, 44], [61, 60], [83, 26]],
    traveler: [[18, 75], [38, 48], [63, 54], [84, 22]] },
  { id: 'autumn', name: '枫叶秘境', src: '/assets/map-autumn.png',
    nodes: [[20, 71], [39, 42], [64, 59], [85, 25]],
    traveler: [[19, 76], [38, 47], [63, 54], [84, 22]] },
];

export function createWorldMap() {
  const container = document.querySelector('.world-map');
  const image = container.querySelector('img');
  const name = document.querySelector('#world-name');
  const traveler = container.querySelector('.traveler');
  const markers = Array.from(container.querySelectorAll('.map-stage'));
  let last;
  try { last = sessionStorage.getItem('rea-last-map'); } catch { /* private mode */ }
  const candidates = MAPS.filter(map => map.id !== last);
  let current = candidates[Math.floor(Math.random() * candidates.length)];
  let stage = 1;

  function remember() {
    try { sessionStorage.setItem('rea-last-map', current.id); } catch { /* private mode */ }
  }
  function describe() {
    container.dataset.world = current.id;
    name.textContent = current.name;
    image.alt = `${current.name}像素地图：营地、遗迹入口、木桥与宝箱`;
  }
  function place() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    // Match CSS object-fit:cover, including cropping as the map panel resizes.
    const naturalWidth = image.naturalWidth || 1536;
    const naturalHeight = image.naturalHeight || 1024;
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const project = ([x, y]) => [
      x / 100 * renderedWidth - (renderedWidth - width) / 2,
      y / 100 * renderedHeight - (renderedHeight - height) / 2,
    ];
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    markers.forEach((marker, index) => {
      const [x, y] = project(current.nodes[index]);
      const half = marker.offsetWidth / 2;
      marker.style.left = `${clamp(x, half + 8, width - half - 8)}px`;
      marker.style.top = `${clamp(y, marker.offsetHeight + 12, height - 12)}px`;
    });
    const [x, y] = project(current.traveler[stage - 1]);
    traveler.style.left = `${clamp(x - 11, 8, width - 30)}px`;
    traveler.style.top = `${clamp(y - 15, 8, height - 38)}px`;
  }

  describe();
  remember();
  image.addEventListener('load', place);
  image.addEventListener('error', () => {
    if (current.id === 'forest') return;
    current = MAPS[0];
    describe();
    remember();
    image.src = current.src;
    place();
  });
  image.src = current.src;
  new ResizeObserver(place).observe(container);
  place();
  return {
    setStage(next) { stage = next; place(); },
  };
}
