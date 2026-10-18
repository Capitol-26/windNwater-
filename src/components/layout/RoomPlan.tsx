// RoomPlan.tsx — top-down plan drawn as icons: a rounded room, a tile and Phosphor icon for every piece of furniture,
// door and window icons set into the wall. No grid, no linework. Only the room's proportions are drawn, never its measurements.
import { memo } from 'react';
import { View } from 'react-native';
import { Broom, Sparkle } from 'phosphor-react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { LayoutItem, RoomLayout } from '../../types/fengshui.types';
import { furnitureIcon, openingIcon } from '../../utils/furnitureIcon';
import { fitPlan, openingGeometry } from '../../utils/roomLayout';

type Props = {
  layout: RoomLayout;
  items: (LayoutItem & { added?: boolean })[];
  mode: 'now' | 'optimal'; // optimal shows added pieces and cleared clutter; now shows the clutter to clear
  tint: string; // furniture tiles and icons
  width: number;
  height: number;
};

const PAD = 36; // room for the wall and a margin on every side
const BADGE = 30; // door and window badges
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function RoomPlan({ layout, items, mode, tint, width, height }: Props) {
  const { scale, originX, originY } = fitPlan(layout, width, height, PAD);
  const px = (x: number) => originX + x * scale;
  const py = (y: number) => originY + y * scale;
  const wall = Math.max(6, scale * 0.1);
  const roomW = layout.width * scale;
  const roomL = layout.length * scale;
  const radius = Math.min(roomW, roomL) * 0.06 + wall;
  const accent = mode === 'now' ? colors.clay : colors.sage;

  const zones = (layout.clutter ?? []).map(zone => ({
    x: px(zone.x) - (zone.width * scale) / 2,
    y: py(zone.y) - (zone.depth * scale) / 2,
    w: zone.width * scale,
    h: zone.depth * scale,
    cx: px(zone.x),
    cy: py(zone.y),
  }));

  // the wall is a rounded band; each door or window cuts a gap in it
  const gaps = layout.openings.map(o => {
    const { from, to } = openingGeometry(layout, o);
    return { o, cx: px((from.x + to.x) / 2), cy: py((from.y + to.y) / 2), len: Math.hypot(to.x - from.x, to.y - from.y) * scale };
  });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* opaque sheet, so the plan on top hides the one underneath when the slider is dragged */}
        <Rect width={width} height={height} fill={colors.drafting} />
        <Rect x={originX} y={originY} width={roomW} height={roomL} rx={radius} fill={colors.paper} />
        <Rect
          x={originX - wall / 2}
          y={originY - wall / 2}
          width={roomW + wall}
          height={roomL + wall}
          rx={radius}
          fill="none"
          stroke={colors.ink}
          strokeWidth={wall}
        />

        {/* openings: a drafting-sheet gap in the wall, closed off by the badge icon below */}
        {gaps.map(({ o, cx, cy, len }, i) => {
          const horizontal = o.wall === 'north' || o.wall === 'south';
          const span = Math.max(len, BADGE);
          return (
            <Rect
              key={`gap${i}`}
              x={horizontal ? cx - span / 2 : cx - wall}
              y={horizontal ? cy - wall : cy - span / 2}
              width={horizontal ? span : wall * 2}
              height={horizontal ? wall * 2 : span}
              fill={colors.drafting}
            />
          );
        })}

        {zones.map((z, i) => (
          <Rect key={`zone${i}`} x={z.x} y={z.y} width={z.w} height={z.h} rx={Math.min(z.w, z.h) / 2.5} fill={accent} fillOpacity={0.16} />
        ))}

        {items.map(item => {
          const w = item.width * scale;
          const h = item.depth * scale;
          return (
            <Rect
              key={item.name}
              x={px(item.x) - w / 2}
              y={py(item.y) - h / 2}
              width={w}
              height={h}
              rx={clamp(Math.min(w, h) * 0.22, 6, 18)}
              fill={tint}
              fillOpacity={item.added ? 0.55 : 1}
            />
          );
        })}
      </Svg>

      {gaps.map(({ o, cx, cy }, i) => {
        const Icon = openingIcon(o.kind);
        return (
          <View
            key={`open${i}`}
            accessibilityLabel={o.kind}
            style={{
              position: 'absolute',
              left: cx - BADGE / 2,
              top: cy - BADGE / 2,
              width: BADGE,
              height: BADGE,
              borderRadius: BADGE / 2,
              backgroundColor: o.kind === 'door' ? colors.clay : colors.sage,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon size={18} weight="bold" color={colors.paper} />
          </View>
        );
      })}

      {items.map(item => {
        const Icon = furnitureIcon(item.name);
        const size = clamp(Math.min(item.width, item.depth) * scale - 8, 16, 36);
        return (
          <View
            key={`icon${item.name}`}
            pointerEvents="none"
            accessibilityLabel={item.name}
            style={{ position: 'absolute', left: px(item.x) - size / 2, top: py(item.y) - size / 2 }}>
            <Icon size={size} weight="bold" color={colors.paper} />
          </View>
        );
      })}

      {/* the broom marks clutter to clear; the sparkle marks the same spot once it is clear */}
      {zones.map((z, i) => {
        const Icon = mode === 'now' ? Broom : Sparkle;
        const size = clamp(Math.min(z.w, z.h) - 8, 16, 30);
        return (
          <View key={`clutter${i}`} pointerEvents="none" style={{ position: 'absolute', left: z.cx - size / 2, top: z.cy - size / 2 }}>
            <Icon size={size} weight="bold" color={accent} />
          </View>
        );
      })}
    </View>
  );
}

export default memo(RoomPlan);
