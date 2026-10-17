// IssueListItem.tsx — one feng shui recommendation row
import { StyleSheet, Text, View } from 'react-native';
import { Recommendation } from '../../types/fengshui.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const PRIORITY_COLOR = { high: colors.clay, medium: colors.moss, low: colors.stone } as const;

export default function IssueListItem({ item }: { item: Recommendation }) {
  return (
    <View style={styles.row}>
      <View style={[styles.bar, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
      <View style={styles.text}>
        <Text style={styles.title}>{item.title}</Text>
        {!!item.detail && <Text style={styles.detail}>{item.detail}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  bar: { width: 3, borderRadius: 2 },
  text: { flex: 1, gap: 2 },
  title: { ...typography.label, fontSize: 16, color: colors.espresso },
  detail: { ...typography.caption, color: colors.bark },
});
