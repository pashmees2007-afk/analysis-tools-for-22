# Mars-Only Gate: Adversarial Dry Run

## Tricky Scenario

The stress test used a real lunar-surface image from NASA but sent the metadata `declared_target="Mars"` with a real trusted NASA Mars page URL. This is a realistic bypass attempt: the image is non-Mars, but the text fields look credible. [1]

## Finding

The first version of the gate had one weakness. It accepted any request that claimed “Mars” and supplied a URL from a trusted domain. It had no way to prove that the uploaded image bytes actually came from that URL. The Mars model then ran on the lunar image and forced it into Mars terrain classes, producing a 58.73% bedrock prediction despite the image being lunar.

The generic visual-complexity tool also returned highlighted crater regions. That output is technically valid as a measurement of local edges, texture, and contrast, but it is not Mars-specific and must be labelled as generic visual evidence.

## Mitigation Applied

The hardened gate now requires three conditions before the Mars-trained model may run:

| Requirement | Why it matters |
|---|---|
| Target declared as `Mars` | Avoids running the model for an explicitly non-Mars request. |
| Trusted source domain | Restricts the provenance workflow to team-approved sources. |
| Backend-verified exact byte match | Prevents a lunar image from being paired with an unrelated NASA Mars URL. |

`exact_source_match()` compares SHA-256 digests for the uploaded file and the canonical source image fetched or selected by the backend. If the bytes differ, the gate returns `unknown`, skips the Mars model, and permits only optional generic visual-complexity analysis.

## Verification After the Fix

The adversarial test now passes six checks: exact-byte matching, an honest Moon declaration, a forged Mars declaration without a source URL, a forged Mars declaration with an untrusted URL, a legitimate verified Mars request, and the forged lunar-image-plus-NASA-URL case. The last case now returns `unknown` and sets `run_mars_model=False`.

## Hackathon-Ready Operational Rule

For the demo, the simplest robust workflow is for the backend to analyze only a curated set of Mars image URLs or files that it fetches itself. Treat arbitrary uploads, transformed images, screenshots, and copies with unverified provenance as `unknown`: do not run the Mars-trained model on them.

## References

[1] [NASA Science, *The Moon’s Surface*](https://science.nasa.gov/resource/the-moons-surface/)
