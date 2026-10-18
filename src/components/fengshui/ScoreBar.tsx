// ScoreBar.tsx — line whose filled length is the score, drawn in on mount
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme/colors';

export default function ScoreBar({ percent, dark }: { percent: number; dark?: boolean }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(300, withTiming(percent / 100, { duration: 1300, easing: Easing.out(Easing.cubic) }));
  }, [percent, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={[styles.track, dark && styles.trackDark]}>
      <Animated.View style={[styles.fill, dark && styles.fillDark, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 324, maxWidth: '100%', height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.38)', overflow: 'hidden' },
  trackDark: { backgroundColor: colors.track },
  fillDark: { backgroundColor: colors.ink },
  fill: { height: 7, borderRadius: 4, backgroundColor: colors.paper },
});
