// HomeScreen.tsx — landing screen: start a new room scan
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/common/Button';
import Icon, { IconName } from '../components/common/Icon';
import LandscapeArt from '../components/common/LandscapeArt';
import ScreenContainer from '../components/common/ScreenContainer';
import { useRoomScan } from '../hooks/useRoomScan';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { typography } from '../theme/typography';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'scan', title: 'Scan', text: 'Walk the edges of your room.' },
  { icon: 'compass', title: 'Read', text: 'See your feng shui rating.' },
  { icon: 'leaf', title: 'Restore', text: 'Preview a balanced layout.' },
];

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const { width } = useWindowDimensions();
  const artWidth = width - spacing.lg * 2;
  const { supported, scanning, startScan } = useRoomScan();

  const scanFloorPlan = async () => {
    const plan = await startScan();
    if (plan) {
      Alert.alert(
        'Floor plan captured',
        `${plan.floor.area.toFixed(1)} m² · ${plan.walls.length} walls, ${plan.doors.length} doors, ` +
          `${plan.windows.length} windows, ${plan.objects.length} furniture items` +
          (plan.compassAligned ? '\nAligned to north' : ''),
      );
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.art}>
        <LandscapeArt width={artWidth} height={artWidth * 0.64} />
      </View>

      <View style={styles.copy}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>Feng shui, room by room</Text>
        </View>
        <Text style={styles.hero}>Let your room breathe.</Text>
        <Text style={styles.body}>Scan a space and learn how energy moves through it.</Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map(step => (
          <View key={step.title} style={styles.step}>
            <Icon name={step.icon} color={colors.clayDark} size={24} />
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Begin scan" onPress={() => navigation.navigate('ScanRoom')} />
        {supported && (
          <Pressable onPress={scanFloorPlan} disabled={scanning} accessibilityRole="button">
            <Text style={styles.link}>{scanning ? 'Scanning…' : 'Map your room by hand'}</Text>
          </Pressable>
        )}
        <Text style={styles.note}>About a minute. Nothing leaves your phone yet.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  art: { borderRadius: radii.lg, overflow: 'hidden' },
  copy: { marginTop: spacing.lg },
  eyebrow: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 6,
  },
  eyebrowText: { ...typography.eyebrow, fontSize: 11, color: colors.moss },
  hero: { ...typography.hero, color: colors.espresso, marginTop: spacing.md },
  body: { ...typography.body, color: colors.bark, marginTop: spacing.sm },
  steps: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  step: { flex: 1, gap: 4 },
  stepTitle: { ...typography.label, color: colors.espresso, marginTop: 6 },
  stepText: { ...typography.caption, color: colors.stone },
  footer: { marginTop: 'auto', gap: spacing.sm + 2 },
  link: { ...typography.label, color: colors.clayDark, textAlign: 'center', paddingVertical: spacing.xs },
  note: { ...typography.caption, color: colors.stone, textAlign: 'center' },
});
