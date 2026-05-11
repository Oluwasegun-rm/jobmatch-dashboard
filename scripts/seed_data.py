"""
Seed helper for demo data.

Currently, sample job posts live in data/sample_jobs.csv, so no DB writes are
required here. This script is a placeholder showing where you could add logic to
populate a database or expand demo datasets in the future.
"""

from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "sample_jobs.csv"


def main() -> None:
    if not CSV_PATH.exists():
        CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
        with CSV_PATH.open("w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "title", "company", "description"])
            writer.writerow(
                [
                    1,
                    "Data Analyst",
                    "ExampleCorp",
                    "Seeking a Data Analyst with strong Python, SQL, and data visualization skills.",
                ]
            )
        print(f"Created {CSV_PATH}")
    else:
        print(f"Already present: {CSV_PATH}")


if __name__ == "__main__":
    main()
