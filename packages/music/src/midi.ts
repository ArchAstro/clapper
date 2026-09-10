import MidiModule from "@tonejs/midi";
import type { Score, CompiledScore } from "./types.js";
const { Midi }=MidiModule;

/** MIDI contains the performance. SFZ preset IDs survive in track names. Mix
 * routing/effects stay in the source score and are explicitly reported as lost. */
export function exportMidi(score:CompiledScore,onlyTrack?:string):Uint8Array{
  if(!onlyTrack&&score.tracks.some(t=>!t.mute&&t.channel>15))throw new Error("A single MIDI port supports 15 melodic channels plus percussion; export separate parts for this larger score.");
  const midi=new Midi();
  midi.header.fromJSON({name:score.title,ppq:score.ppq,tempos:score.tempos.map(t=>({ticks:t.tick,bpm:t.bpm})),timeSignatures:score.meters.map(m=>({ticks:m.tick,timeSignature:[m.numerator,m.denominator]})),keySignatures:[],meta:score.markers.map(m=>({ticks:m.tick,type:"marker",text:m.name}))});
  for(const t of score.tracks){
    if(t.mute||(onlyTrack&&t.id!==onlyTrack))continue;
    const out=midi.addTrack();out.name=`${t.id} :: ${t.instrument}`;out.channel=onlyTrack?0:t.channel;out.instrument.number=t.program??0;
    out.endOfTrackTicks=score.lengthTicks;
    for(const n of t.notes)out.addNote({midi:n.midi,ticks:n.tick,durationTicks:n.durationTicks,velocity:n.velocity/127});
    for(const c of t.controls??[])out.addCC({number:c.cc,ticks:Math.round(c.at*score.ppq),value:c.value/127});
    // Tone's encoder writes this value directly as MIDI's signed 14-bit value,
    // while its decoder normalizes by 8192. Adapt explicitly at this boundary.
    for(const b of t.bends??[])out.addPitchBend({ticks:Math.round(b.at*score.ppq),value:Math.max(-8192,Math.min(8191,Math.round(b.value*8192)))});
  }
  return midi.toArray();
}
export function importMidi(bytes:Uint8Array):{score:Score;warnings:string[]}{
  const midi=new Midi(bytes);const ppq=midi.header.ppq;
  if(!Number.isFinite(ppq)||ppq<=0)throw new Error("SMPTE MIDI timing is not supported");
  const warnings=["MIDI import does not restore SFZ effects, routing, humanization settings, or gain automation; pitches/timing/controllers are preserved."];
  const tempos=[...new Map([{at:0,bpm:120},...midi.header.tempos.map(t=>({at:t.ticks/ppq,bpm:t.bpm}))].map(t=>[t.at,t])).values()].sort((a,b)=>a.at-b.at);
  const meters=[...new Map([{at:0,meter:[4,4] as [number,number]},...midi.header.timeSignatures.map(m=>({at:m.ticks/ppq,meter:m.timeSignature as [number,number]}))].map(m=>[m.at,m])).values()].sort((a,b)=>a.at-b.at);
  const tracks=midi.tracks.filter(t=>t.notes.length).map((t,i)=>{
    const parts=t.name.split(" :: ");const id=(parts[0]||`track-${i}`).replace(/[^a-zA-Z0-9_-]/g,"-")+`-${i}`;
    const instrument=parts[1]??`gm-program-${t.instrument.number}`;
    if(!parts[1])warnings.push(`${id}: choose an installed SFZ instrument for program ${t.instrument.number}`);
    return{id,instrument,program:t.instrument.number,drums:t.channel===9,clips:[{notes:t.notes.map(n=>({at:n.ticks/ppq,duration:n.durationTicks/ppq,pitch:n.midi,velocity:Math.round(n.velocity*127)}))}],controls:Object.values(t.controlChanges).flatMap(values=>values.map(c=>({at:c.ticks/ppq,cc:c.number,value:Math.round(c.value*127)}))),bends:t.pitchBends.map(b=>({at:b.ticks/ppq,value:b.value}))};
  });
  return{score:{title:midi.header.name||"Imported score",tempo:tempos,meter:meters,tracks,markers:midi.header.meta.filter(m=>m.type==="marker").map(m=>({name:m.text,at:m.ticks/ppq})),length:Math.max(midi.durationTicks,...midi.tracks.map(t=>t.endOfTrackTicks??0))/ppq},warnings};
}
