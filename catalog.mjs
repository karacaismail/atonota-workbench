// Configured destinations, not application availability or installation evidence.
export const groups = [
  { id: 'design', name: 'Tasarım', aliases: ['tasarım', 'design'] },
  { id: 'comp', name: 'Bileşen hattı', aliases: ['bileşen', 'component', 'hat'] },
];

export const catalog = [
  { id: 'penpot', group: 'design', name: 'Penpot', description: 'Arayüz tasarımı', url: 'https://wb.atonota.net/pp', aliases: ['design', 'tasarım', 'prototip', 'arayüz', 'ui'] },
  { id: 'open-design', group: 'design', name: 'Open Design', description: 'AI ile tasarım', url: 'https://wb.atonota.net/od', aliases: ['yapay zeka', 'mcp', 'ai'] },
  { id: 'affinity', group: 'design', name: 'Affinity Designer', description: 'Vektörel çizim', url: 'https://wb.atonota.net/ad', aliases: ['çizim', 'vector', 'vektör', 'illüstrasyon'] },
  { id: 'blender', group: 'design', name: 'Blender', description: '3D çalışma alanı', url: 'https://wb.atonota.net/b3d', aliases: ['3d', 'render', 'modelleme'] },
  { id: 'storybook-beta', group: 'comp', name: 'Storybook Beta', description: 'Bileşen geliştirme', url: 'https://wb.atonota.net/sbbeta', aliases: ['beta', 'test', 'önizleme', 'geliştirme'] },
  { id: 'storybook-rc', group: 'comp', name: 'Storybook RC', description: 'Yayın adayı', url: 'https://wb.atonota.net/sbrc', aliases: ['release candidate', 'rc', 'yayın', 'aday'] },
  { id: 'pen', group: 'comp', name: 'Pen', description: 'Bileşen kütüphanesi', url: 'https://pen.atonota.net/', aliases: ['ui kit', 'component', 'katalog', 'kütüphane'] },
];
