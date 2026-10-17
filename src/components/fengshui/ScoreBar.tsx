// ScoreBar.tsx — white line whose filled length is the score, drawn in on mount
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme/colors';

export default function ScoreBar({ percent }: { percent: number }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(300, withTiming(percent / 100, { duration: 1300, easing: Easing.out(Easing.cubic) }));
  }, [percent, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 324, maxWidth: '100%', height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.38)', overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: colors.paper },
});
