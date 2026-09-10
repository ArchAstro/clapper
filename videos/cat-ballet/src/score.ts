import {defineScore,note,chord,phrase,type Note} from "@clapper/music";

// An original 24-bar chamber waltz in D. Written notes, not a generated audio file.
const harmony=[
  ["D3","F#3","A3","D4"],["B2","F#3","B3","D4"],["G2","G3","B3","D4"],["A2","G3","C#4","E4"],
  ["D3","F#3","A3","D4"],["F#2","F#3","A3","C#4"],["E3","G3","B3","E4"],["A2","G3","C#4","E4"],
  ["B2","F#3","B3","D4"],["G2","G3","B3","D4"],["E3","G3","B3","E4"],["F#2","A#3","C#4","E4"],
  ["B2","F#3","B3","D4"],["E3","G#3","B3","D4"],["A2","G3","C#4","E4"],["A2","G3","C#4","E4"],
  ["D3","F#3","A3","D4"],["B2","F#3","B3","D4"],["G2","G3","B3","D4"],["A2","G3","C#4","E4"],
  ["D3","F#3","A3","D4"],["G2","G3","B3","D4"],["A2","G3","C#4","E4"],["D3","F#3","A3","D4"],
];
const melody=[
  "D5 . F#5 A5 F#5 E5", "F#5 - A5 F#5 E5 D5", "G5 . B5 A5 G5 F#5", "E5 - C#5 E5 A5 G5",
  "F#5 . A5 D6 C#6 B5", "A5 - F#5 E5 D5 C#5", "B4 D5 G5 F#5 E5 D5", "C#5 - E5 A5 - .",
  "F#5 . B5 A5 F#5 D5", "G5 - D5 B4 D5 G5", "E5 . G5 B5 A5 G5", "F#5 - A#5 C#6 A#5 F#5",
  "B5 A5 F#5 D5 F#5 B5", "G#5 F#5 E5 D5 B4 E5", "C#5 E5 A5 G5 F#5 E5", "D5 C#5 B4 A4 - .",
  "D5 . F#5 A5 D6 C#6", "B5 - A5 F#5 D5 F#5", "G5 B5 D6 B5 A5 G5", "E5 - C#5 E5 A5 G5",
  "F#5 A5 D6 C#6 B5 A5", "G5 - B5 A5 G5 F#5", "E5 G5 C#6 B5 A5 C#5", "D5 - - - - -",
];
const piano:Note[]=[],pizz:Note[]=[],cello:Note[]=[],flute:Note[]=[],bells:Note[]=[];
for(let b=0;b<24;b++){
  const at=b*3,h=harmony[b],final=b===23;const dynamic=b<8?68:b<16?73:80;
  const tune=phrase(melody[b],{duration:0.5,velocity:dynamic});
  piano.push(...tune.map((n,i)=>({...n,at:at+n.at,duration:n.duration*0.94,velocity:dynamic+[4,-7,-3,2,-4,-8][i%6]})));
  piano.push(note(h[0],at,final?3:0.85,final?60:49));
  piano.push(...chord(h.slice(1),{at:at+(final?0.03:1),duration:final?2.95:0.6,velocity:final?52:43,strum:0.013}));
  if(!final)piano.push(...chord(h.slice(1),{at:at+2,duration:0.62,velocity:39,strum:0.012}));
  cello.push(note(h[0],at,final?3:1.65,final?49:47));
  if(b>=2&&!final){pizz.push(...h.slice(1,3).flatMap((p,i)=>[note(p,at+1+i*0.02,0.33,52),note(p,at+2+i*0.02,0.33,45)]));}
  if(b>=8&&b<16)flute.push(...tune.map((n,i)=>({...n,at:at+n.at,duration:n.duration*(i===tune.length-1?.65:.91),velocity:61+[0,3,7,10,7,4,0,-5][b-8]+[0,-2,2,-1][i%4]})));
  if([3,7,15,19].includes(b))bells.push(note(b===15?"A6":"E6",at+2,0.5,54));
}
bells.push(note("D6",69.06,2.7,48));
export const score=defineScore({
  title:"Pas de Chat — a waltz for small paws",seed:409,meter:[3,4],length:73,tail:3,
  tempo:[{at:0,bpm:108},{at:24,bpm:112},{at:48,bpm:116},{at:63,bpm:108},{at:66,bpm:100},{at:69,bpm:88}],
  markers:[{name:"curtain",at:0},{name:"first steps",at:6},{name:"the turning room",at:30},{name:"a little flight",at:54},{name:"reverence",at:69}],
  tracks:[
    {id:"piano",instrument:"vsupright1",clips:[{notes:piano}],gain:0.62,pan:-0.1,reverb:0.5,humanize:{timing:0.006,velocity:3},program:0},
    {id:"pizzicato",instrument:"violin-ens-pizz",clips:[{notes:pizz,transpose:12}],gain:0.27,pan:0.35,reverb:0.55,program:45},
    {id:"cello",instrument:"cello-ens-pizz",clips:[{notes:cello}],gain:0.42,pan:-0.3,reverb:0.45,program:42},
    {id:"flute",instrument:"flute-sus-nv",clips:[{notes:flute}],gain:0.24,pan:0.16,reverb:0.6,program:73,controls:[{at:24,cc:11,value:82},{at:27,cc:11,value:91},{at:30,cc:11,value:99},{at:33,cc:11,value:86},{at:36,cc:11,value:90},{at:39,cc:11,value:99},{at:42,cc:11,value:91},{at:45,cc:11,value:76}]},
    {id:"celestial",instrument:"glockenspiel",clips:[{notes:bells}],gain:0.16,pan:0.08,reverb:0.6,program:9},
  ],
});
export default score;
