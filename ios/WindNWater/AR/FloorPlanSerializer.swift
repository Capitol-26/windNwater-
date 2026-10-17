// FloorPlanSerializer.swift — converts a ScanDraft into a JSON dictionary for JS
import Foundation
import simd

struct FloorPlanSerializer {

  static func serialize(_ draft: ScanDraft, compassAligned: Bool) -> [String: Any] {
    let polygon = draft.corners
    let n = polygon.count

    let walls: [[String: Any]] = (0..<n).map { i in
      let a = polygon[i], b = polygon[(i + 1) % n]
      return ["id": "wall-\(i)", "a": point(a), "b": point(b), "length": Double(simd_distance(a, b))]
    }

    func openings(_ kind: ScanDraft.OpeningKind) -> [[String: Any]] {
      draft.openings.filter { $0.kind == kind }.map {
        [
          "id": $0.id.uuidString, "a": point($0.a), "b": point($0.b),
          "width": Double($0.width), "wall": $0.wall, "offset": Double($0.offset),
        ]
      }
    }

    let objects: [[String: Any]] = draft.furniture.map {
      [
        "id": $0.id.uuidString,
        "category": $0.category,
        "center": point($0.center),
        "corners": $0.corners.map { point($0) },
        "rotation": Double($0.rotation),
        "dimensions": ["width": Double($0.width), "depth": Double($0.depth)],
      ]
    }

    let allPoints = polygon + draft.furniture.flatMap { $0.corners }
    var bounds: Any = NSNull()
    if let b = FloorPlanGeometry.bounds(of: allPoints) {
      bounds = [
        "minX": Double(b.min.x), "minZ": Double(b.min.y),
        "maxX": Double(b.max.x), "maxZ": Double(b.max.y),
        "width": Double(b.max.x - b.min.x), "depth": Double(b.max.y - b.min.y),
      ]
    }

    return [
      "version": 2,
      "source": "arkit-guided",
      "units": "meters",
      "compassAligned": compassAligned,
      "floor": ["polygon": polygon.map { point($0) }, "area": Double(FloorPlanGeometry.area(polygon))],
      "bounds": bounds,
      "walls": walls,
      "doors": openings(.door),
      "windows": openings(.window),
      "objects": objects,
    ]
  }

  private static func point(_ p: Point) -> [String: Double] {
    ["x": Double(p.x), "z": Double(p.y)]
  }
}
