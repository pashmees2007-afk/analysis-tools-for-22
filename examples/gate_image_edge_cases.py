"""Quick image-byte test matrix for the hardened Mars-only gate.

Usage:
  python3 gate_image_edge_cases.py <curated-mars-image> <lunar-image>

The first argument represents the exact canonical Mars file held by the
backend. The second is any known lunar image. This script does not run the
terrain model; it tests the gate that decides whether the model may run.
"""

import sys
from pathlib import Path

from mars_only_gate import exact_source_match, mars_only_gate

MARS_SOURCE_URL = "https://science.nasa.gov/resource/raw-natural-and-white-balanced-views-of-martian-terrain/"


def report(label: str, expected: tuple[str, bool], decision) -> bool:
    passed = (decision.status, decision.run_mars_model) == expected
    icon = "✓" if passed else "✗"
    print(f"{icon} {label}: {decision.status}, model={'run' if decision.run_mars_model else 'skip'}")
    if not passed:
        print(f"  Expected {expected[0]}, model={'run' if expected[1] else 'skip'}")
    return passed


if len(sys.argv) != 3:
    raise SystemExit("Usage: python3 gate_image_edge_cases.py <curated-mars-image> <lunar-image>")

mars_bytes = Path(sys.argv[1]).read_bytes()
moon_bytes = Path(sys.argv[2]).read_bytes()
altered_mars_bytes = mars_bytes + b"\nnon-image trailing bytes for hash test"

results: list[bool] = []

# 1. The backend has the exact same approved Mars file as the caller.
results.append(report(
    "Verified curated Mars image",
    ("accepted", True),
    mars_only_gate("Mars", MARS_SOURCE_URL, exact_source_match(mars_bytes, mars_bytes)),
))

# 2. A Moon image is mislabeled as Mars and paired with a real Mars URL.
results.append(report(
    "Lunar image with forged Mars metadata",
    ("unknown", False),
    mars_only_gate("Mars", MARS_SOURCE_URL, exact_source_match(moon_bytes, mars_bytes)),
))

# 3. The right Mars image is changed after it leaves the approved source.
results.append(report(
    "Byte-altered Mars copy",
    ("unknown", False),
    mars_only_gate("Mars", MARS_SOURCE_URL, exact_source_match(altered_mars_bytes, mars_bytes)),
))

# 4. A Moon image is honestly labelled as Moon.
results.append(report(
    "Honest lunar declaration",
    ("blocked", False),
    mars_only_gate("Moon", None, False),
))

print(f"\nPassed {sum(results)}/{len(results)} image-byte gate checks.")
if not all(results):
    raise SystemExit(1)
