// GuidedScanViewController.swift — ARKit camera view where the user marks corners, doors, windows and furniture
import UIKit
import ARKit
import SceneKit
import CoreLocation

private extension UIColor {
  convenience init(hex: UInt32, alpha: CGFloat = 1) {
    self.init(
      red: CGFloat((hex >> 16) & 0xFF) / 255,
      green: CGFloat((hex >> 8) & 0xFF) / 255,
      blue: CGFloat(hex & 0xFF) / 255,
      alpha: alpha)
  }
  static let espresso = UIColor(hex: 0x2A1F18)
  static let cream = UIColor(hex: 0xF4EDE0)
  static let clay = UIColor(hex: 0xB8603E)
  static let moss = UIColor(hex: 0x5F6B45)
  static let sage = UIColor(hex: 0xA3AB86)
  static let sandDeep = UIColor(hex: 0xD4C2A3)
}

final class GuidedScanViewController: UIViewController, ARSessionDelegate {

  enum Outcome {
    case finished([String: Any])
    case cancelled
    case failed(Error)
  }

  private enum Mode: Int { case corners = 0, door, window, furniture }
  private enum EntryKind { case corner, pending, opening, furniture }
  private struct Entry {
    let kind: EntryKind
    let nodes: [SCNNode]
  }

  private static let furnitureCategories = [
    "bed", "sofa", "chair", "desk", "table", "wardrobe", "dresser", "bookshelf", "tv stand", "plant", "other",
  ]

  var onFinish: ((Outcome) -> Void)?
  var onProgress: (([String: Any]) -> Void)?

  private let sceneView = ARSCNView()
  private let reticle = UIView()
  private let reticleDot = UIView()
  private let statusLabel = UILabel()
  private let instructionLabel = UILabel()
  private let countLabel = UILabel()
  private let modeControl = UISegmentedControl(items: ["Corners", "Door", "Window", "Furniture"])
  private let markButton = UIButton(type: .custom)
  private let undoButton = UIButton(type: .system)

  private var draft = ScanDraft()
  private var floorPlane: simd_float4x4?
  private var compassAligned = false
  private var mode: Mode = .corners
  private var pending: Point?
  private var history: [Entry] = []
  private var timer: Timer?
  private var hasReported = false

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
  init() {
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
  }

