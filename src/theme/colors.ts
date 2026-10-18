// Palette from the Figma design: warm sand ground with terracotta and sage blobs
export const colors = {
  sand: '#E7B573',
  clay: '#C36241',
  sage: '#7A8B7B',
  ink: '#000000',
  paper: '#FFFFFF',
  inkSoft: 'rgba(0,0,0,0.62)',
  track: 'rgba(0,0,0,0.12)',
  dot: 'rgba(255,255,255,0.5)',
  hazardRed: '#EB3333', // AR boxes for blocked chi (the native view draws the same red)
  hazardGreen: '#33CC59', // AR boxes for poison arrows
} as const;

// One earthen hue per feng shui element
export const elementColors = {
  wood: '#5F6B45',
  fire: '#B8603E',
  earth: '#C9A46A',
  metal: '#8E8F8A',
  water: '#3E6A73',
} as const;
