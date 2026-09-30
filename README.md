# Julian-Donald-Von.github.io
Personal homepage of Dongle Feng — Jilin University Law School

## Layout

- `index.html`: homepage, entrance interactions and profile content.
- `cv.html`: curriculum vitae.
- `assets/`: active styles, scripts, self-hosted fonts and published images. Both pages select from `avatar_r1.webp` through `avatar_r59.webp`; `avatar_face.png` is their fallback.
- `counter/`: optional unique-IP STFU counter backend and [deployment instructions](counter/README.md).
- `tests/`: run `node --test tests/*.test.mjs` from the repository root.
- `docs/homepage-audit.md`: feature audit and validation notes.

GitHub Pages serves this repository directly. `.nojekyll` is intentional. Local dependencies, Worker configuration and secrets are excluded by `.gitignore`. Retired, unreferenced image exports have been removed; earlier versions remain recoverable from Git history.

