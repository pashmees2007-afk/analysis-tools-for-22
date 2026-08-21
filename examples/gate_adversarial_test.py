"""Adversarial dry-run for the Mars-only gate.

Tests five gate scenarios and the exact-byte source check used for provenance.
Each test prints the gate decision and flags whether the gate held or failed.
"""

import sys
from mars_only_gate import GateDecision, exact_source_match, mars_only_gate


def check(label: str, decision: GateDecision, expected_status: str, expected_model: bool) -> bool:
    status_ok = decision.status == expected_status
    model_ok = decision.run_mars_model == expected_model
    passed = status_ok and model_ok
    icon = "✓" if passed else "✗"
    print(f"{icon}  {label}")
    print(f"   status={decision.status!r}  run_mars_model={decision.run_mars_model}  run_visual_complexity={decision.run_visual_complexity}")
    print(f"   reason: {decision.reason}")
    if not passed:
        print(f"   EXPECTED status={expected_status!r}  run_mars_model={expected_model}")
    print()
    return passed


results: list[bool] = []

# ── Source-byte verification ──────────────────────────────────────────────────
# Equal files may be authorized; any changed or unrelated upload must not match.
byte_check = exact_source_match(b"approved Mars source", b"approved Mars source") and not exact_source_match(
    b"lunar upload", b"approved Mars source"
)
print(f"{'✓' if byte_check else '✗'}  Exact-byte source verification")
print()
results.append(byte_check)

# ── Scenario 1: Obvious Moon declaration ─────────────────────────────────────
# A user honestly declares "Moon". The gate must block the Mars model.
results.append(check(
    "Scenario 1 – Honest Moon declaration",
    mars_only_gate(declared_target="Moon"),
    expected_status="blocked",
    expected_model=False,
))

# ── Scenario 2: Forged Mars declaration, no source URL ───────────────────────
# A user uploads a Moon image but types "Mars" in the target field.
# No source URL is provided. The gate cannot verify the claim.
results.append(check(
    "Scenario 2 – Forged Mars declaration, no source URL",
    mars_only_gate(declared_target="Mars", source_url=None),
    expected_status="unknown",
    expected_model=False,
))

# ── Scenario 3: Forged Mars declaration with a non-NASA source URL ────────────
# A user uploads a Moon image, types "Mars", and supplies a plausible-looking
# but untrusted URL (e.g., a personal website or a non-NASA domain).
results.append(check(
    "Scenario 3 – Forged Mars declaration with untrusted source URL",
    mars_only_gate(
        declared_target="Mars",
        source_url="https://moonimages.example.com/lunar-surface.jpg",
    ),
    expected_status="unknown",
    expected_model=False,
))

# ── Scenario 4: Legitimate Mars image with trusted NASA source ────────────────
# This is the correct, expected happy path.
results.append(check(
    "Scenario 4 – Legitimate Mars image with trusted NASA source",
    mars_only_gate(
        declared_target="Mars",
        source_url="https://science.nasa.gov/resource/raw-natural-and-white-balanced-views-of-martian-terrain/",
        source_verified=True,
    ),
    expected_status="accepted",
    expected_model=True,
))

# ── Scenario 5: The tricky bypass ─────────────────────────────────────────────
# A user uploads a Moon image, falsely types "Mars", and pastes a real NASA Mars
# URL. The hardened gate requires backend verification of the actual uploaded
# bytes, so a trusted-looking URL by itself does not authorize the model.
results.append(check(
    "Scenario 5 – Moon image plus forged trusted Mars source URL",
    mars_only_gate(
        declared_target="Mars",
        source_url="https://science.nasa.gov/resource/raw-natural-and-white-balanced-views-of-martian-terrain/",
    ),
    expected_status="unknown",
    expected_model=False,
))

# ── Summary ───────────────────────────────────────────────────────────────────
passed = sum(results)
total = len(results)
print(f"Results: {passed}/{total} scenarios passed.")
if passed < total:
    sys.exit(1)
