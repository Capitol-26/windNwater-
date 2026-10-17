// Button.tsx — pill button with a nested trailing icon circle
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Icon, { IconName } from './Icon';

type Props = { label: string; onPress: () => void; icon?: IconName };

export default function Button({ label, onPress, icon = 'arrow' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={20} color={colors.cream} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.espresso,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm + 2,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  label: { ...typography.label, fontSize: 17, color: colors.cream },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
