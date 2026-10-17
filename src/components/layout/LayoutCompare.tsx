// LayoutCompare.tsx — before/after slider: the current plan on the left of the handle, the optimal plan on the right
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import { RoomLayout } from '../../types/fengshui.types';
import RoomPlan from './RoomPlan';

const HANDLE = 48;

export default function LayoutCompare({ layout }: { layout: RoomLayout }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const split = useSharedValue(1); // share of the width showing the current plan
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Open on the current plan alone, then sweep to the middle so the slider shows itself
  useEffect(() => {
    split.value = withDelay(500, withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
  }, [split]);

  const pan = useMemo(() => {
    const move = (x: number) => {
      const { width } = sizeRef.current;
      if (width > 0) split.value = Math.min(1, Math.max(0, x / width));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: e => move(e.nativeEvent.locationX),
      onPanResponderMove: e => move(e.nativeEvent.locationX),
    });
  }, [split]);

  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);
  const currentStyle = useAnimatedStyle(() => ({ width: split.value * size.width }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: split.value * size.width - HANDLE / 2 }] }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: split.value * size.width - 2 }] }));

  return (
    <View style={styles.root} onLayout={onLayout}>
      {size.width > 0 && (
        <>
          <RoomPlan layout={layout} items={layout.optimal_items} mode="optimal" tint={colors.sage} width={size.width} height={size.height} />
          <Animated.View style={[styles.clip, currentStyle]} pointerEvents="none">
            <View style={{ width: size.width, height: size.height }}>
              <RoomPlan layout={layout} items={layout.items} mode="now" tint={colors.clay} width={size.width} height={size.height} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.line, lineStyle]} pointerEvents="none" />
          <Animated.View style={[styles.handle, handleStyle]} pointerEvents="none">
            <CaretLeft size={16} weight="bold" color={colors.ink} />
            <CaretRight size={16} weight="bold" color={colors.ink} />
          </Animated.View>
          <View
            style={StyleSheet.absoluteFill}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Compare your current layout with the optimal one"
            {...pan.panHandlers}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clip: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 4, backgroundColor: colors.paper },
  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
