// FloorPlanGeometry.swift — 2D floor plan math on a top-down plane (x right/east, z down/south, meters)
import simd

typealias Point = SIMD2<Float>

struct FloorPlanGeometry {

  /// Drops the height from an ARKit world position.
  static func project(_ p: SIMD3<Float>) -> Point { Point(p.x, p.z) }

  // MARK: Polygons

  static func area(_ polygon: [Point]) -> Float {
    guard polygon.count >= 3 else { return 0 }
    var sum: Float = 0
    for i in 0..<polygon.count {
      let a = polygon[i], b = polygon[(i + 1) % polygon.count]
      sum += a.x * b.y - b.x * a.y
    }
    return abs(sum) / 2
  }

  /// True when no two non-adjacent edges cross each other.
  static func isSimple(_ polygon: [Point]) -> Bool {
    let n = polygon.count
    guard n >= 3 else { return false }
    for i in 0..<n {
      for j in (i + 1)..<n {
        if j == i + 1 || (i == 0 && j == n - 1) { continue }
        if segmentsIntersect(polygon[i], polygon[(i + 1) % n], polygon[j], polygon[(j + 1) % n]) {
          return false
        }
      }
    }
    return true
  }

  static func segmentsIntersect(_ p1: Point, _ p2: Point, _ p3: Point, _ p4: Point) -> Bool {
    let d1 = cross(p4 - p3, p1 - p3), d2 = cross(p4 - p3, p2 - p3)
    let d3 = cross(p2 - p1, p3 - p1), d4 = cross(p2 - p1, p4 - p1)
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  }

  private static func cross(_ a: Point, _ b: Point) -> Float { a.x * b.y - a.y * b.x }

  // MARK: Edges

  /// Parameter (0...1) of the closest point to `p` on segment a-b.
  static func projectT(_ p: Point, onto a: Point, _ b: Point) -> Float {
    let ab = b - a
    let denom = simd_dot(ab, ab)
    guard denom > 0 else { return 0 }
    return min(1, max(0, simd_dot(p - a, ab) / denom))
  }

  /// The polygon edge closest to `p`. Edge i runs from polygon[i] to polygon[i + 1].
  static func nearestEdge(of polygon: [Point], to p: Point) -> (index: Int, distance: Float)? {
    guard polygon.count >= 2 else { return nil }
    var best: (index: Int, distance: Float)?
    for i in 0..<polygon.count {
      let a = polygon[i], b = polygon[(i + 1) % polygon.count]
      let closest = a + (b - a) * projectT(p, onto: a, b)
      let d = simd_distance(p, closest)
      if best == nil || d < best!.distance { best = (i, d) }
    }
    return best
  }

  // MARK: Doors and windows

  /// Snaps two marked points onto the nearest wall. Returns nil if the opening is narrower than 0.3 m.
  static func snapOpening(a: Point, b: Point, polygon: [Point])
    -> (edge: Int, a: Point, b: Point, offset: Float, width: Float)? {
    guard let edge = nearestEdge(of: polygon, to: (a + b) / 2)?.index else { return nil }
    let wa = polygon[edge], wb = polygon[(edge + 1) % polygon.count]
    let t1 = min(projectT(a, onto: wa, wb), projectT(b, onto: wa, wb))
    let t2 = max(projectT(a, onto: wa, wb), projectT(b, onto: wa, wb))
    let pa = wa + (wb - wa) * t1
    let pb = wa + (wb - wa) * t2
    let width = simd_distance(pa, pb)
    guard width >= 0.3 else { return nil }
    return (edge, pa, pb, t1 * simd_distance(wa, wb), width)
  }

  // MARK: Furniture

  /// A rectangle from two opposite floor corners, aligned to the nearest wall.
  /// Returns nil if either side is shorter than 0.15 m.
  static func furnitureFootprint(p: Point, q: Point, polygon: [Point])
    -> (corners: [Point], center: Point, width: Float, depth: Float, rotation: Float)? {
    var u = Point(1, 0)
    if let edge = nearestEdge(of: polygon, to: (p + q) / 2)?.index {
      let d = polygon[(edge + 1) % polygon.count] - polygon[edge]
      if simd_length(d) > 0 { u = simd_normalize(d) }
    }
    let v = Point(-u.y, u.x)
    let diff = q - p
    let w = simd_dot(diff, u), h = simd_dot(diff, v)
    guard abs(w) >= 0.15, abs(h) >= 0.15 else { return nil }
    let corners = [p, p + u * w, p + u * w + v * h, p + v * h]
    return (corners, p + (u * w + v * h) / 2, abs(w), abs(h), atan2(u.y, u.x))
  }

  // MARK: Bounds

  static func bounds(of points: [Point]) -> (min: Point, max: Point)? {
    guard var lo = points.first else { return nil }
    var hi = lo
    for p in points {
      lo = simd_min(lo, p)
      hi = simd_max(hi, p)
    }
    return (lo, hi)
  }
}
