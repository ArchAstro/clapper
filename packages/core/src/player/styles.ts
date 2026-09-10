/** Studio stylesheet (dark, dense, editor-like). */
export const css = `
:root{color-scheme:dark;--bg:#0f1012;--panel:#16171a;--line:#26282d;--fg:#e6e4dc;--muted:#8b897f;--dim:#5d5c55;--accent:#7fb894;--accent2:#2e5c46;--sel:#f0a04b}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:12.5px/1.4 -apple-system,system-ui,"Segoe UI",sans-serif;overflow:hidden;user-select:none}
button,input,select,textarea{font:inherit;color:inherit}
.studio{display:grid;grid-template-columns:250px 1fr 330px;grid-template-rows:38px 1fr 310px;height:100vh}
.studio.music-open{grid-template-columns:230px minmax(240px,1fr) 520px}
.music-heading h2{font-size:17px;text-transform:none;letter-spacing:0;color:var(--fg);margin:0 0 5px}.music-heading>div,.music-mode>span,.music-notice,.music-code>p{color:var(--muted);font-size:11px}
.music-mode{display:flex;align-items:center;gap:6px;margin:16px 0}.music-mode>span{margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.music-clock{display:flex;gap:18px;font-variant-numeric:tabular-nums;padding-bottom:12px;border-bottom:1px solid var(--line)}
.music-tracks{display:flex;flex-direction:column;gap:4px;margin:12px 0}.music-track{display:flex;gap:9px;align-items:center;text-align:left;padding:7px 9px;border:1px solid transparent;border-radius:5px;background:transparent;cursor:pointer}.music-track.selected{border-color:#3b6850;background:#1d2a23}.music-track:hover{background:#20262a}.music-track i{width:7px;height:25px;border-radius:3px}.music-track span{flex:1}.music-track strong,.music-track small{display:block}.music-track small{color:var(--muted);font-size:10px}.music-track em{font-style:normal;color:var(--muted)}
.music-roll-heading{display:flex;justify-content:space-between;margin:16px 0 8px}.music-roll-heading span{font-size:11px;color:var(--muted)}.music-roll{width:100%;display:block}.music-note{cursor:pointer}.music-note:hover,.music-note:focus{fill:#ffda91;opacity:1;outline:none;stroke:#fff2c9;stroke-width:1}.music-markers{display:flex;gap:6px;flex-wrap:wrap;margin-top:15px}.music-code pre{user-select:text;white-space:pre;overflow:auto;background:#0f1417;border:1px solid var(--line);border-radius:6px;padding:12px;font:11px/1.65 ui-monospace,SFMono-Regular,monospace;max-height:65vh;color:#c9ddd0}.music-empty{padding:12px;color:var(--muted)}
.top{grid-column:1/4;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid var(--line);background:var(--panel)}
.top .brand{font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-size:11px;color:var(--muted);margin-right:8px}
.top .name{font-weight:600}
.top .meta{color:var(--muted)}
.side{grid-row:2;border-right:1px solid var(--line);background:var(--panel);overflow:auto;padding:10px}
.side h2,.panel h2{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:8px 2px 8px}
.comp{display:grid;grid-template-columns:96px 1fr;gap:8px;width:100%;text-align:left;background:none;border:1px solid transparent;color:var(--fg);padding:6px;border-radius:8px;cursor:pointer;align-items:center}
.comp:hover{background:#1e2024}.comp.active{background:#1d2a23;border-color:#2e5c46}
.comp .thumb{width:96px;height:54px;border-radius:4px;overflow:hidden;background:#000;position:relative;box-shadow:0 1px 0 rgba(255,255,255,.04) inset}
.comp .thumb>div{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}
.comp .id{font-weight:600;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.comp small{display:block;color:var(--muted);font-size:10.5px;margin-top:2px;white-space:nowrap}
.scenes{display:flex;flex-direction:column;gap:2px;margin-top:4px}
.scene{display:flex;justify-content:space-between;gap:8px;background:none;border:0;color:var(--fg);padding:5px 8px;border-radius:6px;cursor:pointer;text-align:left}
.scene:hover{background:#1e2024}.scene.active{background:#1d2a23}
.scene .sw{width:8px;height:8px;border-radius:2px;flex:none;margin-top:4px}
.scene .n{flex:1}.scene .t{color:var(--muted);font-variant-numeric:tabular-nums;font-size:11px}
.stage{grid-row:2;position:relative;background:#0a0a0b;overflow:auto;
 background-image:linear-gradient(45deg,#121214 25%,transparent 25%),linear-gradient(-45deg,#121214 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#121214 75%),linear-gradient(-45deg,transparent 75%,#121214 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}
.stage .inner{position:relative;min-width:100%;min-height:100%;display:flex;align-items:center;justify-content:center}
.canvas{position:relative;transform-origin:0 0;box-shadow:0 20px 60px rgba(0,0,0,.6);background:#000;flex:none}
.canvas .comp-root{position:absolute;inset:0;overflow:hidden}
.overlay{position:absolute;inset:0;pointer-events:none}
.overlay .safe{position:absolute;border:1px dashed rgba(127,184,148,.7)}
.overlay .title{position:absolute;border:1px dashed rgba(127,184,148,.35)}
.overlay .third{position:absolute;background:rgba(127,184,148,.25)}
.overlay .copy{position:absolute;border:1px solid rgba(240,160,75,.9);background:rgba(240,160,75,.08)}
.overlay .copy span{position:absolute;left:0;top:-14px;font-size:10px;color:#f0a04b;white-space:nowrap}
.hud{position:absolute;left:12px;top:10px;display:flex;gap:6px;pointer-events:none}
.hud span{background:rgba(10,10,11,.75);border:1px solid var(--line);border-radius:6px;padding:3px 8px;font-size:11px;color:var(--fg);font-variant-numeric:tabular-nums}
.hud .scene{color:var(--accent)}
.vp-tools{position:absolute;right:12px;top:10px;display:flex;gap:4px}
.err{position:absolute;left:12px;bottom:12px;right:12px;background:#3d1a1a;color:#ffd7d7;padding:8px 10px;border-radius:6px;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;max-height:40%;overflow:auto}
.panel{grid-row:2;border-left:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;min-height:0}
.tabs{display:flex;border-bottom:1px solid var(--line)}
.tab{flex:1;background:none;border:0;border-bottom:2px solid transparent;color:var(--muted);padding:8px 0;cursor:pointer;text-transform:uppercase;letter-spacing:.06em;font-size:10.5px}
.tab.on{color:var(--fg);border-bottom-color:var(--accent)}
.panel .body{flex:1;overflow:auto;padding:10px 12px;min-height:0}
.kv{display:grid;grid-template-columns:96px 1fr;gap:4px 10px;font-variant-numeric:tabular-nums}
.kv dt{color:var(--muted)}.kv dd{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kv dd.wrap{white-space:normal;word-break:break-all}
.chart{width:100%;height:56px;background:#0f1012;border:1px solid var(--line);border-radius:4px;margin:6px 0}
.row{display:flex;gap:6px;align-items:center;margin:8px 0}
.btn{background:#202226;border:1px solid #2f3237;color:var(--fg);border-radius:6px;padding:4px 9px;cursor:pointer;min-width:30px;line-height:1.3}
.btn:hover{background:#2a2d33}.btn.on{background:var(--accent2);border-color:#3e8763}.btn.sm{padding:2px 7px;font-size:11px}
.btn:disabled{opacity:.5;cursor:default}
select.btn{padding:3px 6px}
table.cues{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:11.5px}
table.cues th{text-align:left;color:var(--muted);font-weight:500;padding:2px 4px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--panel)}
table.cues td{padding:2px 4px;border-bottom:1px solid #1d1f23;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;cursor:pointer}
table.cues tr:hover td{background:#1e2024}
table.cues tr.sel td{background:#2a2416}
.swatch{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;vertical-align:middle}
.scratch{display:flex;flex-direction:column;height:100%;gap:8px}
.scratch textarea{flex:1;min-height:200px;background:#0f1012;border:1px solid var(--line);border-radius:6px;color:#e6e4dc;padding:10px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;resize:none;white-space:pre;tab-size:2;user-select:text}
.scratch .status{font-size:11px;color:var(--muted);white-space:pre-wrap;font-family:ui-monospace,monospace;max-height:120px;overflow:auto}
.scratch .status.bad{color:#ffb4b4}
.bottom{grid-column:1/4;grid-row:3;border-top:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;min-height:0}
.transport{display:flex;align-items:center;gap:6px;padding:6px 12px;border-bottom:1px solid var(--line)}
.transport .tc{font-variant-numeric:tabular-nums;font-family:ui-monospace,SFMono-Regular,monospace;font-size:13px;background:#0f1012;border:1px solid var(--line);border-radius:6px;padding:3px 8px;width:100px;text-align:center}
.transport .kbd{color:var(--dim);font-size:11px;margin-left:auto;white-space:nowrap}
.timeline{position:relative;flex:1;overflow:auto;min-height:0;font-size:10.5px}
.tl-inner{position:relative;min-width:100%}
.lane{display:flex;position:relative;height:22px;border-bottom:1px solid #1b1d21}
.lane.ruler{height:24px;background:#121316;position:sticky;top:0;z-index:5}
.lane .head{position:sticky;left:0;z-index:4;width:150px;flex:none;background:#141518;border-right:1px solid var(--line);padding:0 8px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:22px;display:flex;justify-content:space-between;gap:6px}
.lane .head b{color:var(--fg);font-weight:500}.lane .head i{font-style:normal;color:var(--dim);font-size:10px}
.lane .body{position:relative;flex:none;height:100%}
.ruler .tick{position:absolute;bottom:0;width:1px;background:#3a3d44;height:6px}
.ruler .tick.major{height:12px;background:#4d515a}
.ruler .lab{position:absolute;top:2px;font-size:10px;color:var(--muted);transform:translateX(3px);font-variant-numeric:tabular-nums;white-space:nowrap}
.ruler .range{position:absolute;top:0;bottom:0;background:rgba(127,184,148,.18);border-left:1px solid var(--accent);border-right:1px solid var(--accent)}
.block{position:absolute;top:2px;height:18px;border-radius:3px;font-size:10.5px;line-height:16px;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;border:1px solid transparent;color:#e8e6df}
.block:hover{filter:brightness(1.15)}
.block.sel{outline:1.5px solid var(--sel);outline-offset:-1px}
.block svg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:.8}
.block .lbl{position:relative}
.block.scene{background:#2a3a47;border-color:#3a5266;color:#d8ebf8}
.block.scene.alt{background:#2c3f36;border-color:#3f6b56;color:#d9f2e3}
.block.seq{background:#25313a;border-color:#334a57;color:#c5dbe8}
.block.seq.d2{background:#2d2f3f;border-color:#43465d;color:#d3d5ea}
.block.seq.d3{background:#3a2d3f;border-color:#57435d;color:#ead3ea}
.block.audio-file{background:#4a3a24;border-color:#6d5532;color:#f2dfc0}
.block.audio-bus{background:#5a3d2b;border-color:#7a5238;color:#f6ddd0}
.block.audio-pluck{background:#3f3357;border-color:#5b4b7a;color:#e3d7f7}
.block.audio-epiano{background:#4a3560;border-color:#6a4f88;color:#ead9ff}
.block.audio-sine{background:#234347;border-color:#2f6168;color:#c9eef1}
.block.audio-triangle{background:#233a50;border-color:#2f5271;color:#cfe4f7}
.block.audio-sawtooth{background:#2c2f5a;border-color:#43477f;color:#d6d8f7}
.block.audio-square{background:#33383f;border-color:#4a515b;color:#dfe4ea}
.block.audio-noise{background:#3a3a3a;border-color:#525252;color:#e0e0e0}
.block.audio-breath{background:#244447;border-color:#33646a;color:#cdeff2}
.playhead{position:absolute;top:0;bottom:0;width:1px;background:var(--accent);pointer-events:none;z-index:6}
.playhead:before{content:"";position:absolute;top:0;left:-5px;border:5px solid transparent;border-top:8px solid var(--accent);border-bottom:0}
.playhead .f{position:absolute;top:2px;left:6px;background:var(--accent);color:#0b0b0b;font-size:10px;padding:0 4px;border-radius:3px;font-variant-numeric:tabular-nums;font-weight:600}
.empty{color:var(--muted);text-align:center;padding:40px}
.hint{color:var(--dim);font-size:11px;margin-top:6px}
`;
