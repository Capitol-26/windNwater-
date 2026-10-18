// IntroScreen.tsx — opening animation: the room settles in under the app name, then the camera opens
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { Info } from 'phosphor-react-native';
import AboutSheet from '../components/common/AboutSheet';
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [paused, setPaused] = useState(false); // once the about sheet has been opened, the intro waits for it

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
    if (paused) return;
    const timer = setTimeout(() => navigation.replace('ScanRoom'), HOLD_MS);
    return () => clearTimeout(timer);
  }, [float, navigation, paused]);
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
      {!paused && <Animated.View entering={FadeIn.delay(HOLD_MS - 400).duration(400)} style={styles.curtain} pointerEvents="none" />}

      <Animated.View entering={FadeIn.delay(1200).duration(500)} style={styles.about}>
        <Pressable
          onPress={() => {
            setPaused(true);
            setAboutOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="About windNwater"
          hitSlop={12}
          style={styles.aboutButton}>
          <Info size={26} weight="bold" color={colors.ink} />
          <Text style={styles.aboutText}>about</Text>
        </Pressable>
      </Animated.View>

      <AboutSheet
        visible={aboutOpen}
        onClose={() => {
          setAboutOpen(false);
          navigation.replace('ScanRoom');
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  name: { flexDirection: 'row', justifyContent: 'center' },
  word: { ...typography.display, fontSize: 46, color: colors.ink },
  about: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  aboutButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutText: { ...typography.button, fontSize: 22, lineHeight: 28, color: colors.ink },
  curtain: { ...StyleSheet.absoluteFill, backgroundColor: colors.sand },
});
