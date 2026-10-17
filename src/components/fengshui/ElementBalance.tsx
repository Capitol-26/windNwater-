// ElementBalance.tsx — the five elements as labeled percentage bars
import { StyleSheet, Text, View } from 'react-native';
import { ElementName, ElementShare } from '../../types/fengshui.types';
import { colors, elementColors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const ORDER: ElementName[] = ['wood', 'fire', 'earth', 'metal', 'water'];

type Props = {
  elements: Record<ElementName, ElementShare>;
  dominant: ElementName;
  weakest: ElementName;
};

export default function ElementBalance({ elements, dominant, weakest }: Props) {
  return (
    <View style={styles.wrap}>
      {ORDER.map(name => (
        <View key={name} style={styles.row}>
          <View style={styles.header}>
            <View style={styles.nameRow}>
              <View style={[styles.swatch, { backgroundColor: elementColors[name] }]} />
              <Text style={styles.name}>{name[0].toUpperCase() + name.slice(1)}</Text>
              {name === dominant && <Text style={styles.tag}>strongest</Text>}
              {name === weakest && <Text style={styles.tag}>weakest</Text>}
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
  name: { ...typography.label, color: colors.espresso },
  tag: {
    ...typography.eyebrow,
    fontSize: 10,
    color: colors.moss,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  percent: { ...typography.label, color: colors.bark },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.sand, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  evidence: { ...typography.caption, color: colors.stone },
});
