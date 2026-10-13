// A small line-icon set drawn on a 24×24 grid with currentColor strokes.
// Static, trusted markup only — never interpolate user content into these strings.
const PATHS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  learn: '<path d="M4 5.5C6.5 4.3 9.3 4.2 12 6c2.7-1.8 5.5-1.7 8-.5V19c-2.5-1.2-5.3-1.1-8 .7-2.7-1.8-5.5-1.9-8-.7z"/><path d="M12 6v13.7"/>',
  engines: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0z"/><path d="M12 16.5V21"/>',
  pulse: '<path d="M3 12h4l2.2-5.5 4 11L15.8 9l1.7 3H21"/>',
  glossary: '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19"/><path d="M9 8.5h6"/>',
  specimen: '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><circle cx="12" cy="12" r="3"/><path d="M3.5 9.5h3M17.5 14.5h3"/>',
  monitor: '<rect x="3" y="4" width="18" height="12.5" rx="1.5"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  phone: '<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.2"/><path d="M10.5 18h3"/>',
  box: '<path d="M3.8 7.6 12 3.5l8.2 4.1v8.8L12 20.5l-8.2-4.1z"/><path d="M3.8 7.6 12 11.7l8.2-4.1M12 11.7v8.8"/><path d="m7.9 5.6 8.2 4.1"/>',
  spark: '<path d="M12 3.5 13.7 10.3 20.5 12l-6.8 1.7L12 20.5l-1.7-6.8L3.5 12l6.8-1.7z"/><path d="M19 3.5v3M17.5 5h3"/>',
  scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M3 12h18"/>',
  shield: '<path d="M12 3.2 19.5 6v5.6c0 4.6-3.2 8-7.5 9.2-4.3-1.2-7.5-4.6-7.5-9.2V6z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/>',
  path: '<circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="5.5" r="2"/><path d="M7.5 18.5h6a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h6"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.2M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2M12 7.9v.1"/>',
  bulb: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1 1.3 1 2.2v1h5.2v-1c0-.9.4-1.6 1-2.2A6 6 0 0 0 12 3.5z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15"/>',
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="1.5"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15h4.5"/>',
  folder: '<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v9.3A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
  file: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M14 3.5V8h4.5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M21.2 12h-2M4.8 12h-2M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5"/>',
  moon: '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5 7.8 7.8 0 1 0 19.5 14.6z"/>',
  auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.4"/>',
  down: '<path d="M12 4v16M6 14l6 6 6-6"/>',
  seed: '<path d="M12 20.5V11"/><path d="M12 13c0-4 2.6-6.5 7-6.5 0 4.2-2.6 6.5-7 6.5zM12 11c0-3.2-2.1-5.2-5.6-5.2C6.4 9.2 8.5 11 12 11z"/>',
  wrench: '<path d="M14.6 6.1a4.2 4.2 0 0 0 5.3 5.3L12 19.3a2.1 2.1 0 0 1-3-3z"/><path d="M14.6 6.1 17 3.7a4.2 4.2 0 0 0-5.3 5.3"/>',
};

/** An inline SVG icon element. */
export function icon(name, { size = 20, label } = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "icon");
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = PATHS[name] || PATHS.info;
  return svg;
}

/** Replace every <i data-icon="name"> placeholder in static HTML. */
export function hydrateIcons(root = document) {
  for (const el of root.querySelectorAll("i[data-icon]")) el.replaceWith(icon(el.dataset.icon, { size: Number(el.dataset.size) || 20 }));
}
