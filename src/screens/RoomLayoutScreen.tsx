// RoomLayoutScreen.tsx — the room as a 2D plan on a grid, with a slider to compare it to the optimal arrangement
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import BackButton from '../components/common/BackButton';
import ScreenContainer from '../components/common/ScreenContainer';
import ViewfinderFrame from '../components/common/ViewfinderFrame';
import LayoutCompare from '../components/layout/LayoutCompare';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function RoomLayoutScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'RoomLayout'>) {
  const { layout } = route.params;
  const moved = layout.optimal_items.filter((o, i) => {
    const now = layout.items[i];
    return Math.abs(o.x - now.x) > 0.05 || Math.abs(o.y - now.y) > 0.05 || Math.abs(o.width - now.width) > 0.05;
  }).length;

  return (
    <ScreenContainer variant="layout">
      <BackButton onPress={navigation.goBack} />

      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          Your room, rearranged
        </Text>
        <ViewfinderFrame fill>
          <LayoutCompare layout={layout} />
        </ViewfinderFrame>
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: colors.clay }]}>now</Text>
          <Text style={styles.legendText}>optimal</Text>
        </View>
      </View>

      <Text style={styles.caption}>
        {layout.width.toFixed(1)} × {layout.length.toFixed(1)} m · {moved === 0 ? 'already well placed' : `${moved} to move`}
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, justifyContent: 'center', gap: 16 },
  title: { ...typography.display, color: colors.ink, paddingHorizontal: 22 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 28 },
  legendText: { ...typography.caption, color: colors.sage },
  caption: { ...typography.caption, color: colors.ink, textAlign: 'center', paddingVertical: 8 },
});
