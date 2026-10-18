// FengShuiRatingScreen.tsx — the score over the room's last frame, with the full analysis behind "see more"
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CaretUp } from 'phosphor-react-native';
import BackButton from '../components/common/BackButton';
import Button from '../components/common/Button';
import ScreenContainer from '../components/common/ScreenContainer';
import ViewfinderFrame from '../components/common/ViewfinderFrame';
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
  const { analysis, previewImage, hazardCount } = route.params;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const score = Math.round(Math.min(100, Math.max(0, analysis.overall_score)));

  return (
    <ScreenContainer variant="result">
      <BackButton onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ScanRoom' }] })} label="Scan another room" />

      <View style={styles.main}>
        <ViewfinderFrame fill>
          <Image source={{ uri: previewImage }} style={styles.photo} accessibilityIgnoresInvertColors />
        </ViewfinderFrame>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={() => setDetailsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="See more"
          hitSlop={12}
          style={styles.seeMore}>
          <CaretUp size={32} weight="bold" color={colors.paper} />
        </Pressable>
      </View>

      <Modal
        visible={detailsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Overall feng shui score</Text>
            <View style={styles.bar}>
              <ScoreBar percent={score} dark />
            </View>
            <Text style={styles.score} accessibilityLabel={`Your feng shui score is ${score} out of 100`}>
              {score}%
            </Text>

            <Text style={styles.sheetTitle}>
              {analysis.room_type.charAt(0).toUpperCase() + analysis.room_type.slice(1)}
            </Text>
            <Text style={styles.summary}>{analysis.summary}</Text>

            <Text style={styles.sheetTitle}>The five elements</Text>
            <ElementBalance elements={analysis.elements} />

            {analysis.recommendations.length > 0 && (
              <>
                <Text style={styles.sheetTitle}>What to change</Text>
                <View style={styles.recs}>
                  {analysis.recommendations.map(item => (
                    <IssueListItem key={item.title} item={item} />
                  ))}
                </View>
              </>
            )}

            {hazardCount > 0 && (
              <View style={styles.dangerSpots}>
                <Button
                  label="danger spots"
                  onPress={() => {
                    setDetailsOpen(false);
                    navigation.goBack(); // back to the live camera, where the boxes are pinned
                  }}
                />
              </View>
            )}
          </ScrollView>
          <View style={styles.sheetFooter}>
            <Button label="close" onPress={() => setDetailsOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, paddingTop: 12, paddingBottom: 8 },
  photo: { flex: 1 },
  bottom: { alignItems: 'center', paddingTop: 8 },
  seeMore: { alignItems: 'center' },
  bar: { alignItems: 'center', marginTop: spacing.sm },
  score: { ...typography.display, fontSize: 56, lineHeight: 62, color: colors.ink },
  sheet: { flex: 1, backgroundColor: colors.sand },
  sheetContent: { padding: spacing.lg, gap: spacing.md },
  sheetTitle: { ...typography.title, color: colors.ink, marginTop: spacing.sm },
  summary: { ...typography.body, color: colors.ink },
  recs: { gap: spacing.md },
  dangerSpots: { alignItems: 'center', paddingTop: spacing.md },
  sheetFooter: { padding: spacing.lg },
});
