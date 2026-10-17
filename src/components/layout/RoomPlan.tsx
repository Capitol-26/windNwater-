// RoomPlan.tsx — top-down 2D plan of a room on a metre grid: walls, doors, windows and furniture
import { Fragment, memo } from 'react';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { serif } from '../../theme/typography';
import { LayoutItem, RoomLayout } from '../../types/fengshui.types';
import { fitPlan, gridLines, openingGeometry } from '../../utils/roomLayout';

type Props = {
  layout: RoomLayout;
  items: LayoutItem[];
  tint: string; // furniture fill
  width: number;
  height: number;
};

const PAD = 30;
const LABEL_SIZE = 15;

function RoomPlan({ layout, items, tint, width, height }: Props) {
  const { scale, originX, originY } = fitPlan(layout, width, height, PAD);
  const px = (x: number) => originX + x * scale;
  const py = (y: number) => originY + y * scale;
  const grid = gridLines(layout.width);
  const gridY = gridLines(layout.length);

  return (
    <Svg width={width} height={height}>
      <Rect x={px(0)} y={py(0)} width={layout.width * scale} height={layout.length * scale} fill={colors.paper} fillOpacity={0.55} />

      {grid.minor.map(x => <Line key={`vx${x}`} x1={px(x)} y1={py(0)} x2={px(x)} y2={py(layout.length)} stroke={colors.track} strokeWidth={1} />)}
      {grid.major.map(x => <Line key={`Vx${x}`} x1={px(x)} y1={py(0)} x2={px(x)} y2={py(layout.length)} stroke={colors.inkSoft} strokeOpacity={0.35} strokeWidth={1.5} />)}
      {gridY.minor.map(y => <Line key={`hy${y}`} x1={px(0)} y1={py(y)} x2={px(layout.width)} y2={py(y)} stroke={colors.track} strokeWidth={1} />)}
      {gridY.major.map(y => <Line key={`Hy${y}`} x1={px(0)} y1={py(y)} x2={px(layout.width)} y2={py(y)} stroke={colors.inkSoft} strokeOpacity={0.35} strokeWidth={1.5} />)}

      <Rect x={px(0)} y={py(0)} width={layout.width * scale} height={layout.length * scale} fill="none" stroke={colors.ink} strokeWidth={4} />

      {layout.openings.map((o, i) => {
        const { from, to, inward } = openingGeometry(layout, o);
        if (o.kind === 'window') {
          return <Line key={i} x1={px(from.x)} y1={py(from.y)} x2={px(to.x)} y2={py(to.y)} stroke={colors.sage} strokeWidth={8} strokeLinecap="butt" />;
        }
        // door: a gap in the wall, the open leaf and the arc it sweeps
        const r = Math.hypot(to.x - from.x, to.y - from.y) * scale;
        const along = { x: (to.x - from.x) / (r / scale), y: (to.y - from.y) / (r / scale) };
        const hinge = { x: px(from.x), y: py(from.y) };
        const tip = { x: hinge.x + inward.x * r, y: hinge.y + inward.y * r };
        const end = { x: hinge.x + along.x * r, y: hinge.y + along.y * r };
        const sweep = (tip.x - hinge.x) * (end.y - hinge.y) - (tip.y - hinge.y) * (end.x - hinge.x) > 0 ? 1 : 0;
        return (
          <Fragment key={i}>
            <Line x1={px(from.x)} y1={py(from.y)} x2={px(to.x)} y2={py(to.y)} stroke={colors.sand} strokeWidth={8} />
            <Path d={`M${hinge.x} ${hinge.y}L${tip.x} ${tip.y}A${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}`} stroke={colors.ink} strokeWidth={1.5} fill="none" />
          </Fragment>
        );
      })}

      {items.map(item => {
        const w = item.width * scale;
        const h = item.depth * scale;
        const fits = item.name.length * LABEL_SIZE * 0.42 < w - 6 && h > LABEL_SIZE + 4;
        return (
          <Fragment key={item.name}>
            <Rect x={px(item.x) - w / 2} y={py(item.y) - h / 2} width={w} height={h} rx={5} fill={tint} />
            {fits && (
              <SvgText
                x={px(item.x)}
                y={py(item.y) + LABEL_SIZE * 0.3}
                fontFamily={serif}
                fontSize={LABEL_SIZE}
                fill={colors.paper}
                textAnchor="middle">
                {item.name}
              </SvgText>
            )}
          </Fragment>
        );
      })}
    </Svg>
  );
}

export default memo(RoomPlan);
