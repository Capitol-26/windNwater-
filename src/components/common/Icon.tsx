// Icon.tsx — thin, consistent line icons drawn with react-native-svg
import Svg, { Path, Circle } from 'react-native-svg';

export type IconName = 'arrow' | 'close' | 'scan' | 'leaf' | 'compass';

type Props = { name: IconName; size?: number; color: string };

export default function Icon({ name, size = 22, color }: Props) {
  const p = { stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'arrow' && <Path d="M5 12h14M13 6l6 6-6 6" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'scan' && <Path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16" {...p} />}
      {name === 'leaf' && <Path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l8-8" {...p} />}
      {name === 'compass' && (
        <>
          <Circle cx="12" cy="12" r="8" {...p} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5z" {...p} />
        </>
      )}
    </Svg>
  );
}
