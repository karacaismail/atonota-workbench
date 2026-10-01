/** Illustrative launcher artwork, not official third-party brand marks. */
const paths = Object.freeze({
  brand:
    '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9m-8-9 8 4.5 8-4.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6"/>',
  pen:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="m14 18 4-4 3 3-4 4h-3v-3Z"/>',
  penpot:
    '<path d="m12 3 7 7-4 9H9l-4-9 7-7Z"/><path d="M12 3v7m-7 0 7 4 7-4M9 19h6"/><circle cx="12" cy="11" r="2"/>',
  "open-design":
    '<path d="M8 4H4v4m12-4h4v4m0 8v4h-4M8 20H4v-4"/><path d="m12 5 7 7-7 7-7-7 7-7Z"/><path d="m8.5 12 3.5 3.5 3.5-3.5M12 9v6.5"/>',
  affinity:
    '<path d="m3 20 8-16h6l4 8-4 8H3Z"/><path d="m7 12 7 8m-3-16 8 16M7 12h14"/>',
  blender:
    '<path d="M8 8 3 5m5 3H2m8-2 3-3 5 4"/><ellipse cx="13.5" cy="13" rx="8.5" ry="6.5"/><ellipse cx="13.5" cy="13" rx="3.5" ry="3"/>',
  "storybook-beta":
    '<path d="M5 3h13v18l-6-2-7 2V3Z"/><path d="M9 6h5m-4 4h4M10 10v4l-2 3h8l-2-3v-4M10 14h4"/>',
  "storybook-rc":
    '<path d="M5 3h13v18l-6-2-7 2V3Z"/><path d="M9 6h5m-5 7 2 2 4-5"/>',
});

export function icon(name) {
  if (!Object.hasOwn(paths, name)) {
    throw new RangeError(`Unknown icon: ${String(name)}`);
  }

  return `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}
