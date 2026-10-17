// ViewfinderFrame.tsx — camera-style viewfinder: content clipped to a rounded rect, with only the four corner brackets drawn
import { PropsWithChildren, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';

const STROKE = 8;
const RADIUS = 26;
const ARM = 54;

// Narrow and portrait like a phone camera feed; shrinks on short screens so nothing overlaps
export function useViewfinderSize() {
  const { width, height } = useWindowDimensions();
  return {
    width: Math.min(260, width * 0.67),
    height: Math.min(340, Math.max(240, height * 0.38)),
  };
}

function cornerPath(w: number, h: number) {
  const i = STROKE / 2;
  return [
    `M${i} ${i + ARM}V${i + RADIUS}Q${i} ${i} ${i + RADIUS} ${i}H${i + ARM}`,
    `M${w - i - ARM} ${i}H${w - i - RADIUS}Q${w - i} ${i} ${w - i} ${i + RADIUS}V${i + ARM}`,
    `M${w - i} ${h - i - ARM}V${h - i - RADIUS}Q${w - i} ${h - i} ${w - i - RADIUS} ${h - i}H${w - i - ARM}`,
    `M${i + ARM} ${h - i}H${i + RADIUS}Q${i} ${h - i} ${i} ${h - i - RADIUS}V${h - i - ARM}`,
  ].join('');
}

type Props = PropsWithChildren<{ fill?: boolean; dark?: boolean }>;

// `fill` stretches the frame to whatever room its parent leaves; `dark` blacks out the empty window (no camera feed)
export default function ViewfinderFrame({ fill, dark, children }: Props) {
  const fixed = useViewfinderSize();
  const [measured, setMeasured] = useState({ width: 0, height: 0 });
  const { width, height } = fill ? measured : fixed;
  const onLayout = fill
    ? (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout)
    : undefined;

  return (
    <View
      onLayout={onLayout}
      style={fill ? styles.fill : [styles.frame, { width, height }]}>
      <View style={[styles.content, dark && styles.dark]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id="dots" width={20} height={20} patternUnits="userSpaceOnUse">
              <Circle cx={10} cy={10} r={1.5} fill={colors.dot} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dots)" />
        </Svg>
        {children}
      </View>
      {width > 0 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d={cornerPath(width, height)}
            stroke={colors.ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center' },
  fill: { flex: 1, marginHorizontal: 20 },
  content: { flex: 1, borderRadius: RADIUS, overflow: 'hidden' },
  dark: { backgroundColor: colors.ink },
});
