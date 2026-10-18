// AboutSheet.tsx — what the app does, how to scan, and what the score and the red and green boxes mean
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Button from './Button';

type Props = { visible: boolean; onClose: () => void };

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

// A swatch the colour of the AR boxes, followed by what that colour means
function Legend({ color, title, children }: { color: string; title: string; children: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.legendHead}>
        <View style={[styles.swatch, { borderColor: color, backgroundColor: color + '38' }]} />
        <Text style={styles.heading}>{title}</Text>
      </View>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export default function AboutSheet({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>About windNwater</Text>
          <Text style={styles.body}>
            Walk slowly around one room and windNwater rates its feng shui, then shows you what is getting in the way of
            the energy in it.
          </Text>

          <Section title="Scanning">
            Hold your phone upright and pan slowly across the whole room, walls, floor and furniture, for 4 to 20
            seconds. Good light helps. Any iPhone that supports ARKit works; no LiDAR is needed. When you finish, stay in
            the room and keep the camera pointed at it while the analysis runs.
          </Section>

          <Section title="Your score">
            The score is out of 100. Around 50 is an average room and 80 or more is a good one. It also shows how the
            five elements (wood, fire, earth, metal and water) are balanced in the room, and the changes that would help
            most.
          </Section>

          <Section title="Chi">
            In feng shui, chi is the energy of a room. It should come in at the door and drift slowly through the space.
            Two things disturb it, and windNwater marks both on the camera view once the analysis is done.
          </Section>

          <Legend color={colors.hazardRed} title="Red: blocked chi">
            Clutter zones and obstacles that stop energy moving: piles of bags, boxes, clothes or papers, and anything
            standing in a walkway or in front of a door or window. Close piles are drawn as one zone. Clearing or moving
            them lets the room breathe.
          </Legend>

          <Legend color={colors.hazardGreen} title="Green: poison arrows">
            Sharp corners and edges that point at the places where you sit, sleep or enter, such as the corner of a
            table, shelf or cabinet, or a picture frame, aimed at a bed, a chair or a door. Turn the furniture, move it,
            or soften the corner with a plant or a cloth. Doors, windows and walls are never marked.
          </Legend>

          <Section title="After the scan">
            Tap "see score" for the full rating. The "danger spots" button on that page takes you back to the camera,
            where the boxes stay pinned to the room as you look around. Start a new scan from the arrow at the top left.
          </Section>

          <Section title="Good to know">
            The ratings and the boxes come from an AI looking at your walk-through, so they are a guide and not exact.
            A box can sit a little off its object, and a small or hidden item can be missed. If the camera is covered or
            moved very fast, the boxes can drift. Your walk-through is sent to our server and frames from it to an AI
            service so it can be analysed.
          </Section>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.display, fontSize: 34, lineHeight: 40, color: colors.ink, textAlign: 'left' },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  heading: { ...typography.title, color: colors.ink },
  body: { ...typography.body, color: colors.ink },
  legendHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  swatch: { width: 26, height: 26, borderRadius: 6, borderWidth: 3 },
  footer: { padding: spacing.lg },
});
