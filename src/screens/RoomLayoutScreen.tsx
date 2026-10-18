// RoomLayoutScreen.tsx — blueprint of the room as it is now, with a slider to compare it to the optimal arrangement
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import BackButton from '../components/common/BackButton';
import ScreenContainer from '../components/common/ScreenContainer';
import LayoutCompare from '../components/layout/LayoutCompare';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function RoomLayoutScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'RoomLayout'>) {
  const { layout } = route.params;
  const moved = layout.optimal_items.filter(o => {
    const now = layout.items.find(item => item.name === o.name);
    return !!now && (Math.abs(o.x - now.x) > 0.05 || Math.abs(o.y - now.y) > 0.05 || Math.abs(o.width - now.width) > 0.05);
  }).length;
  const added = layout.optimal_items.filter(o => o.added).length;
  const clutter = layout.clutter?.length ?? 0;
  const changes = [
    moved > 0 && `${moved} to move`,
    added > 0 && `${added} to add`,
    clutter > 0 && `${clutter} to clear`,
  ].filter(Boolean);

  return (
    <ScreenContainer variant="layout">
      <BackButton onPress={navigation.goBack} />

      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          Room layout
        </Text>
        <View style={styles.sheet}>
          <LayoutCompare layout={layout} />
        </View>
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: colors.clay }]}>now</Text>
          <Text style={[styles.legendText, { color: colors.sage }]}>optimal</Text>
        </View>
      </View>

      <Text style={styles.caption}>{changes.length === 0 ? 'already well placed' : changes.join(' · ')}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, justifyContent: 'center', gap: 16 },
  title: { ...typography.display, color: colors.ink, paddingHorizontal: 22 },
  sheet: { flex: 1, marginHorizontal: 20, borderRadius: radii.frame / 2, overflow: 'hidden' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 28 },
  legendText: { ...typography.caption },
  caption: { ...typography.caption, color: colors.ink, textAlign: 'center', paddingVertical: 8 },
});
