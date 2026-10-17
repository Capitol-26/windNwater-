// IntroScreen.tsx — opening animation: the room settles in under the app name, then the camera opens
import { useEffect } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import ScreenContainer from '../components/common/ScreenContainer';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const ART = require('../assets/images/living-room.png');
const ART_RATIO = 259 / 475;
const NAME = ['wind', 'N', 'water'];
const HOLD_MS = 3200;

export default function IntroScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Intro'>) {
  const { width } = useWindowDimensions();
  // The illustration bleeds past both screen edges, like in the design
  const artWidth = width * (475 / 390);

  // After it lands, the room drifts up and down slowly
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    const timer = setTimeout(() => navigation.replace('ScanRoom'), HOLD_MS);
    return () => clearTimeout(timer);
  }, [float, navigation]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value * -8 }] }));

  return (
    <ScreenContainer variant="scan">
      <View style={styles.main}>
        <View style={styles.name} accessible accessibilityRole="header" accessibilityLabel="windNwater">
          {NAME.map((part, i) => (
            <Animated.Text
              key={part}
              entering={FadeInUp.delay(350 + i * 140).springify().damping(18).stiffness(120)}
              style={styles.word}>
              {part}
            </Animated.Text>
          ))}
        </View>

        <Animated.View entering={ZoomIn.delay(800).springify().damping(16).stiffness(90)}>
          <Animated.View style={floatStyle}>
            <Image
              source={ART}
              style={{ width: artWidth, height: artWidth * ART_RATIO }}
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.View entering={FadeIn.delay(HOLD_MS - 400).duration(400)} style={styles.curtain} pointerEvents="none" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  name: { flexDirection: 'row', justifyContent: 'center' },
  word: { ...typography.display, fontSize: 46, color: colors.ink },
  curtain: { ...StyleSheet.absoluteFill, backgroundColor: colors.sand },
});
