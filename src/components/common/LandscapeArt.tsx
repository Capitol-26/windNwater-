// LandscapeArt.tsx — layered earthen sun + hills illustration with a fine bagua octagon
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';

export default function LandscapeArt({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 340 300" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.sand} />
          <Stop offset="1" stopColor={colors.cream} />
        </LinearGradient>
      </Defs>
      <Path d="M0 24Q0 0 24 0H316Q340 0 340 24V300H0Z" fill="url(#sky)" />
      <Polygon
        points="170,34 218,54 238,102 218,150 170,170 122,150 102,102 122,54"
        fill="none"
        stroke={colors.stone}
        strokeOpacity={0.45}
        strokeWidth={1}
      />
      <Circle cx="170" cy="102" r="46" fill={colors.clay} />
      <Path d="M0 190Q70 140 150 176T340 160V300H0Z" fill={colors.sage} />
      <Path d="M0 226Q90 176 180 214T340 200V300H0Z" fill={colors.moss} />
      <Path d="M0 262Q110 226 220 254T340 244V300H0Z" fill={colors.bark} />
    </Svg>
  );
}
