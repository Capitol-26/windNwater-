// ElementBalance.tsx — the five elements as labeled percentage bars
import { StyleSheet, Text, View } from 'react-native';
import { ElementName, ElementShare } from '../../types/fengshui.types';
import { colors, elementColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const ORDER: ElementName[] = ['wood', 'fire', 'earth', 'metal', 'water'];

type Props = { elements: Record<ElementName, ElementShare> };

export default function ElementBalance({ elements }: Props) {
  return (
    <View style={styles.wrap}>
      {ORDER.map(name => (
        <View key={name} style={styles.row}>
          <View style={styles.header}>
            <View style={styles.nameRow}>
              <View style={[styles.swatch, { backgroundColor: elementColors[name] }]} />
              <Text style={styles.name}>{name[0].toUpperCase() + name.slice(1)}</Text>
            </View>
            <Text style={styles.percent}>{elements[name].percent}%</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${elements[name].percent}%`, backgroundColor: elementColors[name] }]}
            />
          </View>
          {!!elements[name].evidence && <Text style={styles.evidence}>{elements[name].evidence}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  name: { ...typography.body, color: colors.ink },
  percent: { ...typography.body, color: colors.ink },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  evidence: { ...typography.caption, color: colors.inkSoft },
});
