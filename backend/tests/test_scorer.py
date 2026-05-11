from __future__ import annotations

from jobmatch.scorer import evaluate, match_score


def test_match_score_basic_overlap():
    job = {"Python", "SQL", "Pandas"}
    resume = {"Python", "Pandas"}
    score = match_score(job, resume)
    assert score == 67  # 2/3 -> 66.6 -> round -> 67


def test_evaluate_sets_and_score():
    job = {"Python", "SQL", "Pandas"}
    resume = {"Python", "Pandas"}
    res = evaluate(job, resume)
    assert res.score == 67
    assert res.matched_skills == {"Python", "Pandas"}
    assert res.missing_skills == {"SQL"}
