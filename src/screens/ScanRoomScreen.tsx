// ScanRoomScreen.tsx — camera preview with a recording UI for scanning a room
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission } from 'react-native-vision-camera';
import BackButton from '../components/common/BackButton';
import Button from '../components/common/Button';
import LoadingOverlay from '../components/common/LoadingOverlay';
import ScreenContainer from '../components/common/ScreenContainer';
import ViewfinderFrame from '../components/common/ViewfinderFrame';
import { MAX_SCAN_SECONDS, MIN_SCAN_SECONDS } from '../constants/config';
import { useScanUpload } from '../hooks/useScanUpload';
import { RootStackParamList } from '../navigation/navigation.types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function ScanRoomScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ScanRoom'>) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  // 720p at a low bitrate keeps the file small; the server only needs ~640px-wide frames.
  const format = useCameraFormat(device, [{ videoResolution: { width: 1280, height: 720 } }, { fps: 24 }]);
  const camera = useRef<Camera>(null);
  const { state: upload, upload: uploadVideo, reset: resetUpload } = useScanUpload();

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const morph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (upload.status === 'done') navigation.replace('FengShuiRating', {
        analysis: upload.result.analysis,
        previewImage: upload.result.preview_image,
      });
  }, [upload, navigation]);

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
    return () => clearInterval(tick);
  }, [recording, morph]);

  // Stopping (by the shutter or by the time limit) hands the video to onRecordingFinished, which uploads it
  const stopRecording = useCallback(async () => {
    if (limitTimer.current) clearTimeout(limitTimer.current);
    limitTimer.current = null;
    setRecording(false);
    try {
      await camera.current?.stopRecording();
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'The recording could not be saved.');
    }
  }, []);

  useEffect(() => () => {
    if (limitTimer.current) clearTimeout(limitTimer.current);
  }, []);

  const toggleRecording = async () => {
    if (!recording) {
      setRecording(true);
      // the limit is its own timer, so it ends and sends the scan whatever the on-screen clock is doing
      limitTimer.current = setTimeout(stopRecording, MAX_SCAN_SECONDS * 1000);
      camera.current?.startRecording({
        fileType: 'mov',
        videoCodec: 'h264',
        onRecordingFinished: video => uploadVideo(video.path),
        onRecordingError: error => {
          if (limitTimer.current) clearTimeout(limitTimer.current);
          setRecording(false);
          setRecordError(error.message);
        },
      });
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
        <ViewfinderFrame fill dark={!(hasPermission && device)}>
          {hasPermission && device ? (
            <Camera
              ref={camera}
              style={StyleSheet.absoluteFill}
              device={device}
              format={format}
              fps={24}
              videoBitRate="extra-low"
              isActive
              video
              audio={false}
            />
          ) : (
            <View style={styles.fallback}>
              <Text style={styles.fallbackText}>
                {hasPermission
                  ? 'No camera found. Run on a physical iPhone to scan a room.'
                  : 'Allow camera access to scan your room.'}
              </Text>
              {!hasPermission && (
                <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
                  <Text style={styles.settingsText}>open settings</Text>
                </Pressable>
              )}
            </View>
          )}

          {!recording && (
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

      {(upload.status === 'uploading' || upload.status === 'analyzing' || upload.status === 'done') && (
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
