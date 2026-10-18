from app.merge import iou, merge_hazards


def spot(kind, label, *hits, photo=1):
    return {"kind": kind, "photo": photo, "detect": label, "target": "", "why": label, "detections": [{"box": b, "confidence": c} for b, c in hits]}


def test_iou():
    assert iou([0, 0, 1, 1], [0, 0, 1, 1]) == 1
    assert iou([0, 0, 0.5, 0.5], [0.5, 0.5, 1, 1]) == 0


def test_overlapping_same_kind_merges_and_keeps_both_labels():
    out = merge_hazards([
        spot("blocked_chi", "large blue bag", ([0.5, 0.5, 0.9, 0.9], 0.4)),
        spot("blocked_chi", "plastic bags", ([0.52, 0.5, 0.9, 0.88], 0.3)),
    ])
    assert len(out) == 1 and out[0]["confidence"] == 0.4 and out[0]["labels"] == ["large blue bag", "plastic bags"]


def test_box_inside_another_is_the_same_hazard():
    out = merge_hazards([spot("blocked_chi", "pile", ([0.1, 0.1, 0.7, 0.7], 0.5)), spot("blocked_chi", "box", ([0.2, 0.2, 0.4, 0.4], 0.3))])
    assert len(out) == 1


def test_kinds_and_photos_never_merge():
    box = [0.2, 0.2, 0.5, 0.5]
    out = merge_hazards([spot("blocked_chi", "a", (box, 0.5)), spot("poison_arrow", "b", (box, 0.5)), spot("blocked_chi", "c", (box, 0.5), photo=2)])
    assert len(out) == 3


def test_whole_photo_and_specks_are_dropped():
    out = merge_hazards([spot("blocked_chi", "room", ([0, 0, 1, 1], 0.9)), spot("blocked_chi", "dot", ([0.5, 0.5, 0.51, 0.51], 0.9))])
    assert out == []


def test_blocked_chi_boxes_that_touch_become_one_area_but_arrows_do_not():
    cluster = merge_hazards([
        spot("blocked_chi", "gray sneakers", ([0.30, 0.60, 0.38, 0.68], 0.5)),
        spot("blocked_chi", "pile of bags", ([0.36, 0.50, 0.60, 0.75], 0.3)),
        spot("blocked_chi", "paper bag", ([0.62, 0.55, 0.70, 0.72], 0.2)),  # a small gap away: still the same cluster
    ])
    assert len(cluster) == 1
    assert cluster[0]["box"] == [0.30, 0.50, 0.70, 0.75]
    assert cluster[0]["labels"][0] == "pile of bags"  # the label of the biggest box leads

    arrows = merge_hazards([
        spot("poison_arrow", "table", ([0.1, 0.1, 0.3, 0.3], 0.5)),
        spot("poison_arrow", "chair", ([0.33, 0.1, 0.5, 0.3], 0.4)),
    ])
    assert len(arrows) == 2


def test_distant_blocked_chi_stay_separate():
    out = merge_hazards([spot("blocked_chi", "a", ([0.0, 0.0, 0.2, 0.2], 0.5)), spot("blocked_chi", "b", ([0.6, 0.6, 0.8, 0.8], 0.5))])
    assert len(out) == 2


def test_a_single_item_keeps_its_own_label():
    assert merge_hazards([spot("blocked_chi", "wooden chair", ([0.1, 0.5, 0.3, 0.8], 0.5))])[0]["labels"] == ["wooden chair"]


def test_a_joined_area_stays_under_the_size_cap():
    # each pair touches, but joining all four would cover most of the photo
    boxes = [[0.0, 0.0, 0.5, 0.5], [0.5, 0.0, 1.0, 0.5], [0.0, 0.5, 0.5, 1.0], [0.5, 0.5, 1.0, 1.0]]
    out = merge_hazards([spot("blocked_chi", f"item{i}", (b, 0.5)) for i, b in enumerate(boxes)])
    assert len(out) > 1 and all((h["box"][2] - h["box"][0]) * (h["box"][3] - h["box"][1]) <= 0.45 + 1e-9 for h in out)


def test_ai_named_architecture_is_not_a_poison_arrow():
    from app.schemas import DangerSpot, _normalize_spots

    spots = [DangerSpot(kind="poison_arrow", photo=1, detect=d) for d in ["wooden door", "stone pillar", "glass coffee table"]]
    assert [s["detect"] for s in _normalize_spots(spots, 1)] == ["glass coffee table"]
