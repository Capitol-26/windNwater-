// FengShuiRatingScreen.tsx — shows the AI feng shui rating, element balance and chi flow
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/common/Button';
import ScreenContainer from '../components/common/ScreenContainer';
import ElementBalance from '../components/fengshui/ElementBalance';
import IssueListItem from '../components/fengshui/IssueListItem';
import RatingGauge from '../components/fengshui/RatingGauge';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function FengShuiRatingScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'FengShuiRating'>) {
  const { analysis } = route.params;
  const chi = analysis.chi_flow;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>
            {analysis.room_type} · {analysis.confidence} confidence
          </Text>
        </View>
        <Text style={styles.title}>Your room's feng shui</Text>

        <View style={styles.gauge}>
          <RatingGauge score={analysis.overall_score} />
        </View>
        <Text style={styles.summary}>{analysis.summary}</Text>

        <Text style={styles.section}>Chi flow</Text>
        <View style={styles.chiRow}>
          <Text style={styles.chiScore}>{chi.score}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${chi.score}%` }]} />
          </View>
        </View>
        <Text style={styles.body}>{chi.summary}</Text>
        {chi.issues.map(issue => (
          <Text key={issue} style={styles.issue}>
            • {issue}
          </Text>
        ))}

        <Text style={styles.section}>The five elements</Text>
        <ElementBalance
          elements={analysis.elements}
          dominant={analysis.dominant_element}
          weakest={analysis.weakest_element}
        />

        {analysis.recommendations.length > 0 && (
          <>
            <Text style={styles.section}>What to change</Text>
            <View style={styles.recs}>
              {analysis.recommendations.map(item => (
                <IssueListItem key={item.title} item={item} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Scan another room" icon="scan" onPress={() => navigation.popToTop()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.lg },
  eyebrow: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 6,
  },
  eyebrowText: { ...typography.eyebrow, fontSize: 11, color: colors.moss },
  title: { ...typography.title, fontSize: 32, lineHeight: 38, color: colors.espresso, marginTop: spacing.md },
  gauge: { alignItems: 'center', marginTop: spacing.lg },
  summary: { ...typography.body, color: colors.bark, marginTop: spacing.md },
  section: { ...typography.title, fontSize: 22, color: colors.espresso, marginTop: spacing.xl, marginBottom: spacing.sm },
  chiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chiScore: { ...typography.title, color: colors.espresso, minWidth: 44 },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.sand, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.moss },
  body: { ...typography.body, color: colors.bark, marginTop: spacing.sm },
  issue: { ...typography.caption, color: colors.bark, marginTop: 4 },
  recs: { gap: spacing.md },
  footer: { paddingTop: spacing.md },
});
