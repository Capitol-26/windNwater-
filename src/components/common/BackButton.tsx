// BackButton.tsx — white round button with a caret, pinned top-left on screens above the home screen
import { Pressable, StyleSheet } from 'react-native';
import { CaretLeft } from 'phosphor-react-native';
import { colors } from '../../theme/colors';

type Props = { onPress: () => void; label?: string };

export default function BackButton({ onPress, label = 'Go back' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <CaretLeft size={26} weight="bold" color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 20,
    marginTop: 4,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
