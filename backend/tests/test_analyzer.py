from __future__ import annotations

from jobmatch.analyzer import analyze


def test_analyze_extracts_and_scores():
    resume = "Skilled in Python, Pandas, and SQL. Built dashboards using Streamlit."
    job = (
        "Looking for a data analyst with skills in Python, SQL, and data visualization "
        "with Matplotlib or Seaborn."
    )

    result = analyze(resume, job)

    assert result.score > 0
    assert "Python" in result.matched_skills
    assert "SQL" in result.matched_skills
    # Resume does not mention Matplotlib; should be missing if required by job
    assert "Matplotlib" in result.missing_skills or "Seaborn" in result.missing_skills
    assert isinstance(result.suggestions, list) and len(result.suggestions) >= 1
