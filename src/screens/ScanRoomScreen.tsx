// ScanRoomScreen.tsx — camera preview with a recording UI for scanning a room
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Icon from '../components/common/Icon';
import { useScanUpload } from '../hooks/useScanUpload';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { typography } from '../theme/typography';

const PROMPTS = [
  'Stand in a corner and face the opposite wall.',
  'Turn slowly. Keep every wall in view.',
  'Pan across the furniture, low and high.',
];

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function ScanRoomScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ScanRoom'>) {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const { state: upload, upload: uploadVideo, reset: resetUpload } = useScanUpload();

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const morph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    Animated.timing(morph, {
      toValue: recording ? 1 : 0,
      duration: 420,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: false,
    }).start();
    if (!recording) return;
    setSeconds(0);
    const tick = setInterval(() => setSeconds(s => s + 1), 1000);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      clearInterval(tick);
      loop.stop();
    };
  }, [recording, morph, pulse]);

  const toggleRecording = async () => {
    if (!recording) {
      setRecording(true);
      camera.current?.startRecording({
        fileType: 'mov',
        videoCodec: 'h264',
        onRecordingFinished: video => uploadVideo(video.path),
        onRecordingError: () => {},
      });
    } else {
      setRecording(false);
      await camera.current?.stopRecording();
    }
  };

  const prompt = PROMPTS[Math.min(Math.floor(seconds / 8), PROMPTS.length - 1)];
  const innerSize = morph.interpolate({ inputRange: [0, 1], outputRange: [58, 28] });
  const innerRadius = morph.interpolate({ inputRange: [0, 1], outputRange: [29, 8] });

  return (
    <View style={styles.root}>
      {hasPermission && device ? (
        <Camera ref={camera} style={StyleSheet.absoluteFill} device={device} isActive video audio={false} />
      ) : (
        <View style={styles.fallback}>
          <Icon name="scan" size={36} color={colors.sandDeep} />
          <Text style={styles.fallbackTitle}>
            {hasPermission ? 'No camera found' : 'Camera access needed'}
          </Text>
          <Text style={styles.fallbackText}>
            {hasPermission
              ? 'Run on a physical iPhone to scan a room.'
              : 'Allow camera access to scan your room.'}
          </Text>
          {!hasPermission && (
            <Pressable onPress={() => Linking.openSettings()} style={styles.settingsLink}>
              <Text style={styles.settingsText}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.scrimTop} pointerEvents="none" />
      <View style={styles.scrimBottom} pointerEvents="none" />

      <View style={[styles.corners, { top: insets.top + 110, bottom: insets.bottom + 250 }]} pointerEvents="none">
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close scanner"
          style={styles.closeButton}>
          <Icon name="close" color={colors.cream} size={20} />
        </Pressable>
        {recording && (
          <View style={styles.timer}>
            <Animated.View style={[styles.recDot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }]} />
            <Text style={styles.timerText}>{formatTime(seconds)}</Text>
          </View>
        )}
        <View style={styles.closeButton} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={styles.eyebrow}>{recording ? 'Scanning' : 'Room scan'}</Text>
        <Text style={styles.prompt}>
          {recording ? prompt : 'Move slowly and keep the walls in frame.'}
        </Text>

        <Pressable
          onPress={toggleRecording}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop scanning' : 'Start scanning'}
          style={styles.ring}>
          <Animated.View
            style={[styles.inner, { width: innerSize, height: innerSize, borderRadius: innerRadius }]}
          />
        </Pressable>
        <Text style={styles.hint}>{recording ? 'Tap to finish' : 'Tap to start'}</Text>
      </View>

      {upload.status !== 'idle' && (
        <View style={styles.overlay}>
          <Text style={styles.eyebrow}>
            {upload.status === 'done' ? 'Scan received' : upload.status === 'error' ? 'Something went wrong' : 'Working'}
          </Text>
          <Text style={styles.overlayTitle}>
            {upload.status === 'uploading' && `Sending your scan ${Math.round(upload.progress * 100)}%`}
            {upload.status === 'analyzing' && 'Reading the room…'}
            {upload.status === 'done' && `${upload.result.frame_count} frames captured`}
            {upload.status === 'error' && upload.message}
          </Text>
          {(upload.status === 'done' || upload.status === 'error') && (
            <Pressable
              onPress={() => (upload.status === 'done' ? navigation.goBack() : resetUpload())}
              style={styles.overlayButton}>
              <Text style={styles.overlayButtonText}>{upload.status === 'done' ? 'Done' : 'Try again'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const CORNER = 34;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.espresso },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  fallbackTitle: { ...typography.title, color: colors.cream, marginTop: spacing.sm },
  fallbackText: { ...typography.body, color: colors.sandDeep, textAlign: 'center' },
  settingsLink: { marginTop: spacing.md },
  settingsText: { ...typography.label, color: colors.clay },
  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: 'rgba(42,31,24,0.35)' },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 360, backgroundColor: colors.scrim },
  corners: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.cream, opacity: 0.85 },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: radii.sm },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: radii.sm },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: radii.sm },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: radii.sm },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,31,24,0.5)',
    borderWidth: 1,
    borderColor: colors.hairlineLight,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(42,31,24,0.6)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.clay },
  timerText: { ...typography.label, color: colors.cream, fontVariant: ['tabular-nums'] },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.lg },
  eyebrow: { ...typography.eyebrow, color: colors.sage },
  prompt: { ...typography.title, fontSize: 24, lineHeight: 30, color: colors.cream, textAlign: 'center', marginTop: spacing.sm, minHeight: 60 },
  ring: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  inner: { backgroundColor: colors.clay },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(42,31,24,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  overlayTitle: { ...typography.title, color: colors.cream, textAlign: 'center' },
  overlayButton: {
    marginTop: spacing.md,
    backgroundColor: colors.clay,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md - 2,
  },
  overlayButtonText: { ...typography.label, fontSize: 17, color: colors.cream },
  hint: { ...typography.caption, color: colors.sandDeep, marginTop: spacing.sm + 2 },
});
