// RatingGauge.tsx — score ring (0-100) for the feng shui rating
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = { score: number; size?: number; label?: string };

export default function RatingGauge({ score, size = 190, label = 'out of 100' }: Props) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const tone = clamped >= 70 ? colors.moss : clamped >= 45 ? colors.clay : colors.clayDark;

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Score ${clamped} out of 100`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.sand} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tone}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{Math.round(clamped)}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  score: { ...typography.hero, fontSize: 56, lineHeight: 60, color: colors.espresso },
  label: { ...typography.caption, color: colors.stone },
});
