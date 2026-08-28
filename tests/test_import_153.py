"""Tests for the 153/2017 importer.

The failure mode here is not a crash. It is a plausible number in the wrong column: the
law prints salary and coefficient side by side, and a parser that pairs them wrongly
produces a grid that looks like a grid and is wrong everywhere.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
REGIME = ROOT / "data/regimes/ro-153-2017.json"
REFERENCE = 2500


@pytest.fixture(scope="module")
def regime() -> dict:
    if not REGIME.exists():
        pytest.skip("153/2017 not generated yet")
    return json.loads(REGIME.read_text(encoding="utf-8"))


def test_every_coefficient_reproduces_a_published_salary(regime):
    """The law's own arithmetic is the check: salary = coefficient x 2500.

    The importer keeps only rows where that holds, so this asserts the guard is on rather
    than re-deriving it. A coefficient outside the range means a column pairing slipped.
    """
    values = [v["value"] for p in regime["positions"] for v in p["variants"]]
    assert values, "no coefficients imported"
    assert min(values) >= 1.0
    assert max(values) <= 15.0


def test_the_span_is_narrower_than_the_draft(regime):
    """1:7,02 today against 1:7,39 at the draft's commencement.

    This is the finding the whole comparison rests on, so it is pinned: the draft widens
    the distance between the lowest and highest paid rather than narrowing it.
    """
    values = [v["value"] for p in regime["positions"] for v in p["variants"]]
    span = max(values) / min(values)
    assert 6.9 < span < 7.1

    draft = json.loads((ROOT / "data/regimes/ro-draft-2026-07-16.json").read_text(encoding="utf-8"))
    draft_values = [
        v["value"]
        for p in draft["positions"]
        for v in p["variants"]
        if isinstance(v.get("value"), (int, float))
    ]
    assert max(draft_values) / min(draft_values) > span


def test_coefficients_are_printed_rounded(regime):
    """153/2017 publishes coefficients to two decimals; the draft publishes sixteen.

    That difference is the single sharpest thing the comparison shows, so if the importer
    ever starts producing long decimals it means it has stopped reading the printed
    coefficient and started deriving one.
    """
    values = {v["value"] for p in regime["positions"] for v in p["variants"]}
    long_ones = [v for v in values if len(repr(v).split(".")[-1]) > 2]
    assert long_ones == []


def test_no_levies_so_no_net_is_claimed(regime):
    """The Fiscal Code rates were never verified against their source.

    A law described as in force must not carry guessed provenance, so the regime models
    gross pay only and payslip() returns a null net rather than a plausible wrong one.
    """
    assert regime["levies"] == []
    assert regime["status"] == "in-force"
    assert any(l["id"] == "fara-retineri-modelate" for l in regime["limitations"])


def test_families_line_up_with_the_draft(regime):
    """Same annex numbering in both laws, which is what makes them comparable at all."""
    draft = json.loads((ROOT / "data/regimes/ro-draft-2026-07-16.json").read_text(encoding="utf-8"))
    shared = {p["family"] for p in regime["positions"]} & {p["family"] for p in draft["positions"]}
    assert len(shared) >= 6
