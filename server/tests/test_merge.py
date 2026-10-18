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
