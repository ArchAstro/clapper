# Benchmarks

| Benchmark | Purpose | Entry point |
| --- | --- | --- |
| [Technical-video evals](technical-video/README.md) | Evaluate technical explanation quality, evidence, and authoring reliability across fixed briefs. | `clapper eval --help` |
| [Nimbus across frameworks](nimbus/README.md) | Compare the same five-scene film's visual authoring in Clapper, Rendiv, and HyperFrames. | Native preview/render commands in its README. |

Nimbus is a source-code and authoring comparison, not a controlled renderer-speed
benchmark or a claim of pixel-identical output. Its ports use separate npm lockfiles
and remain outside Clapper's pnpm workspace. Generated renders and installed
packages are ignored; shared source assets and verification scripts are included.
