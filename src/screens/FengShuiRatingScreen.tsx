// FengShuiRatingScreen.tsx — the score and the full analysis, straight away
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import BackButton from '../components/common/BackButton';
import Button from '../components/common/Button';
import ScreenContainer from '../components/common/ScreenContainer';
import ScoreBar from '../components/fengshui/ScoreBar';
import ElementBalance from '../components/fengshui/ElementBalance';
import IssueListItem from '../components/fengshui/IssueListItem';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function FengShuiRatingScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'FengShuiRating'>) {
  const { analysis, hazardCount } = route.params;
  const score = Math.round(Math.min(100, Math.max(0, analysis.overall_score)));

  return (
    <ScreenContainer variant="result">
      <BackButton onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ScanRoom' }] })} label="Scan another room" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Overall feng shui score</Text>
        <View style={styles.bar}>
          <ScoreBar percent={score} dark />
        </View>
        <Text style={styles.score} accessibilityLabel={`Your feng shui score is ${score} out of 100`}>
          {score}%
        </Text>

        <Text style={styles.heading}>{analysis.room_type.charAt(0).toUpperCase() + analysis.room_type.slice(1)}</Text>
        <Text style={styles.summary}>{analysis.summary}</Text>

        <Text style={styles.heading}>The five elements</Text>
        <ElementBalance elements={analysis.elements} />

        {analysis.recommendations.length > 0 && (
          <>
            <Text style={styles.heading}>What to change</Text>
            <View style={styles.recs}>
              {analysis.recommendations.map(item => (
                <IssueListItem key={item.title} item={item} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {hazardCount > 0 && (
        <View style={styles.footer}>
          {/* back to the live camera, where the danger spots are pinned */}
          <Button label="danger spots" onPress={() => navigation.goBack()} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  heading: { ...typography.title, color: colors.ink, marginTop: spacing.sm },
  bar: { alignItems: 'center', marginTop: spacing.sm },
  score: { ...typography.display, fontSize: 56, lineHeight: 62, color: colors.ink },
  summary: { ...typography.body, color: colors.ink },
  recs: { gap: spacing.md },
  footer: { alignItems: 'center', paddingVertical: spacing.md },
});
