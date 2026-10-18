from app.arrows import find_arrows


def hit(box, conf):
    return {"box": box, "confidence": conf}


def test_angular_object_near_a_landmark_is_a_poison_arrow():
    spots = find_arrows({"bed": [hit([0.4, 0.4, 0.8, 0.8], 0.6)], "table": [hit([0.1, 0.5, 0.3, 0.7], 0.2)]}, photo=2)
    assert len(spots) == 1 and spots[0]["kind"] == "poison_arrow" and spots[0]["photo"] == 2 and spots[0]["target"] == "bed"


def test_no_landmark_means_no_arrows():
    assert find_arrows({"table": [hit([0.1, 0.5, 0.3, 0.7], 0.9)]}, photo=1) == []


def test_far_away_or_the_same_object_does_not_count():
    far = find_arrows({"bed": [hit([0.7, 0.7, 0.95, 0.95], 0.6)], "desk": [hit([0.0, 0.0, 0.2, 0.2], 0.5)]}, photo=1)
    same = find_arrows({"bed": [hit([0.4, 0.4, 0.8, 0.8], 0.6)], "table": [hit([0.41, 0.4, 0.8, 0.79], 0.5)]}, photo=1)
    assert far == [] and same == []


def test_weak_landmarks_and_weak_angular_hits_are_ignored():
    assert find_arrows({"bed": [hit([0.4, 0.4, 0.8, 0.8], 0.1)], "table": [hit([0.1, 0.5, 0.3, 0.7], 0.9)]}, photo=1) == []
    assert find_arrows({"bed": [hit([0.4, 0.4, 0.8, 0.8], 0.6)], "table": [hit([0.1, 0.5, 0.3, 0.7], 0.05)]}, photo=1) == []


def test_an_angular_object_that_is_really_a_door_is_not_an_arrow():
    found = {"bed": [hit([0.4, 0.4, 0.8, 0.8], 0.6)], "cabinet": [hit([0.1, 0.2, 0.3, 0.8], 0.4)], "closet door": [hit([0.1, 0.2, 0.3, 0.8], 0.5)]}
    assert find_arrows(found, photo=1) == []


def test_a_door_elsewhere_does_not_cancel_a_real_arrow():
    found = {"bed": [hit([0.4, 0.4, 0.8, 0.8], 0.6)], "desk": [hit([0.1, 0.5, 0.3, 0.7], 0.5)], "door": [hit([0.85, 0.1, 1.0, 0.6], 0.5)]}
    assert [s["detect"] for s in find_arrows(found, photo=1)] == ["desk"]
