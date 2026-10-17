// ScreenContainer.tsx — sand background with a terracotta or sage blob bleeding off two corners
import { PropsWithChildren, useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as blobs from '../../assets/blobs';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Blob from './Blob';

// Offsets are measured from the screen edges in the 390x844 Figma frames
const LAYOUTS = {
  scan: {
    top: { shape: blobs.scanTop, position: { top: -42, left: -57 } },
    bottom: { shape: blobs.scanBottom, position: { bottom: -75, right: -56 } },
  },
  camera: {
    top: { shape: blobs.cameraTop, position: { top: -100, left: -70 } },
    bottom: { shape: blobs.cameraBottom, position: { bottom: -188, left: -111 } },
  },
  layout: {
    top: { shape: blobs.scanTop, position: { top: -42, right: -57 } },
    bottom: { shape: blobs.scanBottom, position: { bottom: -75, left: -56 } },
  },
  result: {
    top: { shape: blobs.resultTop, position: { top: -97, right: -73 } },
    bottom: { shape: blobs.resultBottom, position: { bottom: -200, left: -64 } },
  },
} satisfies Record<string, Record<'top' | 'bottom', { shape: blobs.BlobShape; position: ViewStyle }>>;

// Each blob eases in from its corner, then breathes slowly so the ground never feels static
function AnimatedBlob({ shape, position, delay, drift }: {
  shape: blobs.BlobShape;
  position: ViewStyle;
  delay: number;
  drift: number;
}) {
  const breathe = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    breathe.value = withDelay(
      delay + 1100,
      withRepeat(withSequence(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.sin) })), -1),
    );
  }, [delay, enter, breathe]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * drift + breathe.value * Math.sign(drift) * -6 },
      { scale: 0.85 + enter.value * 0.15 + breathe.value * 0.03 },
    ],
  }));

  return (
    <Animated.View style={[styles.blob, position, style]} pointerEvents="none">
      <Blob shape={shape} />
    </Animated.View>
  );
}

type Props = PropsWithChildren<{ variant: keyof typeof LAYOUTS }>;

export default function ScreenContainer({ variant, children }: Props) {
  const insets = useSafeAreaInsets();
  const { top, bottom } = LAYOUTS[variant];
  return (
    <View style={styles.root}>
      <AnimatedBlob shape={top.shape} position={top.position} delay={0} drift={-70} />
      <AnimatedBlob shape={bottom.shape} position={bottom.position} delay={150} drift={70} />
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md },
        ]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, overflow: 'hidden' },
  blob: { position: 'absolute' },
  content: { flex: 1 },
});
