// Serif display (ships with iOS) paired with the system sans for body text
import { TextStyle } from 'react-native';

const display = 'Iowan Old Style';

export const typography = {
  eyebrow: { fontSize: 12, letterSpacing: 2.4, fontWeight: '600', textTransform: 'uppercase' },
  hero: { fontFamily: display, fontSize: 46, lineHeight: 50, letterSpacing: -0.8 },
  title: { fontFamily: display, fontSize: 28, lineHeight: 34 },
  body: { fontSize: 17, lineHeight: 25 },
  label: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20 },
} satisfies Record<string, TextStyle>;
