# apprentice walking review

**Overall atlas: rejected.** The assembled sprite-apprentice-walk-8f-candidate.png and JSON are review artifacts only.

| Direction | State | Review |
|---|---|---|
| Down | Candidate, visual review only | Broadly consistent in the contact preview; not integration-approved while the full atlas is rejected. |
| Up | Candidate, visual review only | Broadly consistent in the contact preview; not integration-approved while the full atlas is rejected. |
| Left | Rejected | v1 and v2 frame 1/5 do not clearly exchange the leading leg; the opposite arm phase and frame 4→5 launch are not legible enough. |
| Right | Rejected | v1 and v2 frame 1/5 do not clearly exchange the leading leg; the opposite arm phase and frame 4→5 launch are not legible enough. |

The left and right strips are separate source generations and face the intended screen directions. However, both versions still read too much like foot shuffling: frame 1 and frame 5 need opposite maximum stride poses, with the new leading leg and opposite arm clearly changing together after the weight transfer. The stricter third attempt was interrupted by the built-in ImageGen usage limit; no partial strip was promoted into this character folder.

Review files: sources/walk-*-8f.png, sources/walk-*-8f-v2.png, side-left-phase-1-vs-5.png, side-right-phase-1-vs-5.png, and their -v2 comparisons. The generated v1/v2 strips are retained for auditing; redo both side rows before integration.
