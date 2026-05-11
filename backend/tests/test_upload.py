from __future__ import annotations

import pytest
pytest.importorskip("fastapi", exc_type=ImportError)
from fastapi.testclient import TestClient  # type: ignore
from backend.app import app  # type: ignore


client = TestClient(app)


def test_upload_txt_extracts_text(tmp_path):
    p = tmp_path / "resume.txt"
    p.write_text("Experienced in Python and SQL.")
    with p.open("rb") as f:
        files = {"file": ("resume.txt", f, "text/plain")}
        resp = client.post("/upload-resume", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "Python" in data["text"]