  // MARK: Lifecycle

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .espresso
    sceneView.frame = view.bounds
    sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    sceneView.session.delegate = self
    sceneView.automaticallyUpdatesLighting = true
    view.addSubview(sceneView)
    buildHUD()
    refreshUI()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    startSession(useCompass: ARSupportChecker.isCompassAvailable)
    timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.tick() }
    UIApplication.shared.isIdleTimerDisabled = true
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    timer?.invalidate()
    sceneView.session.pause()
    UIApplication.shared.isIdleTimerDisabled = false
  }

  // MARK: Session

  /// Camera + gyroscope/accelerometer motion tracking. With the compass, +x is east and +z is south (north is up).
  private func startSession(useCompass: Bool) {
    let config = ARWorldTrackingConfiguration()
    config.planeDetection = [.horizontal]
    if useCompass {
      config.worldAlignment = .gravityAndHeading
      compassAligned = true
    } else {
      config.worldAlignment = .gravity
      compassAligned = false
    }
    sceneView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
  }

  func session(_ session: ARSession, didFailWithError error: Error) {
    // If the compass can't start, retry without it as long as nothing has been marked yet.
    if compassAligned && floorPlane == nil && draft.corners.isEmpty {
      startSession(useCompass: false)
    } else {
      report(.failed(error))
    }
  }

  // MARK: Aiming

  private func xyz(_ v: SIMD4<Float>) -> SIMD3<Float> { SIMD3(v.x, v.y, v.z) }

  /// World position under the center of the screen. Before the floor is set this raycasts onto detected
  /// planes; afterwards it intersects the view ray with the known floor plane.
  private func aimPoint() -> SIMD3<Float>? {
    let center = CGPoint(x: sceneView.bounds.midX, y: sceneView.bounds.midY)
    if let plane = floorPlane {
      guard let hit = sceneView.unprojectPoint(center, ontoPlane: plane),
        let camera = sceneView.session.currentFrame?.camera
      else { return nil }
      let origin = xyz(camera.transform.columns.3)
      let forward = -xyz(camera.transform.columns.2)
      let toHit = hit - origin
      guard simd_dot(toHit, forward) > 0, simd_length(toHit) < 12 else { return nil }
      return hit
    }
    for target in [ARRaycastQuery.Target.existingPlaneGeometry, .estimatedPlane] {
      if let query = sceneView.raycastQuery(from: center, allowing: target, alignment: .horizontal),
        let result = sceneView.session.raycast(query).first
      {
        return xyz(result.worldTransform.columns.3)
      }
    }
    return nil
  }

  private func tick() {
    let hasHit = aimPoint() != nil
    reticle.layer.borderColor = (hasHit ? UIColor.sage : UIColor.cream).cgColor
    reticleDot.backgroundColor = hasHit ? .sage : .clay
    statusLabel.text = trackingText()
  }

  private func trackingText() -> String {
    switch sceneView.session.currentFrame?.camera.trackingState {
    case .some(.normal):
      return compassAligned ? "Tracking good · compass on" : "Tracking good · compass off"
    case .some(.limited(.excessiveMotion)): return "Move more slowly"
    case .some(.limited(.insufficientFeatures)): return "Not enough detail. Add light or aim at a textured area."
    case .some(.limited(.initializing)): return "Starting up. Move the phone gently."
    case .some(.limited(.relocalizing)): return "Recovering. Go back to where you were."
    case .some(.limited): return "Tracking limited"
    default: return "Waiting for the camera"
    }
  }

  // MARK: Marking

  @objc private func markTapped() {
    guard let hit = aimPoint() else {
      UINotificationFeedbackGenerator().notificationOccurred(.warning)
      return
    }
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()

    if floorPlane == nil {
      var plane = matrix_identity_float4x4
      plane.columns.3 = SIMD4(0, hit.y, 0, 1)
      floorPlane = plane
      draft.floorY = hit.y
      refreshUI()
      return
    }

    let p = FloorPlanGeometry.project(hit)
    switch mode {
    case .corners: addCorner(p)
    case .door: addOpeningPoint(p, kind: .door)
    case .window: addOpeningPoint(p, kind: .window)
    case .furniture: addFurniturePoint(p)
    }
    refreshUI()
  }

  private func addCorner(_ p: Point) {
    guard !draft.cornersLocked else {
      warn("Undo the doors, windows and furniture first if you want to change the corners.")
      return
    }
    var nodes = [marker(at: p, color: .clay)]
    if let last = draft.corners.last { nodes.append(line(from: last, to: p, color: .clay)) }
    draft.corners.append(p)
    add(Entry(kind: .corner, nodes: nodes))
  }

  private func addOpeningPoint(_ p: Point, kind: ScanDraft.OpeningKind) {
    guard draft.corners.count >= 3 else {
      warn("Mark the corners of the room first.")
      return
    }
    let color: UIColor = kind == .door ? .moss : .sage
    guard let first = pending else {
      pending = p
      add(Entry(kind: .pending, nodes: [marker(at: p, color: color)]))
      return
    }
    guard let snapped = FloorPlanGeometry.snapOpening(a: first, b: p, polygon: draft.corners) else {
      warn("That opening is too narrow. Mark both edges of the \(kind.rawValue).")
      return
    }
    removeLastEntry()  // the temporary first-point marker, re-drawn below on the wall
    pending = nil
    let nodes = [
      marker(at: snapped.a, color: color), marker(at: snapped.b, color: color),
      line(from: snapped.a, to: snapped.b, color: color),
    ]
    draft.openings.append(
      ScanDraft.Opening(kind: kind, a: snapped.a, b: snapped.b, wall: snapped.edge, offset: snapped.offset, width: snapped.width))
    add(Entry(kind: .opening, nodes: nodes))
  }

  private func addFurniturePoint(_ p: Point) {
    guard draft.corners.count >= 3 else {
      warn("Mark the corners of the room first.")
      return
    }
    guard let first = pending else {
      pending = p
      add(Entry(kind: .pending, nodes: [marker(at: p, color: .cream)]))
      return
    }
    guard let box = FloorPlanGeometry.furnitureFootprint(p: first, q: p, polygon: draft.corners) else {
      warn("That's too small. Mark two opposite bottom corners of the furniture.")
      return
    }
    removeLastEntry()
    pending = nil
    var nodes = box.corners.map { marker(at: $0, color: .cream) }
    for i in 0..<4 { nodes.append(line(from: box.corners[i], to: box.corners[(i + 1) % 4], color: .cream)) }
    add(Entry(kind: .furniture, nodes: nodes))
    chooseCategory { [weak self] category in
      guard let self = self else { return }
      if let category = category {
        self.draft.furniture.append(
          ScanDraft.Furniture(
            category: category, center: box.center, corners: box.corners,
            rotation: box.rotation, width: box.width, depth: box.depth))
      } else {
        self.removeLastEntry()  // cancelled: drop the drawn footprint
      }
      self.refreshUI()
    }
  }

  private func chooseCategory(_ completion: @escaping (String?) -> Void) {
    let sheet = UIAlertController(title: "What is it?", message: nil, preferredStyle: .actionSheet)
    for name in Self.furnitureCategories {
      sheet.addAction(UIAlertAction(title: name.capitalized, style: .default) { _ in completion(name) })
    }
    sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completion(nil) })
    sheet.popoverPresentationController?.sourceView = markButton
    present(sheet, animated: true)
  }

  @objc private func undoTapped() {
    guard let entry = history.last else { return }
    switch entry.kind {
    case .corner: draft.corners.removeLast()
    case .pending: pending = nil
    case .opening: draft.openings.removeLast()
    case .furniture: draft.furniture.removeLast()
    }
    removeLastEntry()
    refreshUI()
  }

  @objc private func modeChanged() {
    let newMode = Mode(rawValue: modeControl.selectedSegmentIndex) ?? .corners
    if newMode != .corners && draft.corners.count < 3 {
      modeControl.selectedSegmentIndex = mode.rawValue
      warn("Mark at least 3 corners of the room first.")
      return
    }
    if pending != nil, history.last?.kind == .pending {
      pending = nil
      removeLastEntry()
    }
    mode = newMode
    refreshUI()
  }

  // MARK: Scene helpers

  private func world(_ p: Point) -> SIMD3<Float> { SIMD3(p.x, draft.floorY ?? 0, p.y) }

  private func marker(at p: Point, color: UIColor) -> SCNNode {
    let sphere = SCNSphere(radius: 0.035)
    sphere.firstMaterial?.diffuse.contents = color
    sphere.firstMaterial?.lightingModel = .constant
    let node = SCNNode(geometry: sphere)
    node.simdPosition = world(p) + SIMD3(0, 0.035, 0)
    return node
  }

  private func line(from a: Point, to b: Point, color: UIColor) -> SCNNode {
    let start = world(a) + SIMD3(0, 0.01, 0), end = world(b) + SIMD3(0, 0.01, 0)
    let delta = end - start
    let length = simd_length(delta)
    let cylinder = SCNCylinder(radius: 0.012, height: CGFloat(max(length, 0.001)))
    cylinder.firstMaterial?.diffuse.contents = color
    cylinder.firstMaterial?.lightingModel = .constant
    let node = SCNNode(geometry: cylinder)
    node.simdPosition = (start + end) / 2
    if length > 0 { node.simdOrientation = simd_quatf(from: SIMD3(0, 1, 0), to: delta / length) }
    return node
  }

  private func add(_ entry: Entry) {
    entry.nodes.forEach { sceneView.scene.rootNode.addChildNode($0) }
    history.append(entry)
  }

  private func removeLastEntry() {
    history.popLast()?.nodes.forEach { $0.removeFromParentNode() }
  }

  // MARK: Finishing

  /// Validates and finishes the scan, as if the user tapped Done.
  func finishScan() {
    if let issue = draft.validationIssue {
      warn(issue)
      return
    }
    report(.finished(FloorPlanSerializer.serialize(draft, compassAligned: compassAligned)))
  }

  func cancelScan() { report(.cancelled) }

  @objc private func doneTapped() { finishScan() }
  @objc private func cancelTapped() { cancelScan() }

  private func report(_ outcome: Outcome) {
    guard !hasReported else { return }
    hasReported = true
    dismiss(animated: true) { [weak self] in self?.onFinish?(outcome) }
  }

  private func warn(_ message: String) {
    UINotificationFeedbackGenerator().notificationOccurred(.warning)
    let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default))
    present(alert, animated: true)
  }

  // MARK: HUD

  private func refreshUI() {
    modeControl.isHidden = floorPlane == nil
    undoButton.isEnabled = !history.isEmpty
    markButton.setTitle(floorPlane == nil ? "Set floor" : "Mark", for: .normal)

    if floorPlane == nil {
      instructionLabel.text = "Aim at the open floor about 1 to 2 m away, then tap Set floor."
    } else {
      switch mode {
      case .corners:
        instructionLabel.text = "Aim at where a wall meets the floor and tap Mark. Go around the room in order."
      case .door:
        instructionLabel.text = pending == nil
          ? "Aim at the floor at one side of the door and tap Mark."
          : "Now aim at the floor at the other side of the door."
      case .window:
        instructionLabel.text = pending == nil
          ? "Aim at the floor below one edge of the window and tap Mark."
          : "Now aim at the floor below the other edge."
      case .furniture:
        instructionLabel.text = pending == nil
          ? "Aim at one bottom corner of the furniture and tap Mark."
          : "Now aim at the opposite bottom corner."
      }
    }

    let c = draft.counts
    countLabel.text = floorPlane == nil
      ? "Floor not set"
      : "\(c["corners"]!) corners · \(c["doors"]!) doors · \(c["windows"]!) windows · \(c["objects"]!) furniture"
    onProgress?(c)
  }

  private func buildHUD() {
    // Reticle
    reticle.translatesAutoresizingMaskIntoConstraints = false
    reticle.layer.cornerRadius = 22
    reticle.layer.borderWidth = 2
    reticle.layer.borderColor = UIColor.cream.cgColor
    reticle.isUserInteractionEnabled = false
    reticleDot.translatesAutoresizingMaskIntoConstraints = false
    reticleDot.layer.cornerRadius = 4
    reticleDot.backgroundColor = .clay
    reticle.addSubview(reticleDot)
    view.addSubview(reticle)

    // Top buttons
    let cancel = pillButton(title: "Cancel", action: #selector(cancelTapped))
    let done = pillButton(title: "Done", action: #selector(doneTapped))

    // Mode control
    modeControl.translatesAutoresizingMaskIntoConstraints = false
    modeControl.selectedSegmentIndex = 0
    modeControl.selectedSegmentTintColor = .clay
    modeControl.backgroundColor = UIColor.espresso.withAlphaComponent(0.7)
    modeControl.setTitleTextAttributes([.foregroundColor: UIColor.cream], for: .normal)
    modeControl.setTitleTextAttributes([.foregroundColor: UIColor.cream], for: .selected)
    modeControl.addTarget(self, action: #selector(modeChanged), for: .valueChanged)
    view.addSubview(modeControl)

    // Info card
    statusLabel.font = .systemFont(ofSize: 13, weight: .semibold)
    statusLabel.textColor = .sage
    instructionLabel.font = .systemFont(ofSize: 17)
    instructionLabel.textColor = .cream
    instructionLabel.numberOfLines = 0
    countLabel.font = .systemFont(ofSize: 13)
    countLabel.textColor = .sandDeep
    let card = UIStackView(arrangedSubviews: [statusLabel, instructionLabel, countLabel])
    card.translatesAutoresizingMaskIntoConstraints = false
    card.axis = .vertical
    card.spacing = 6
    card.isLayoutMarginsRelativeArrangement = true
    card.layoutMargins = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
    card.backgroundColor = UIColor.espresso.withAlphaComponent(0.78)
    card.layer.cornerRadius = 20
    card.clipsToBounds = true
    view.addSubview(card)

    // Mark + undo
    markButton.translatesAutoresizingMaskIntoConstraints = false
    markButton.backgroundColor = .clay
    markButton.layer.cornerRadius = 40
    markButton.layer.borderWidth = 3
    markButton.layer.borderColor = UIColor.cream.cgColor
    markButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
    markButton.setTitleColor(.cream, for: .normal)
    markButton.addTarget(self, action: #selector(markTapped), for: .touchUpInside)
    view.addSubview(markButton)

    undoButton.translatesAutoresizingMaskIntoConstraints = false
    undoButton.setTitle("Undo", for: .normal)
    undoButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    undoButton.tintColor = .cream
    undoButton.addTarget(self, action: #selector(undoTapped), for: .touchUpInside)
    view.addSubview(undoButton)

    let safe = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      reticle.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      reticle.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      reticle.widthAnchor.constraint(equalToConstant: 44),
      reticle.heightAnchor.constraint(equalToConstant: 44),
      reticleDot.centerXAnchor.constraint(equalTo: reticle.centerXAnchor),
      reticleDot.centerYAnchor.constraint(equalTo: reticle.centerYAnchor),
      reticleDot.widthAnchor.constraint(equalToConstant: 8),
      reticleDot.heightAnchor.constraint(equalToConstant: 8),

      cancel.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 16),
      cancel.topAnchor.constraint(equalTo: safe.topAnchor, constant: 8),
      done.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -16),
      done.topAnchor.constraint(equalTo: safe.topAnchor, constant: 8),

      modeControl.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 16),
      modeControl.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -16),
      modeControl.topAnchor.constraint(equalTo: cancel.bottomAnchor, constant: 12),

      markButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      markButton.bottomAnchor.constraint(equalTo: safe.bottomAnchor, constant: -16),
      markButton.widthAnchor.constraint(equalToConstant: 80),
      markButton.heightAnchor.constraint(equalToConstant: 80),

      undoButton.centerYAnchor.constraint(equalTo: markButton.centerYAnchor),
      undoButton.trailingAnchor.constraint(equalTo: markButton.leadingAnchor, constant: -28),

      card.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 16),
      card.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -16),
      card.bottomAnchor.constraint(equalTo: markButton.topAnchor, constant: -16),
    ])
  }

  private func pillButton(title: String, action: Selector) -> UIButton {
    var config = UIButton.Configuration.filled()
    config.title = title
    config.baseBackgroundColor = UIColor.espresso.withAlphaComponent(0.7)
    config.baseForegroundColor = .cream
    config.cornerStyle = .capsule
    let button = UIButton(configuration: config)
    button.translatesAutoresizingMaskIntoConstraints = false
    button.addTarget(self, action: action, for: .touchUpInside)
    view.addSubview(button)
    return button
  }
}
