import {useEffect,useState} from "react";
import {secondsToBeat,type CompiledScore} from "@clapper/music";
import type {AudioCue} from "../registry";

interface MusicData {path:string;source:string;asset:string;score:CompiledScore}
const COLORS=["#9dcca9","#e7b77e","#9fbfe5","#cfafe7","#df9eac","#bfc589"];
const pitchName=(n:number)=>["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"][n%12]+(Math.floor(n/12)-1);

export function Music({frame,fps,cues,onSeek}:{frame:number;fps:number;cues:AudioCue[];onSeek:(n:number)=>void}){
  const [data,setData]=useState<MusicData|null>(),[error,setError]=useState<string>(),[mode,setMode]=useState<"score"|"code">("score"),[trackId,setTrackId]=useState("");
  useEffect(()=>{const controller=new AbortController();fetch("/__clapper/music",{signal:controller.signal}).then(async r=>{const result=await r.json();if(!r.ok)throw new Error(result.error??"Cannot load score");setData(result);}).catch(e=>{if(!controller.signal.aborted)setError(String(e))});return()=>controller.abort();},[]);
  if(error)return <div className="music-empty" role="alert">{error}</div>;
  if(data===undefined)return <div className="music-empty">Loading music…</div>;
  if(data===null)return <div className="music-empty"><h2>No score configured</h2><p>Add <code>"score": "src/score.ts"</code> to clapper.json and use ScoreAudio in the composition.</p><p>Then restart preview. Your score and code will appear here.</p></div>;
  const score=data.score,track=score.tracks.find(t=>t.id===trackId)??score.tracks[0];
  const cue=cues.find(c=>c.kind==="file"&&c.src===data.asset);
  const offset=cue?.startFrame??0,seconds=Math.max(0,(frame-offset)/fps),beat=secondsToBeat(seconds,score);
  const tempo=[...score.tempos].reverse().find(t=>t.tick<=beat*score.ppq)??score.tempos[0];
  const meter=[...score.meters].reverse().find(t=>t.tick<=beat*score.ppq)??score.meters[0];
  const allNotes=score.tracks.reduce((n,t)=>n+t.notes.length,0);
  const notes=track?.notes??[],lo=Math.max(0,Math.min(60,...notes.map(n=>n.midi))-2),hi=Math.min(127,Math.max(72,...notes.map(n=>n.midi))+2);
  const width=460,height=230,left=36,top=24,plotWidth=width-left-8,plotHeight=height-top-22;
  const x=(s:number)=>left+Math.min(1,Math.max(0,s/score.durationSeconds))*plotWidth;
  const y=(m:number)=>top+(hi-m)/(hi-lo+1)*plotHeight;
  const seek=(s:number)=>{if(cue)onSeek(Math.round(s*fps+offset))};
  return <section className="music-view" aria-label="Music inspector">
    <div className="music-heading"><h2>{score.title}</h2><div>{score.tracks.length} tracks · {allNotes} notes · {score.durationSeconds.toFixed(1)}s</div></div>
    <div className="music-mode" role="group" aria-label="Music view">
      <button className={`btn ${mode==="score"?"on":""}`} aria-pressed={mode==="score"} onClick={()=>setMode("score")}>Score</button>
      <button className={`btn ${mode==="code"?"on":""}`} aria-pressed={mode==="code"} onClick={()=>setMode("code")}>Code</button>
      <span>{data.path}</span>
    </div>
    {mode==="code"?<div className="music-code"><p>Read-only · edit this file to rebuild the music and reload preview.</p><pre tabIndex={0} aria-label="Score source code"><code>{data.source}</code></pre></div>:<>
      <div className="music-clock"><strong>{tempo.bpm.toFixed(0)} BPM</strong><span>{meter.numerator}/{meter.denominator}</span><span>Beat {beat.toFixed(2)}</span></div>
      {!cue&&<p className="music-notice">This project score is not mounted in the selected composition. Note seeking is disabled.</p>}
      <div className="music-tracks" role="group" aria-label="Score tracks">{score.tracks.map((t,i)=><button key={t.id} className={`music-track ${t.id===track?.id?"selected":""}`} onClick={()=>setTrackId(t.id)} aria-pressed={t.id===track?.id}>
        <i style={{background:COLORS[i%COLORS.length]}}/><span><strong>{t.id}</strong><small>{t.instrument}{t.mute?" · muted":""}</small></span><em>{t.notes.length}</em>
      </button>)}</div>
      {track&&<><div className="music-roll-heading"><strong>{track.id}</strong><span>Click a note to seek</span></div>
        <svg className="music-roll" viewBox={`0 0 ${width} ${height}`} aria-label={`${track.id} piano roll`}>
          <rect width={width} height={height} fill="#11171a" rx="6"/>
          {Array.from({length:hi-lo+1},(_,i)=>lo+i).filter(n=>n%12===0).map(n=><g key={n}><line x1={left} x2={width-8} y1={y(n)} y2={y(n)} stroke="#354044"/><text x="4" y={y(n)+3} fill="#9aaba9" fontSize="9">{pitchName(n)}</text></g>)}
          {Array.from({length:6},(_,i)=>i*score.durationSeconds/5).map(s=><g key={s}><line x1={x(s)} x2={x(s)} y1={top-4} y2={height-18} stroke="#263034"/><text x={x(s)} y={height-5} textAnchor="middle" fill="#9aaba9" fontSize="9">{s.toFixed(0)}s</text></g>)}
          {notes.map((n,i)=>{const active=!!cue&&seconds>=n.seconds&&seconds<n.seconds+n.durationSeconds;return <rect key={i} className="music-note" role="button" tabIndex={cue?0:-1} aria-disabled={!cue} aria-label={`${pitchName(n.midi)} at ${n.seconds.toFixed(2)} seconds, velocity ${n.velocity}`} data-frame={Math.round(n.seconds*fps+offset)} x={x(n.seconds)} y={y(n.midi)} width={Math.max(3,n.durationSeconds/score.durationSeconds*plotWidth)} height={Math.max(3,plotHeight/(hi-lo+1)-1)} rx="1.2" fill={active?"#ffda91":COLORS[score.tracks.indexOf(track)%COLORS.length]} opacity={active?1:.35+n.velocity/127*.65} onClick={()=>seek(n.seconds)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();seek(n.seconds)}}}><title>{pitchName(n.midi)} · {n.seconds.toFixed(2)}s · velocity {n.velocity}</title></rect>})}
          {cue&&<line className="music-playhead" x1={x(seconds)} x2={x(seconds)} y1={top-7} y2={height-17} stroke="#fff2c9" strokeWidth="1.5" pointerEvents="none"/>}
        </svg>
        <p className="music-notice">Gain {track.gain??1} · Pan {track.pan??0} · Reverb {track.reverb??0} · {track.controls?.length??0} controller events</p>
      </>}
      {!!score.markers.length&&<div className="music-markers">{score.markers.map(m=><button key={m.name} className="btn sm" disabled={!cue} onClick={()=>seek(m.seconds)}>{m.name} · {m.seconds.toFixed(1)}s</button>)}</div>}
    </>}
  </section>;
}
