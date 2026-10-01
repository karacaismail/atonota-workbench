// Unmodified icon paths from the user-supplied Workbench design.
const glyphs = {
  "penpot": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l6 7-6 11-6-11z\"/><circle cx=\"12\" cy=\"11\" r=\"1.6\"/><path d=\"M12 12.6V21\"/></svg>",
  "open-design": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3\"/><path d=\"M12 8l1.4 2.6L16 12l-2.6 1.4L12 16l-1.4-2.6L8 12l2.6-1.4z\"/></svg>",
  "affinity": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 18C7 8 17 8 20 18\"/><rect x=\"2.5\" y=\"16.5\" width=\"3\" height=\"3\"/><rect x=\"18.5\" y=\"16.5\" width=\"3\" height=\"3\"/><path d=\"M4 9h16\"/><circle cx=\"12\" cy=\"9\" r=\"1.6\"/></svg>",
  "blender": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3l8 4.5v9L12 21l-8-4.5v-9z\"/><path d=\"M12 12l8-4.5M12 12v9M12 12L4 7.5\"/></svg>",
  "storybook-beta": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z\"/><path d=\"M9 3v18\"/><path d=\"M12 8h4M13 8v2.6l-1.6 3.4h4.2L14 10.6V8\"/></svg>",
  "storybook-rc": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z\"/><path d=\"M9 3v18\"/><path d=\"M11.5 11.5l2 2 3-3.5\"/></svg>",
  "pen": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"4\" y=\"4\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"4\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"4\" y=\"13.5\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><path d=\"M14 20l.6-2.6 4.6-4.6a1.4 1.4 0 0 1 2 2l-4.6 4.6z\"/></svg>"
};
export function icon(name) {
  if (!Object.hasOwn(glyphs, name)) throw new Error('Unknown icon: ' + name);
  return glyphs[name];
}
