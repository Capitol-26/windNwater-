// ScanDraft.swift — the room being marked up by the user: floor height, corners, doors, windows, furniture
import Foundation
import simd

struct ScanDraft {

  enum OpeningKind: String {
    case door
    case window
  }

  struct Opening {
    let id = UUID()
    let kind: OpeningKind
    let a: Point
    let b: Point
    let wall: Int
    let offset: Float
    let width: Float
  }

  struct Furniture {
    let id = UUID()
    let category: String
    let center: Point
    let corners: [Point]
    let rotation: Float
    let width: Float
    let depth: Float
  }

  var floorY: Float?
  var corners: [Point] = []
  var openings: [Opening] = []
  var furniture: [Furniture] = []

  /// Corners define the walls that doors, windows and furniture are snapped to, so they lock once those exist.
  var cornersLocked: Bool { !openings.isEmpty || !furniture.isEmpty }

  /// Why the scan can't be finished yet, or nil if it's ready.
  var validationIssue: String? {
    if floorY == nil { return "Set the floor first." }
    if corners.count < 3 { return "Mark at least 3 corners of the room." }
    if !FloorPlanGeometry.isSimple(corners) {
      return "The walls cross each other. Undo and mark the corners in order around the room."
    }
    if FloorPlanGeometry.area(corners) < 1 { return "The room looks too small. Check the corners you marked." }
    return nil
  }

  var counts: [String: Any] {
    [
      "corners": corners.count,
      "doors": openings.filter { $0.kind == .door }.count,
      "windows": openings.filter { $0.kind == .window }.count,
      "objects": furniture.count,
    ]
  }
}
