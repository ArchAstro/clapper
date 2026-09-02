import type { AudioCue, CompositionMeta, TrackInfo } from "../registry";
import type { AudioEngine } from "./audio-engine";
import { cueCategory, cueLabel, cueName, noteName, timecode, volumeEnvelope, type Selection } from "./state";

/** Right panel, "inspect" tab: the selected track or cue, else the composition. */
export function Inspector({ meta, tracks, cues, selection, frame, engine, onSeek, onRange, onSelect }: { meta: CompositionMeta; tracks: TrackInfo[]; cues: AudioCue[]; selection: Selection; frame: number; engine: AudioEngine; onSeek: (f: number) => void; onRange: (r: [number, number] | null) => void; onSelect: (s: Selection) => void }) {
  const fps = meta.fps;
  const sec = (f: number) => `${(f / fps).toFixed(2)} s`;
  if (selection?.kind === "track") {
    const t = tracks.find((x) => x.id === selection.id);
    if (!t) return <p className="hint">That sequence is not mounted at this frame.</p>;
    return (
      <>
        <h2>sequence</h2>
        <dl className="kv">
          <dt>name</dt>
          <dd>{t.name}</dd>
          <dt>path</dt>
          <dd className="wrap">{t.path.join(" › ")}</dd>
          <dt>start</dt>
          <dd>
            f{t.startFrame} · {sec(t.startFrame)}
          </dd>
          <dt>end</dt>
          <dd>
            f{t.endFrame} · {sec(t.endFrame)}
          </dd>
          <dt>length</dt>
          <dd>
            {t.endFrame - t.startFrame} f · {sec(t.endFrame - t.startFrame)}
          </dd>
          <dt>local frame</dt>
          <dd>{frame - t.startFrame}</dd>
          <dt>depth</dt>
          <dd>{t.depth}</dd>
        </dl>
        <div className="row">
          <button className="btn sm" onClick={() => onSeek(t.startFrame)}>go to start</button>
          <button className="btn sm" onClick={() => onRange([t.startFrame, t.endFrame])}>loop this</button>
          <button className="btn sm" onClick={() => onSelect(null)}>clear</button>
        </div>
      </>
    );
  }
  if (selection?.kind === "cue") {
    const c = cues.find((x) => x.id === selection.id);
    if (!c) return <p className="hint">That cue is not registered at this frame.</p>;
    const env = volumeEnvelope(c);
    const dur = c.endFrame - c.startFrame;
    const t = c.tone;
    return (
      <>
        <h2>{c.kind === "file" ? "audio file" : c.kind === "bus" ? "bus (duck)" : `tone · ${t?.wave}`}</h2>
        <dl className="kv">
          <dt>name</dt>
          <dd>{cueName(c)}</dd>
          <dt>start</dt>
          <dd>
            f{c.startFrame} · {sec(c.startFrame)}
          </dd>
          <dt>end</dt>
          <dd>
            f{c.endFrame} · {sec(c.endFrame)}
          </dd>
          <dt>length</dt>
          <dd>
            {dur} f · {sec(dur)}
          </dd>
          <dt>volume</dt>
          <dd>{c.volume.toFixed(3)}</dd>
          {(c.fadeInFrames > 0 || c.fadeOutFrames > 0) && (
            <>
              <dt>fades</dt>
              <dd>
                in {c.fadeInFrames} f · out {c.fadeOutFrames} f
              </dd>
            </>
          )}
          {c.kind === "file" && (
            <>
              <dt>src</dt>
              <dd className="wrap">{c.src}</dd>
              {c.trimStart ? (
                <>
                  <dt>trim</dt>
                  <dd>{c.trimStart.toFixed(2)} s</dd>
                </>
              ) : null}
              {c.playbackRate && c.playbackRate !== 1 ? (
                <>
                  <dt>rate</dt>
                  <dd>×{c.playbackRate}</dd>
                </>
              ) : null}
            </>
          )}
          {t && (
            <>
              <dt>pitch</dt>
              <dd>
                {Math.round(t.freq)} Hz {noteName(t.freq) && `(${noteName(t.freq)})`}
                {t.freqEnd !== undefined && ` → ${Math.round(t.freqEnd)} Hz`}
              </dd>
              <dt>ADSR</dt>
              <dd>
                {t.attack} / {t.decay} / {t.sustain} / {t.release}
              </dd>
              {(t.pan || t.spread || t.reverb) && (
                <>
                  <dt>space</dt>
                  <dd>
                    pan {t.pan ?? 0} · spread {t.spread ?? 0} · reverb {t.reverb ?? 0}
                  </dd>
                </>
              )}
              {(t.cutoff || t.lfo || t.partials || t.ring || t.brightness) && (
                <>
                  <dt>colour</dt>
                  <dd className="wrap">
                    {t.cutoff ? `cutoff ${t.cutoff} Hz · ` : ""}
                    {t.lfo ? `lfo ${t.lfo.rate} Hz ×${t.lfo.depth} · ` : ""}
                    {t.ring ? `ring ${t.ring} · ` : ""}
                    {t.brightness ? `bright ${t.brightness} · ` : ""}
                    {t.partials ? `${t.partials.length} partials` : ""}
                  </dd>
                </>
              )}
            </>
          )}
        </dl>
        <Chart title="gain" pts={env} dur={dur} />
        {t?.automation?.cutoff && <Chart title="cutoff (Hz)" pts={t.automation.cutoff} dur={dur} />}
        <div className="row">
          <button className="btn sm" onClick={() => engine.previewCue(c, fps)}>▶ preview</button>
          <button className="btn sm" onClick={() => onSeek(c.startFrame)}>go to start</button>
          <button className="btn sm" onClick={() => onRange([c.startFrame, c.endFrame])}>loop this</button>
          <button className="btn sm" onClick={() => onSelect(null)}>clear</button>
        </div>
        <details>
          <summary className="hint">spec JSON</summary>
          <pre style={{ fontSize: 10.5, whiteSpace: "pre-wrap", userSelect: "text" }}>{JSON.stringify({ ...c, tone: t }, null, 1)}</pre>
        </details>
      </>
    );
  }
  const byCat = new Map<string, number>();
  for (const c of cues) byCat.set(cueCategory(c), (byCat.get(cueCategory(c)) ?? 0) + 1);
  return (
    <>
      <h2>composition</h2>
      <dl className="kv">
        <dt>id</dt>
        <dd>{meta.id}</dd>
        <dt>size</dt>
        <dd>
          {meta.width} × {meta.height}
        </dd>
        <dt>fps</dt>
        <dd>{meta.fps}</dd>
        <dt>length</dt>
        <dd>
          {meta.durationInFrames} f · {timecode(meta.durationInFrames, fps)}
        </dd>
        <dt>scenes</dt>
        <dd>{meta.scenes?.length ?? 0}</dd>
        <dt>sequences</dt>
        <dd>{tracks.length} mounted so far</dd>
        <dt>cues</dt>
        <dd className="wrap">{[...byCat.entries()].map(([k, n]) => `${k} ${n}`).join(" · ") || "none registered yet"}</dd>
      </dl>
      <p className="hint">Click a block in the timeline to inspect it. Double-click a block to loop it. Scrub the film once so every sequence and cue registers.</p>
    </>
  );
}

