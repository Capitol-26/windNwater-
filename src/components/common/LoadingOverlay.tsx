// LoadingOverlay.tsx — full-screen progress while a scan uploads and is analysed
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { Check } from 'phosphor-react-native';
import { colors, elementColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import ScreenContainer from './ScreenContainer';

const ORDER = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
const SIZE = 150;
const CENTER = SIZE / 2;
const RADIUS = 56;
const DOT = 18;
const CYCLE_MS = 3000;

// Steps shown while the server works; the first covers the upload, the rest are paced by time
const STEPS = ['Sending your walk-through', 'Choosing the sharpest frames', 'Reading the room', 'Weighing the five elements'];
const STEP_AT_SEC = [0, 0, 4, 12]; // seconds into analysis when steps 1..3 begin
const UPLOAD_SHARE = 0.3;

type Props = { phase: 'uploading' | 'analyzing'; uploadProgress?: number };

const vertex = (i: number) => {
  const angle = (i / ORDER.length) * 2 * Math.PI - Math.PI / 2;
  return { x: CENTER + Math.cos(angle) * RADIUS, y: CENTER + Math.sin(angle) * RADIUS };
};

// The five elements sit on a pentagon and take turns swelling in the generating cycle
// (wood → fire → earth → metal → water) while the whole shape turns slowly.
function ElementDot({ index, beat }: { index: number; beat: { value: number } }) {
  const start = index / ORDER.length;
  const span = 1 / ORDER.length;
  const { x, y } = vertex(index);
  const style = useAnimatedStyle(() => {
    const t = beat.value;
    const input = [0, start, start + span / 2, start + span, 1];
    return {
      opacity: interpolate(t, input, [0.5, 0.5, 1, 0.5, 0.5]),
      transform: [{ scale: interpolate(t, input, [1, 1, 1.7, 1, 1]) }],
    };
  });
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: elementColors[ORDER[index]], left: x - DOT / 2, top: y - DOT / 2 }, style]}
    />
  );
}

function Orbit() {
  const turn = useSharedValue(0);
  const beat = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1);
    beat.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1);
  }, [turn, beat]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));

  const points = ORDER.map((_, i) => `${vertex(i).x},${vertex(i).y}`).join(' ');
  return (
    <Animated.View style={[styles.orbit, spin]} entering={FadeInUp.duration(600)}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Polygon points={points} fill="none" stroke={colors.ink} strokeOpacity={0.22} strokeWidth={1.5} />
      </Svg>
      {ORDER.map((name, i) => (
        <ElementDot key={name} index={i} beat={beat} />
      ))}
    </Animated.View>
  );
}

function StepRow({ label, state }: { label: string; state: 'pending' | 'active' | 'done' }) {
  const emphasis = useSharedValue(0);
  useEffect(() => {
    emphasis.value = withTiming(state === 'pending' ? 0 : 1, { duration: 350 });
  }, [state, emphasis]);
  const text = useAnimatedStyle(() => ({ opacity: 0.35 + emphasis.value * 0.65 }));

  return (
    <View style={styles.step}>
      <View style={[styles.marker, state === 'done' && styles.markerDone]}>
        {state === 'done' ? (
          <Check size={14} weight="bold" color={colors.paper} />
        ) : (
          <View style={[styles.markerDot, state === 'active' && styles.markerDotActive]} />
        )}
      </View>
      <Animated.Text style={[styles.stepLabel, text]}>{label}</Animated.Text>
    </View>
  );
}

export default function LoadingOverlay({ phase, uploadProgress = 0 }: Props) {
  const progress = useSharedValue(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (phase === 'uploading') {
      progress.value = withTiming(uploadProgress * UPLOAD_SHARE, { duration: 300 });
    } else {
      // Creep toward 95% and never claim to be finished before the server answers
      progress.value = withTiming(0.95, { duration: 30000, easing: Easing.out(Easing.cubic) });
    }
  }, [phase, uploadProgress, progress]);

  useEffect(() => {
    if (phase !== 'analyzing') return;
    setSeconds(0);
    const tick = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(tick);
  }, [phase]);

  const active = phase === 'uploading' ? 0 : STEP_AT_SEC.reduce((n, at, i) => (i > 0 && seconds >= at ? i : n), 1);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <ScreenContainer variant="camera">
        <View style={styles.main}>
          <Orbit />
          <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
            {phase === 'uploading' ? 'Sending your scan' : 'Reading the room'}
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.track}>
            <Animated.View style={[styles.fill, fill]} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.steps}>
            {STEPS.map((label, i) => (
              <StepRow key={label} label={label} state={i < active ? 'done' : i === active ? 'active' : 'pending'} />
            ))}
          </Animated.View>
        </View>
        <Text style={styles.footnote}>This usually takes under half a minute.</Text>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  orbit: { width: SIZE, height: SIZE },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  title: { ...typography.display, fontSize: 36, color: colors.ink },
  track: { width: 260, height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.clay },
  steps: { alignSelf: 'center', gap: spacing.sm + 2, marginTop: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  marker: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  markerDone: { backgroundColor: colors.clay },
  markerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink, opacity: 0.35 },
  markerDotActive: { backgroundColor: colors.clay, opacity: 1 },
  stepLabel: { ...typography.body, color: colors.ink },
  footnote: { ...typography.caption, color: colors.paper, textAlign: 'center', paddingBottom: spacing.sm },
});
