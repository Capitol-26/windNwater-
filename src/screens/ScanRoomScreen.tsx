// ScanRoomScreen.tsx — camera preview with a recording UI for scanning a room
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import BackButton from '../components/common/BackButton';
import Button from '../components/common/Button';
import LoadingOverlay from '../components/common/LoadingOverlay';
import ScreenContainer from '../components/common/ScreenContainer';
import ViewfinderFrame from '../components/common/ViewfinderFrame';
import { ARScan, ARScanView } from '../native/arScan';
import { MAX_SCAN_SECONDS, MIN_SCAN_SECONDS } from '../constants/config';
import { useScanUpload } from '../hooks/useScanUpload';
import { RootStackParamList } from '../navigation/navigation.types';
import { placeAll } from '../utils/raycast';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function ScanRoomScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ScanRoom'>) {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [supported, setSupported] = useState(true);
  const [pinned, setPinned] = useState<number | null>(null); // danger spots pinned in the room once the analysis is back
  const { state: upload, upload: uploadVideo, reset: resetUpload } = useScanUpload();

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopping = useRef(false);
  const morph = useRef(new Animated.Value(0)).current;

  // The camera keeps running while the server works. When the analysis is back, the danger spots are pinned in the
  // room it was scanned in, and the live view shows them.
  useEffect(() => {
    if (upload.status !== 'done') return;
    const { danger_spots, camera_samples = [], floor_y } = upload.result;
    const placed = placeAll(danger_spots ?? [], camera_samples, floor_y);
    ARScan.placeHazards(placed).then(() => setPinned(placed.length));
  }, [upload]);

  useEffect(() => {
    ARScan.isSupported().then(setSupported);
    ARScan.cameraPermission().then(async current => {
      if (current === 'undetermined') current = (await ARScan.requestCameraPermission()) ? 'granted' : 'denied';
      if (current === 'granted') await ARScan.resetSession(); // a new scan starts a new world
      setPermission(current);
    });
  }, []);
  const hasPermission = permission === 'granted';
  const ready = hasPermission && supported;

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
    return () => clearInterval(tick);
  }, [recording, morph]);

  // Stopping (by the shutter or by the time limit) hands the video to onRecordingFinished, which uploads it
  const stopRecording = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    if (limitTimer.current) clearTimeout(limitTimer.current);
    limitTimer.current = null;
    setRecording(false);
    try {
      uploadVideo(await ARScan.stopRecording());
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'The recording could not be saved.');
    }
  }, [uploadVideo]);

  useEffect(() => () => {
    if (limitTimer.current) clearTimeout(limitTimer.current);
  }, []);

  // backup for the limit timer: the clock reaching the limit also ends and sends the scan
  useEffect(() => {
    if (recording && seconds >= MAX_SCAN_SECONDS) stopRecording();
  }, [recording, seconds, stopRecording]);

  const toggleRecording = async () => {
    if (!recording) {
      stopping.current = false;
      setRecording(true);
      // the limit is its own timer, so it ends and sends the scan whatever the on-screen clock is doing
      limitTimer.current = setTimeout(stopRecording, MAX_SCAN_SECONDS * 1000);
      try {
        await ARScan.startRecording();
      } catch (error) {
        if (limitTimer.current) clearTimeout(limitTimer.current);
        stopping.current = true;
        setRecording(false);
        setRecordError(error instanceof Error ? error.message : 'The recording could not start.');
      }
    } else if (seconds >= MIN_SCAN_SECONDS) {
      await stopRecording();
    }
  };

  const innerSize = morph.interpolate({ inputRange: [0, 1], outputRange: [0, 34] });
  const innerRadius = morph.interpolate({ inputRange: [0, 1], outputRange: [17, 8] });

  return (
    <ScreenContainer variant="camera">
      {navigation.canGoBack() && <BackButton onPress={() => navigation.goBack()} label="Close scanner" />}

      <View style={styles.main}>
        <ViewfinderFrame fill dark={!ready}>
          {ready ? (
            <ARScanView style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.fallback}>
              <Text style={styles.fallbackText}>
                {hasPermission
                  ? 'Scanning needs an iPhone with ARKit. Run on a physical iPhone to scan a room.'
                  : 'Allow camera access to scan your room.'}
              </Text>
              {!hasPermission && (
                <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
                  <Text style={styles.settingsText}>open settings</Text>
                </Pressable>
              )}
            </View>
          )}

          {!recording && upload.status === 'idle' && (
            <Reanimated.View
              entering={FadeIn.delay(500).duration(500)}
              exiting={FadeOut.duration(300)}
              style={styles.hint}
              pointerEvents="none">
              <Text style={styles.hintText}>Slowly pan the room</Text>
            </Reanimated.View>
          )}
        </ViewfinderFrame>
      </View>

      {upload.status === 'done' ? (
        <View style={styles.bottom}>
          <Button
            label="see score"
            onPress={() =>
              navigation.navigate('FengShuiRating', {
                analysis: upload.result.analysis,
                previewImage: upload.result.preview_image,
                hazardCount: pinned ?? 0,
              })
            }
          />
          <Text style={styles.label}>
            {pinned === null ? 'placing danger spots' : pinned === 0 ? 'no danger spots found' : `${pinned} danger spot${pinned === 1 ? '' : 's'} pinned · look around`}
          </Text>
        </View>
      ) : (
      <View style={styles.bottom}>
        <Pressable
          onPress={toggleRecording}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop scanning' : 'Start scanning'}
          style={styles.shutter}>
          <View style={styles.shutterRing}>
            <View style={styles.shutterCore} />
            <Animated.View
              style={[styles.shutterInner, { width: innerSize, height: innerSize, borderRadius: innerRadius }]}
            />
          </View>
        </Pressable>
        <Text style={styles.label}>
          {recording
            ? `${seconds < MIN_SCAN_SECONDS ? 'keep panning' : 'click to finish'} · ${formatTime(Math.min(seconds, MAX_SCAN_SECONDS))} / ${formatTime(MAX_SCAN_SECONDS)}`
            : 'click to start'}
        </Text>
      </View>
      )}

      {(upload.status === 'uploading' || upload.status === 'analyzing') && (
        <LoadingOverlay
          phase={upload.status === 'uploading' ? 'uploading' : 'analyzing'}
          uploadProgress={upload.status === 'uploading' ? upload.progress : 1}
        />
      )}

      {(upload.status === 'error' || recordError) && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{recordError ?? (upload.status === 'error' ? upload.message : '')}</Text>
          <Button label="try again" onPress={() => { setRecordError(null); resetUpload(); }} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, paddingTop: 12, paddingBottom: 8 },
  hint: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  hintText: { ...typography.display, color: colors.paper },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  fallbackText: { ...typography.body, color: colors.paper, textAlign: 'center' },
  settingsText: { ...typography.caption, color: colors.sand, textDecorationLine: 'underline' },
  bottom: { alignItems: 'center', paddingTop: 8 },
  shutter: { width: 85, height: 85, alignItems: 'center', justifyContent: 'center' },
  shutterRing: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: { width: 63, height: 63, borderRadius: 31.5, backgroundColor: colors.paper },
  shutterInner: { position: 'absolute', backgroundColor: colors.clay },
  label: { ...typography.button, color: colors.paper, marginTop: 4 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  overlayTitle: { ...typography.title, color: colors.ink, textAlign: 'center' },
});
