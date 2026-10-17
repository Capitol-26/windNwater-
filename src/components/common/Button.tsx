// Button.tsx — terracotta pill with a medium-weight label and a springy press
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = { label: string; onPress: () => void; disabled?: boolean };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({ label, onPress, disabled }: Props) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.04 }],
    opacity: 1 - press.value * 0.1,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { press.value = withSpring(1, { damping: 18, stiffness: 400 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 12, stiffness: 300 }); }}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.button, style]}>
      <Text style={styles.label}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 290,
    height: 63,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.clay,
    borderRadius: radii.button,
  },
  label: { ...typography.button, color: colors.paper },
});
