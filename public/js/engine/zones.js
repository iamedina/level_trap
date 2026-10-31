/**
 * LEVEL TRAP - Zonas y Paletas Visuales Dinámicas (Gameplay)
 */
const ZONE_THEMES = {
  1: {
    id: 1,
    name: 'Tierra y Arena',
    range: '1 a 15',
    styleName: 'Estilo Clásico',
    bg: '#e5e7eb', // Gris neutro muy claro
    platformFill: '#1e293b', // Gris oscuro / negro
    platformStroke: '#0f172a',
    spikeFill: '#ef4444', // Rojo clásico
    doorGold: '#facc15',
    doorFrame: '#ca8a04',
    particleColor: '#000000',
    hasEmbers: false
  },
  2: {
    id: 2,
    name: 'Volcánica y Lava',
    range: '16 a 35',
    styleName: 'Calidez Extrema',
    bg: '#2d2220', // Gris cálido con tinte ceniza/ocre
    platformFill: '#1f1917', // Marrón carbón oscuro
    platformStroke: '#140f0e',
    spikeFill: '#f97316', // Rojo-anaranjado lava
    doorGold: '#fbbf24',
    doorFrame: '#b45309',
    particleColor: '#000000',
    hasEmbers: true
  },
  3: {
    id: 3,
    name: 'Inframundo',
    range: '36 a 50',
    styleName: 'Noche Profunda',
    bg: '#0a0d16', // Gris frío / azulado oscuro
    platformFill: '#1a162b', // Grafito / violeta oscuro
    platformStroke: '#110e1d',
    spikeFill: '#ff0055', // Carmesí neón
    doorGold: '#fde047',
    doorFrame: '#a16207',
    particleColor: '#000000',
    hasEmbers: false
  }
};

function getZoneTheme(zoneId) {
  return ZONE_THEMES[zoneId] || ZONE_THEMES[1];
}

window.ZONE_THEMES = ZONE_THEMES;
window.getZoneTheme = getZoneTheme;

