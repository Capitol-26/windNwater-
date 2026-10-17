// Instrument Sans everywhere (static Regular and Medium cut from the variable font, bundled in assets/fonts)
import { TextStyle } from 'react-native';

export const fonts = { regular: 'InstrumentSans-Regular', medium: 'InstrumentSans-Medium' } as const;

// Kept so existing imports keep working; prefer `fonts.regular`
export const serif = fonts.regular;

export const typography = {
  display: { fontFamily: fonts.medium, fontSize: 40, lineHeight: 46, letterSpacing: -0.8, textAlign: 'center' },
  button: { fontFamily: fonts.medium, fontSize: 28, lineHeight: 34, letterSpacing: -0.3, textAlign: 'center' },
  title: { fontFamily: fonts.medium, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  body: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 25 },
  caption: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
} satisfies Record<string, TextStyle>;
