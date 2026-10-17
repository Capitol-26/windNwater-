// Blob.tsx — organic background shape exported from Figma
import Svg, { Path } from 'react-native-svg';
import { BlobShape } from '../../assets/blobs';

export default function Blob({ shape }: { shape: BlobShape }) {
  return (
    <Svg width={shape.width} height={shape.height} viewBox={`0 0 ${shape.width} ${shape.height}`}>
      <Path d={shape.d} fill={shape.fill} />
    </Svg>
  );
}