function Chart({ title, pts, dur }: { title: string; pts: [number, number][]; dur: number }) {
  const max = Math.max(1e-6, ...pts.map(([, v]) => v));
  const d = pts.map(([f, v], i) => `${i ? "L" : "M"}${((f / Math.max(1, dur)) * 100).toFixed(1)} ${(100 - (v / max) * 88).toFixed(1)}`).join(" ");
  return (
    <div>
      <div className="hint" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{title}</span>
        <span>max {max >= 10 ? Math.round(max) : max.toFixed(2)}</span>
      </div>
      <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={`${d} L100 100 L0 100 Z`} fill="rgba(127,184,148,.18)" stroke="none" />
        <path d={d} fill="none" stroke="#7fb894" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** "cues" tab: every cue of the composition, sortable by start. */
export function CueTable({ cues, fps, selection, onPick }: { cues: AudioCue[]; fps: number; selection: Selection; onPick: (c: AudioCue) => void }) {
  const sorted = [...cues].sort((a, b) => a.startFrame - b.startFrame);
  if (!sorted.length) return <p className="hint">No cues registered yet. Scrub through the film once.</p>;
  return (
    <table className="cues">
      <thead>
        <tr>
          <th>start</th>
          <th>len</th>
          <th>kind</th>
          <th>name</th>
          <th>vol</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((c) => (
          <tr key={c.id} className={selection?.kind === "cue" && selection.id === c.id ? "sel" : ""} onClick={() => onPick(c)}>
            <td>{timecode(c.startFrame, fps)}</td>
            <td>{c.endFrame - c.startFrame}</td>
            <td>
              <span className={`swatch block audio-${cueCategory(c)}`} style={{ position: "static", padding: 0, height: 8 }} />
              {cueCategory(c)}
            </td>
            <td title={cueLabel(c)}>{cueLabel(c)}</td>
            <td>{c.volume.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
