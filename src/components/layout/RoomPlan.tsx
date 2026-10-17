// RoomPlan.tsx — blueprint-style top-down plan: drafting grid, double-line walls, doors with their swing,
// windows, and every piece of furniture labelled. Only the room's proportions are drawn, never its measurements.
import { Fragment, memo } from 'react';
import { View } from 'react-native';
import { Broom, Sparkle } from 'phosphor-react-native';
import Svg, { Defs, Line, Path, Pattern, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { serif } from '../../theme/typography';
import { LayoutItem, RoomLayout } from '../../types/fengshui.types';
import { fitPlan, openingGeometry } from '../../utils/roomLayout';

type Props = {
  layout: RoomLayout;
  items: (LayoutItem & { added?: boolean })[];
  mode: 'now' | 'optimal'; // optimal shows added pieces and cleared clutter; now shows the clutter to clear
  tint: string; // furniture linework and hatch
  width: number;
  height: number;
};

const PAD = 40; // room for the wall and a margin on every side
const GRID_CELLS = 8; // the shorter side of the room is always this many cells, whatever its real size
const LABEL_MAX = 13;
const LABEL_MIN = 10;
const LINE = colors.ink;

// One path for every grid line across the sheet, anchored on the room's north-west corner
function gridPath(width: number, height: number, originX: number, originY: number, step: number, major: boolean) {
  if (!(step > 0)) return '';
  let d = '';
  const first = (origin: number) => origin - Math.floor(origin / step) * step;
  for (let x = first(originX); x <= width; x += step) {
    if ((Math.round((x - originX) / step) % 4 === 0) === major) d += `M${x} 0V${height}`;
  }
  for (let y = first(originY); y <= height; y += step) {
    if ((Math.round((y - originY) / step) % 4 === 0) === major) d += `M0 ${y}H${width}`;
  }
  return d;
}

// Largest font (down to LABEL_MIN) at which `text` fits in `room` pixels; serif glyphs average ~0.46 em
function labelSize(text: string, room: number) {
  return Math.max(LABEL_MIN, Math.min(LABEL_MAX, (room - 10) / (text.length * 0.46)));
}

function RoomPlan({ layout, items, mode, tint, width, height }: Props) {
  const { scale, originX, originY } = fitPlan(layout, width, height, PAD);
  const px = (x: number) => originX + x * scale;
  const py = (y: number) => originY + y * scale;
  const wall = Math.max(5, scale * 0.12);
  const roomW = layout.width * scale;
  const roomL = layout.length * scale;
  const step = Math.min(roomW, roomL) / GRID_CELLS;
  const hatch = `hatch${tint.replace('#', '')}`;

  const zones = (layout.clutter ?? []).map(zone => ({
    x: px(zone.x) - (zone.width * scale) / 2,
    y: py(zone.y) - (zone.depth * scale) / 2,
    w: zone.width * scale,
    h: zone.depth * scale,
    cx: px(zone.x),
    cy: py(zone.y),
  }));

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id={hatch} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={7} stroke={tint} strokeWidth={1.6} />
          </Pattern>
        </Defs>

        {/* opaque sheet, so the plan on top hides the one underneath when the slider is dragged */}
        <Rect width={width} height={height} fill={colors.drafting} />
        <Path d={gridPath(width, height, originX, originY, step, false)} stroke={LINE} strokeOpacity={0.09} strokeWidth={0.75} />
        <Path d={gridPath(width, height, originX, originY, step, true)} stroke={LINE} strokeOpacity={0.22} strokeWidth={1} />

        <Rect x={originX} y={originY} width={roomW} height={roomL} fill={colors.paper} fillOpacity={0.55} />

        {/* walls: a solid band around the room's inside edge */}
        <Path
          fillRule="evenodd"
          fill={LINE}
          d={`M${originX - wall} ${originY - wall}h${roomW + 2 * wall}v${roomL + 2 * wall}h${-(roomW + 2 * wall)}Z M${originX} ${originY}h${roomW}v${roomL}h${-roomW}Z`}
        />

        {layout.openings.map((o, i) => {
          const { from, to, inward } = openingGeometry(layout, o);
          const a = { x: px(from.x), y: py(from.y) };
          const b = { x: px(to.x), y: py(to.y) };
          const out = { x: -inward.x * wall, y: -inward.y * wall };
          const gap = `${a.x},${a.y} ${b.x},${b.y} ${b.x + out.x},${b.y + out.y} ${a.x + out.x},${a.y + out.y}`;
          const cap = `M${a.x} ${a.y}l${out.x} ${out.y}M${b.x} ${b.y}l${out.x} ${out.y}`;
          // name the opening just outside its wall
          const name = (
            <SvgText
              x={(a.x + b.x) / 2 - (inward.x * (wall + 12))}
              y={(a.y + b.y) / 2 - (inward.y * (wall + 12)) + 4}
              fontFamily={serif}
              fontSize={LABEL_MAX - 1}
              fill={LINE}
              textAnchor="middle">
              {o.kind}
            </SvgText>
          );

          if (o.kind === 'window') {
            const rail = (t: number) => `M${a.x + out.x * t} ${a.y + out.y * t}L${b.x + out.x * t} ${b.y + out.y * t}`;
            return (
              <Fragment key={i}>
                <Polygon points={gap} fill={colors.drafting} />
                <Path d={`${cap}${rail(0)}${rail(0.5)}${rail(1)}`} stroke={LINE} strokeWidth={1.2} />
                {name}
              </Fragment>
            );
          }

          // door: an opening in the wall, a solid leaf swung into the room and the floor it sweeps shaded
          const r = Math.hypot(b.x - a.x, b.y - a.y);
          const along = { x: (b.x - a.x) / r, y: (b.y - a.y) / r };
          const tip = { x: a.x + inward.x * r, y: a.y + inward.y * r };
          const end = { x: a.x + along.x * r, y: a.y + along.y * r };
          const sweep = (tip.x - a.x) * (end.y - a.y) - (tip.y - a.y) * (end.x - a.x) > 0 ? 1 : 0;
          return (
            <Fragment key={i}>
              <Polygon points={gap} fill={colors.drafting} />
              <Path d={`M${a.x} ${a.y}L${tip.x} ${tip.y}A${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}Z`} fill={colors.clay} fillOpacity={0.18} stroke={colors.clay} strokeWidth={1} strokeDasharray="3 3" />
              <Path d={cap} stroke={LINE} strokeWidth={1.2} />
              <Path d={`M${a.x} ${a.y}L${tip.x} ${tip.y}`} stroke={colors.clay} strokeWidth={3.5} strokeLinecap="round" />
              {name}
            </Fragment>
          );
        })}

        {zones.map((z, i) => (
          <Rect
            key={`zone${i}`}
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            rx={6}
            fill={mode === 'now' ? colors.clay : colors.sage}
            fillOpacity={mode === 'now' ? 0.18 : 0.12}
            stroke={mode === 'now' ? colors.clay : colors.sage}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        ))}

        {items.map(item => {
          const w = item.width * scale;
          const h = item.depth * scale;
          const x = px(item.x) - w / 2;
          const y = py(item.y) - h / 2;
          const text = item.added ? `+ ${item.name}` : item.name;
          const size = labelSize(text, w);
          const boxW = text.length * size * 0.46 + 10;
          return (
            <Fragment key={item.name}>
              <Rect x={x} y={y} width={w} height={h} fill={tint} fillOpacity={0.12} />
              <Rect x={x} y={y} width={w} height={h} fill={`url(#${hatch})`} stroke={tint} strokeWidth={2} strokeDasharray={item.added ? '6 4' : undefined} />
              <Rect x={px(item.x) - boxW / 2} y={py(item.y) - size / 2 - 3} width={boxW} height={size + 6} fill={colors.drafting} />
              <SvgText x={px(item.x)} y={py(item.y) + size * 0.32} fontFamily={serif} fontSize={size} fill={LINE} textAnchor="middle">
                {text}
              </SvgText>
            </Fragment>
          );
        })}
      </Svg>

      {/* the broom marks clutter to clear; the sparkle marks the same spot once it is clear */}
      {zones.map((z, i) => {
        const Icon = mode === 'now' ? Broom : Sparkle;
        const size = Math.max(16, Math.min(30, Math.min(z.w, z.h) - 8));
        return (
          <View key={`icon${i}`} pointerEvents="none" style={{ position: 'absolute', left: z.cx - size / 2, top: z.cy - size / 2 }}>
            <Icon size={size} weight="bold" color={mode === 'now' ? colors.clay : colors.sage} />
          </View>
        );
      })}
    </View>
  );
}

export default memo(RoomPlan);
