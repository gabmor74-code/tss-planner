
(function(){
  const $ = (id)=>document.getElementById(id);

  const els = {
    todayPill: $("todayPill"),
    ctl: $("ctl"), atl: $("atl"), tsb: $("tsb"), ramp: $("ramp"),
    dur: $("dur"),
    durQuick: $("durQuick"),
    ftpGrid: $("ftpGrid"),
    ftp: $("ftp"),
    hrGridBike: $("hrGridBike"),
    hrMaxBike: $("hrMaxBike"),
    hrRestBike: $("hrRestBike"),
    hrGridRun: $("hrGridRun"),
    hrMaxRun: $("hrMaxRun"),
    hrRestRun: $("hrRestRun"),

    sleepH: $("sleepH"),
    sleepScore: $("sleepScore"),
    hrv: $("hrv"),
    hrv7: $("hrv7"),
    rhr: $("rhr"),
    meteo: $("meteo"),
    goal: $("goal"),
    outdoorGrid: $("outdoorGrid"),
    approachMin: $("approachMin"),
    usableMin: $("usableMin"),
    logRecWrap: $("logRecWrap"),
    logRecSwitch: $("logRecSwitch"),
    logRecChk: $("logRecChk"),
    injPain: $("injPain"),
    injArea: $("injArea"),
    injAreaWrap: $("injAreaWrap"),
    injImpact: $("injImpact"),
    injImpactWrap: $("injImpactWrap"),

    genBtn: $("genBtn"), copyBtn: $("copyBtn"), resetBtn: $("resetBtn"),
    outText: $("outText"), outMeta: $("outMeta"), stateBadge: $("stateBadge"),
    readySem: $("readySem"), readyTxt: $("readyTxt"),
    powWrap: $("powWrap"), powSwitch: $("powSwitch"),
    powChk: $("powChk"),
    qualWrap: $("qualWrap"), qualSwitch: $("qualSwitch"),
    qualChk: $("qualChk"),
    toast: $("toast"),
  };

  const state = {
    sport: "bike_indoor",
    hasPower: false,
    didQualityYesterday: false,
    logisticRecovery: false,
  };

  // Storage
  const STORAGE_KEY = "tss_planner_v8_12_2_state";
  const STORAGE_KEYS_MIGRATE = ["tss_planner_v8_12_1_state", "tss_planner_v8_11_3_state", "tss_planner_v8_10_state", "tss_planner_v8_4_state"];


// Workout library (controlled variability)
const WORKOUT_KEY_LAST = "tss_planner_last_workout_id";
const SPRINT_KEY_LAST = "tss_planner_last_sprint_suggestion_date";

function daysSinceISO(iso){
  if(!iso) return null;
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now - d) / 86400000);
}

function canSuggestSprint(){
  let iso = null;
  try{ iso = localStorage.getItem(SPRINT_KEY_LAST); }catch(e){}
  const d = daysSinceISO(iso);
  return d===null || d >= 14;
}

function markSprintSuggested(){
  try{ localStorage.setItem(SPRINT_KEY_LAST, new Date().toISOString().slice(0,10)); }catch(e){}
}

function pickVariant(cat, sport, mainMin){
  const lib = (WORKOUT_DB[cat] && WORKOUT_DB[cat][sport]) ? WORKOUT_DB[cat][sport] : [];
  const candidates = lib.filter(v => mainMin >= v.minMain && mainMin <= v.maxMain);
  const list = (candidates.length ? candidates : lib).slice();
  if(!list.length) return null;

  let lastId = null;
  try{ lastId = localStorage.getItem(WORKOUT_KEY_LAST); }catch(e){}
  // avoid repeating the same workout twice if possible
  let filtered = list;
  if(lastId && list.length > 1){
    filtered = list.filter(v => v.id !== lastId);
    if(!filtered.length) filtered = list;
  }
  const pick = filtered[Math.floor(Math.random()*filtered.length)];
  try{ localStorage.setItem(WORKOUT_KEY_LAST, pick.id); }catch(e){}
  return pick;
}

function splitInto(reps, workEach, recEach){
  const blocks = [];
  for(let i=1;i<=reps;i++){
    blocks.push({mins: workEach, zone: null, tag:"work"});
    if(i<reps) blocks.push({mins: recEach, zone: null, tag:"rec"});
  }
  return blocks;
}

// Each variant returns blocks relative to mainMin.
// tags: work, rec, easy. zones are decided by the category (set in applyVariant).
const WORKOUT_DB = {
  endurance: {
    bike_indoor: [
      {id:"E-IND-STEADY", name:"Costante", minMain:18, maxMain:200, build:(m)=>[{mins:m, tag:"work"}]},
      {id:"E-IND-3x12", name:"3×12′", minMain:42, maxMain:80, build:(m)=>{ const rec=3, work=12; const reps=3; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"E-IND-PROG", name:"Progressivo", minMain:25, maxMain:120, build:(m)=>{ const a=Math.max(10, Math.round(m*0.55)); const b=Math.max(8, m-a); return [{mins:a, tag:"easy"},{mins:b, tag:"work"}]; }},
      {id:"E-IND-2x20", name:"2×20′", minMain:45, maxMain:95, build:(m)=>{ const rec=4, work=20, reps=2; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
    ],
    bike_outdoor: [
      {id:"E-OUT-STEADY", name:"Costante", minMain:18, maxMain:240, build:(m)=>[{mins:m, tag:"work"}]},
      {id:"E-OUT-2BLOCK", name:"2 blocchi lunghi", minMain:55, maxMain:160, build:(m)=>{ const rec=5; const work=Math.max(20, Math.round((m-rec)/2)); const used=work*2+rec; const rem=Math.max(0,m-used); return [{mins:work, tag:"work"},{mins:rec, tag:"rec"},{mins:work, tag:"work"}, ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"E-OUT-PROG", name:"Progressivo", minMain:35, maxMain:200, build:(m)=>{ const a=Math.max(15, Math.round(m*0.60)); const b=Math.max(10, m-a); return [{mins:a, tag:"work"},{mins:b, tag:"work2"}]; }},
    ],
    run: [
      {id:"E-RUN-STEADY", name:"Corsa facile", minMain:15, maxMain:180, build:(m)=>[{mins:m, tag:"work"}]},
      {id:"E-RUN-PROG", name:"Progressivo", minMain:25, maxMain:120, build:(m)=>{ const a=Math.max(12, Math.round(m*0.60)); const b=Math.max(8, m-a); return [{mins:a, tag:"work"},{mins:b, tag:"work2"}]; }},
    ],
  },

  tempo: { // Medio
    bike_indoor: [
      {id:"M-IND-2x20", name:"2×20′", minMain:50, maxMain:120, build:(m)=>{ const rec=4, work=20, reps=2; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"M-IND-3x12", name:"3×12′", minMain:45, maxMain:90, build:(m)=>{ const rec=3, work=12, reps=3; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"M-IND-PROG", name:"Progressivo", minMain:28, maxMain:120, build:(m)=>{ const a=Math.max(10, Math.round(m*0.40)); const b=Math.max(10, Math.round(m*0.35)); const c=Math.max(8, m-a-b); return [{mins:a, tag:"easy"},{mins:b, tag:"work"},{mins:c, tag:"work2"}]; }},
      {id:"M-IND-OU-LIGHT", name:"Over/Under leggero", minMain:44, maxMain:90, build:(m)=>{ const set=8; const reps=Math.max(2, Math.min(4, Math.floor(m/(set+4)))); const rec=4; const used=reps*set+(reps-1)*rec; const rem=Math.max(0,m-used); const arr=[]; for(let i=1;i<=reps;i++){ arr.push({mins:6, tag:"work"},{mins:2, tag:"work2"}); if(i<reps) arr.push({mins:rec, tag:"rec"}); } if(rem) arr.push({mins:rem, tag:"easy"}); return arr; }},
    ],
    bike_outdoor: [
      {id:"M-OUT-STEADY", name:"Blocco costante", minMain:20, maxMain:240, build:(m)=>{ const work=Math.max(20, Math.round(m*0.75)); const easy=Math.max(0, m-work); return [{mins:work, tag:"work"}, ...(easy?[{mins:easy, tag:"easy"}]:[])]; }},
      {id:"M-OUT-2x25", name:"2×25′", minMain:60, maxMain:150, build:(m)=>{ const rec=5, work=25, reps=2; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"M-OUT-PROG", name:"Progressivo", minMain:35, maxMain:200, build:(m)=>{ const a=Math.max(15, Math.round(m*0.60)); const b=Math.max(10, m-a); return [{mins:a, tag:"easy"},{mins:b, tag:"work"}]; }},
    ],
    run: [
      {id:"M-RUN-2x10", name:"2×10′", minMain:30, maxMain:70, build:(m)=>{ const rec=3, work=10, reps=2; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"M-RUN-3x8", name:"3×8′", minMain:35, maxMain:75, build:(m)=>{ const rec=3, work=8, reps=3; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"M-RUN-STEADY", name:"Blocco costante", minMain:20, maxMain:180, build:(m)=>[{mins:m, tag:"work"}]},
    ],
  },

  threshold: { // Soglia
    bike_indoor: [
      {id:"S-IND-3x8", name:"3×8′", minMain:35, maxMain:75, build:(m)=>{ const rec=4, work=8, reps=3; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"S-IND-2x12", name:"2×12′", minMain:32, maxMain:75, build:(m)=>{ const rec=5, work=12, reps=2; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"S-IND-OU", name:"Over/Under", minMain:40, maxMain:90, build:(m)=>{ const set=10; const reps=Math.max(2, Math.min(3, Math.floor(m/(set+5)))); const rec=5; const used=reps*set+(reps-1)*rec; const rem=Math.max(0,m-used); const arr=[]; for(let i=1;i<=reps;i++){ arr.push({mins:6, tag:"work"},{mins:4, tag:"work2"}); if(i<reps) arr.push({mins:rec, tag:"rec"}); } if(rem) arr.push({mins:rem, tag:"easy"}); return arr; }},
    ],
    bike_outdoor: [
      {id:"S-OUT-2x15", name:"2×15′", minMain:40, maxMain:90, build:(m)=>{ const rec=6, work=15, reps=2; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"S-OUT-1x30", name:"1×30′", minMain:35, maxMain:120, build:(m)=>{ const work=Math.max(20, Math.round(m*0.70)); const easy=Math.max(0, m-work); return [{mins:work, tag:"work"}, ...(easy?[{mins:easy, tag:"easy"}]:[])]; }},
      {id:"S-OUT-3x10", name:"3×10′", minMain:50, maxMain:110, build:(m)=>{ const rec=5, work=10, reps=3; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
    ],
    run: [
      {id:"S-RUN-2x8", name:"2×8′", minMain:25, maxMain:60, build:(m)=>{ const rec=4, work=8, reps=2; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"S-RUN-3x6", name:"3×6′", minMain:30, maxMain:65, build:(m)=>{ const rec=3, work=6, reps=3; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"S-RUN-STEADY", name:"Blocco soglia", minMain:20, maxMain:120, build:(m)=>{ const work=Math.max(12, Math.round(m*0.60)); const easy=Math.max(0, m-work); return [{mins:work, tag:"work"}, ...(easy?[{mins:easy, tag:"easy"}]:[])]; }},
    ],
  },

  vo2: { // VO2max
    bike_indoor: [
      {id:"V-IND-5x3", name:"5×3′", minMain:28, maxMain:70, build:(m)=>{ const rec=3, work=3, reps=5; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"V-IND-6x2", name:"6×2′", minMain:24, maxMain:60, build:(m)=>{ const rec=2, work=2, reps=6; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"V-IND-3x4", name:"3×4′", minMain:25, maxMain:70, build:(m)=>{ const rec=4, work=4, reps=3; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
    ],
    bike_outdoor: [
      // outdoor VO2 is rare; keep it controlled and longer recoveries
      {id:"V-OUT-4x3", name:"4×3′", minMain:35, maxMain:90, build:(m)=>{ const rec=4, work=3, reps=4; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
    ],
    run: [
      {id:"V-RUN-6x1", name:"6×1′", minMain:22, maxMain:55, build:(m)=>{ const rec=2, work=1, reps=6; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
      {id:"V-RUN-5x2", name:"5×2′", minMain:24, maxMain:60, build:(m)=>{ const rec=3, work=2, reps=5; const used=reps*work+(reps-1)*rec; const rem=Math.max(0,m-used); return [...splitInto(reps,work,rec), ...(rem?[{mins:rem, tag:"easy"}]:[])]; }},
    ],
  },
};

function applyVariant(cat, sport, mainMin, bullet, intStr, didQualityYesterday, tsbUsed){
  const v = pickVariant(cat, sport, mainMin);
  const name = v ? v.name : "";
  const blocks = v ? v.build(mainMin) : [{mins: mainMin, tag:"work"}];

  // Zone mapping per category (conservative & controlled)
  // endurance: mostly Z2 (or Z1 if very easy)
  // tempo: Z3
  // threshold: Z4 work, Z2 easy/rec
  // vo2: Z5 work, Z1/Z2 recoveries
  const map = {
    endurance: {work:2, work2:3, easy:1, rec:1},
    tempo:     {work:3, work2:4, easy:2, rec:1},
    threshold: {work:4, work2:4, easy:2, rec:1},
    vo2:       {work:5, work2:4, easy:2, rec:1},
    sprint:    {work:5, work2:5, easy:1, rec:1},
  }[cat] || {work:2, work2:2, easy:1, rec:1};

  // Extra safety: if TSB very negative or yesterday quality, avoid vo2/over-under (we already constrain cat, this is just a soft downgrade)
  if((didQualityYesterday || tsbUsed < -10) && cat==="vo2"){
    blocks.forEach(b => { if(b.tag==="work") b.tag="work2"; });
  }

  // Render blocks (always explicit: no "2×8′" without recovery)
  blocks.forEach(b=>{
    const zone = map[b.tag] ?? map.work;
    let label = "";
    if(b.tag==="rec") label = "Rec ";
    else if(b.tag==="easy") label = "Facile ";
    else label = "";

    bullet((label + b.mins + "′") + " — " + intStr(zone));
  });

  return {name, id: v ? v.id : null};
}
  function toast(msg){
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(()=>els.toast.classList.remove("show"), 1400);
  }

  function fmtDate(){
    const d = new Date();
    const opts = { weekday:"short", day:"2-digit", month:"short" };
    return d.toLocaleDateString("it-IT", opts);
  }
  els.todayPill.textContent = fmtDate();

  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function n(v){
    if(v===null || v===undefined || v==="") return null;
    const s = String(v).trim().replace(",", ".");
    const x = Number(s);
    return Number.isFinite(x) ? x : null;
  }
  function round5(x){ return Math.round(x/5)*5; }
  function wattsText(lo, hi){
    return lo===hi ? (lo + " W") : (lo + "–" + hi + " W");
  }
  function wattRangeText(center, spreadLo, spreadHi){
    const c = round5(center);
    return { center:c, lo: round5(center-spreadLo), hi: round5(center+spreadHi) };
  }

  function setSwitch(el, on){
    el.classList.toggle("on", !!on);
  }

  function updateDurQuick(){
    const s = state.sport;
    const presets = (s==="bike_indoor") ? [45,60,75,90]
                  : (s==="bike_outdoor") ? [60,75,90,120,150]
                  : [30,40,50,60,75];
    els.durQuick.innerHTML = "";
    presets.forEach(v=>{
      const b = document.createElement("button");
      b.type = "button";
      b.className = "qbtn";
      b.textContent = v + "′";
      b.addEventListener("click", ()=>{
        els.dur.value = v;
        save();
        toast("Durata: " + v + "′");
      });
      els.durQuick.appendChild(b);
    });
  }

  function updateVisibility(){
    const s = state.sport;
    const isBike = (s==="bike_indoor" || s==="bike_outdoor");
    const isRun = (s==="run");
    const isOutdoor = (s==="bike_outdoor");
    // power / ftp only for bike
    els.ftpGrid.style.display = (isBike && state.hasPower) ? "" : "none";
    els.hrGridBike.style.display = (isBike && !state.hasPower) ? "" : "none";
    els.hrGridRun.style.display = isRun ? "" : "none";
    if(els.outdoorGrid) els.outdoorGrid.style.display = isOutdoor ? "" : "none";
  }

  function updateInjuryUI(){
    // Show extra injury fields only if a pain value is present
    const p = n(els.injPain.value);
    const show = (p!=null && p > 0);
    if(els.injAreaWrap) els.injAreaWrap.style.display = show ? "" : "none";
    if(els.injImpactWrap) els.injImpactWrap.style.display = show ? "" : "none";
    if(show){
      if(!els.injImpact.value) els.injImpact.value = "auto";
    }
  }

  function setReadinessUI(rd){
    const g = els.readySem?.querySelector('.light.g');
    const y = els.readySem?.querySelector('.light.y');
    const r = els.readySem?.querySelector('.light.r');
    [g,y,r].forEach(el=>{ if(el) el.classList.remove('on'); });

    const label = {green:"VERDE", yellow:"GIALLO", red:"ROSSO"};
    let txt = "—";
    let title = "Readiness";
    if(rd && rd.level){
      txt = label[rd.level] || String(rd.level).toUpperCase();
      if(rd.level==="green" && g) g.classList.add('on');
      else if(rd.level==="yellow" && y) y.classList.add('on');
      else if(rd.level==="red" && r) r.classList.add('on');
      title = "Readiness " + txt + (rd.reasons && rd.reasons.length ? " — " + rd.reasons.join(", ") : "");
    }
    if(els.readyTxt) els.readyTxt.textContent = txt;
    if(els.readySem){
      els.readySem.title = title;
      els.readySem.setAttribute('aria-label', title);
    }
  }


  
  function setSport(s){
    state.sport = s;
    document.querySelectorAll('.seg button').forEach(b=>{
      b.classList.toggle('active', b.dataset.sport===s);
    });

    const isBike = (s==="bike_indoor" || s==="bike_outdoor");
    if(!isBike){
      state.hasPower = false;
      els.powChk.checked = false;
      setSwitch(els.powSwitch, false);
    }
    els.powWrap.style.display = isBike ? "" : "none";

    updateDurQuick();
    updateVisibility();
    updateInjuryUI();
  if(!els.dur.value){
    const d0 = durationMinutes(state.sport, n(els.ctl.value), null);
    els.dur.value = d0;
  }
    save();
  }


  function save(){
    const payload = {
      sport: state.sport,
      hasPower: state.hasPower,
      didQualityYesterday: state.didQualityYesterday,
      dur: els.dur.value,
      ftp: els.ftp.value,
      hrMaxBike: els.hrMaxBike.value,
      hrRestBike: els.hrRestBike.value,
      hrMaxRun: els.hrMaxRun.value,
      hrRestRun: els.hrRestRun.value,
      sleepH: els.sleepH.value,
      sleepScore: els.sleepScore.value,
      hrv: els.hrv.value,
      hrv7: els.hrv7.value,
      rhr: els.rhr.value,
      meteo: els.meteo.value,
      goal: els.goal.value,
      approachMin: els.approachMin.value,
      usableMin: els.usableMin.value,
      logisticRecovery: state.logisticRecovery,
      injPain: els.injPain.value,
      injArea: els.injArea.value,
      injImpact: els.injImpact.value,
      ctl: els.ctl.value, atl: els.atl.value, tsb: els.tsb.value, ramp: els.ramp.value
    };
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); }catch(e){}
  }

  function load(){
    try{
      let raw = localStorage.getItem(STORAGE_KEY);
      let migrated = false;
      if(!raw){
        for(const k of STORAGE_KEYS_MIGRATE){
          const r = localStorage.getItem(k);
          if(r){ raw = r; migrated = true; break; }
        }
      }
      if(!raw) return;
      const p = JSON.parse(raw);
      if(p.sport) setSport(p.sport);
      state.hasPower = !!p.hasPower;
      state.didQualityYesterday = !!p.didQualityYesterday;
      els.powChk.checked = state.hasPower;
      els.qualChk.checked = state.didQualityYesterday;
      setSwitch(els.powSwitch, state.hasPower);
      setSwitch(els.qualSwitch, state.didQualityYesterday);
      if(p.ctl!=null) els.ctl.value = p.ctl;
      if(p.atl!=null) els.atl.value = p.atl;
      if(p.tsb!=null) els.tsb.value = p.tsb;
      if(p.ramp!=null) els.ramp.value = p.ramp;

      if(p.dur!=null) els.dur.value = p.dur;
      if(p.ftp!=null) els.ftp.value = p.ftp;
      if(p.hrMaxBike!=null) els.hrMaxBike.value = p.hrMaxBike;
      if(p.hrRestBike!=null) els.hrRestBike.value = p.hrRestBike;
      if(p.hrMaxRun!=null) els.hrMaxRun.value = p.hrMaxRun;
      if(p.hrRestRun!=null) els.hrRestRun.value = p.hrRestRun;
      if(p.sleepH!=null) els.sleepH.value = p.sleepH;
      if(p.sleepScore!=null) els.sleepScore.value = p.sleepScore;
      if(p.hrv!=null) els.hrv.value = p.hrv;
      if(p.hrv7!=null) els.hrv7.value = p.hrv7;
      if(p.rhr!=null) els.rhr.value = p.rhr;
      if(p.meteo!=null) els.meteo.value = p.meteo;
      if(p.goal!=null) els.goal.value = p.goal;
      if(p.approachMin!=null) els.approachMin.value = p.approachMin;
      if(p.usableMin!=null) els.usableMin.value = p.usableMin;
      state.logisticRecovery = !!p.logisticRecovery;
      if(els.logRecChk) els.logRecChk.checked = state.logisticRecovery;
      if(els.logRecSwitch) setSwitch(els.logRecSwitch, state.logisticRecovery);
      // Injury (new) + legacy migration from "ankle"
      if(p.injPain!=null) els.injPain.value = p.injPain;
      if((p.injPain==null || p.injPain==="") && p.ankle!=null) els.injPain.value = p.ankle;
      if(p.injArea!=null) els.injArea.value = p.injArea;
      if((p.injArea==null || p.injArea==="") && p.ankle!=null) els.injArea.value = "caviglia";
      if(p.injImpact!=null) els.injImpact.value = p.injImpact;

      if(migrated){
        try{ localStorage.removeItem(STORAGE_KEYS_MIGRATE[0]); }catch(_){ }
        save();
      }
    }catch(e){}
  }

  function calcTSB(ctl, atl, tsb){
    if(tsb!==null) return tsb;
    if(ctl!==null && atl!==null) return ctl - atl;
    return null;
  }

  function tssBase(ctl, ramp){
    const c = (ctl==null) ? 50 : clamp(ctl, 0, 140);
    const r = (ramp==null) ? 0 : clamp(ramp, -5, 12);
    // Daily TSS that would roughly achieve the desired weekly CTL ramp:
    // ΔCTL/day = RAMP/7  ->  TSS = CTL + 42*(RAMP/7) = CTL + 6*RAMP
    return Math.max(10, c + 6*r);
  }

  function tssMultiplier(tsb, didQualityYesterday){
    let m = 1.0;
    if(didQualityYesterday) m *= 0.75;
    if(tsb===null) return m;
    if(tsb <= -30) m *= 0.45;
    else if(tsb <= -20) m *= 0.55;
    else if(tsb <= -10) m *= 0.70;
    else if(tsb <= 0) m *= 0.85;
    else if(tsb <= 10) m *= 1.0;
    else if(tsb <= 20) m *= 1.10;
    else m *= 1.20;
    return m;
  }
  function computeReadiness({
    sleepH, sleepScore,
    hrv, hrv7,
    rhr, rhrBase,
    injuryPain, injuryArea, injuryImpact,
    sport,
    tsb
  }){
    // Returns: {level: "green"|"yellow"|"red", reasons: string[], runBlock: boolean, bikeBlock: boolean}
    let level = "green";
    const reasons = [];
    const bump = (lvl)=>{
      if(level==="red") return;
      if(lvl==="red") level="red";
      else if(lvl==="yellow" && level==="green") level="yellow";
    };

    // Sleep
    if(sleepH!=null){
      if(sleepH < 6){ bump("red"); reasons.push("sleep <6h"); }
      else if(sleepH < 7){ bump("yellow"); reasons.push("sleep 6–7h"); }
    }else if(sleepScore!=null){
      if(sleepScore < 60){ bump("red"); reasons.push("sleep score <60"); }
      else if(sleepScore < 75){ bump("yellow"); reasons.push("sleep score 60–74"); }
    }

    // RHR vs baseline
    if(rhr!=null && rhrBase!=null){
      const d = Math.round(rhr - rhrBase);
      if(d >= 6){ bump("red"); reasons.push("RHR +" + d); }
      else if(d >= 3){ bump("yellow"); reasons.push("RHR +" + d); }
    }

    // HRV vs 7d baseline (only penalize drops)
    if(hrv!=null && hrv7!=null && hrv7>0){
      const pct = (hrv - hrv7) / hrv7 * 100;
      const p = Math.round(pct);
      if(p <= -12){ bump("red"); reasons.push("HRV " + p + "%"); }
      else if(p <= -6){ bump("yellow"); reasons.push("HRV " + p + "%"); }
    }

    // Guardrail from TSB (if provided)
    if(tsb!=null){
      if(tsb <= -25){ bump("red"); reasons.push("TSB " + tsb); }
      else if(tsb <= -10){ bump("yellow"); reasons.push("TSB " + tsb); }
    }

    // Injury (generic)
    let runBlock = false;
    let bikeBlock = false;

    if(injuryPain!=null && injuryPain > 0){
      const area = (injuryArea || "").trim();
      const impact = (injuryImpact || "auto").trim();
      let affectsRun = false;
      let affectsBike = false;

      if(impact === "both"){ affectsRun = true; affectsBike = true; }
      else if(impact === "run"){ affectsRun = true; }
      else if(impact === "bike"){ affectsBike = true; }
      else {
        // auto: assume the injury is relevant to today's sport
        affectsRun = (sport === "run");
        affectsBike = (sport === "bike_indoor" || sport === "bike_outdoor");
      }

      if(injuryPain >= 7){ bump("red"); }
      else if(injuryPain >= 4){ bump("yellow"); }
      else if(injuryPain > 2){ bump("yellow"); }

      let lab = "infortunio " + injuryPain + "/10";
      if(area) lab += " (" + area + ")";
      reasons.push(lab);

      // Safety blocks (conservative): avoid running with pain >2 if it affects running.
      runBlock = affectsRun && injuryPain > 2;
      // For bike we only hard-block intensity if pain is clearly significant.
      bikeBlock = affectsBike && injuryPain > 4;
    }

    return {level, reasons, runBlock, bikeBlock};
  }

  function degradeCat(cat, steps){
    const order = ["sprint","vo2","threshold","tempo","endurance","recovery","off"];
    let i = order.indexOf(cat);
    if(i < 0) return cat;
    i = Math.min(order.length-1, i + steps);
    return order[i];
  }



  function computeState({ctl, atl, tsb, ramp, didQualityYesterday}){
    // Categories from TSB + ramp modifier + quality yesterday
    let tag = "OK";
    let badge = {text:"", cls:""};
    let kind = "endurance"; // recovery / endurance / tempo / threshold / vo2 / long / off
    if(didQualityYesterday){
      if(tsb !== null && tsb <= -25) kind = "off";
      else if(tsb !== null && tsb <= -15) kind = "recovery";
      else kind = "endurance";
      tag = "Recupero";
    }else{
      if(tsb === null){
        kind = "endurance";
        tag = "Neutro";
      }else if(tsb <= -30){
        kind = "off";
        tag = "Molto stanco";
      }else if(tsb <= -20){
        kind = "recovery";
        tag = "Stanco";
      }else if(tsb <= -10){
        kind = "endurance";
        tag = "Carico";
      }else if(tsb <= 10){
        kind = "tempo";
        tag = "Normale";
      }else if(tsb <= 25){
        kind = "threshold";
        tag = "Fresco";
      }else{
        kind = "vo2";
        tag = "Molto fresco";
      }
    }

    // ramp rate adjustment (avoid stacking)
    if(ramp !== null){
      if(ramp >= 8){
        // reduce one step
        if(kind==="vo2") kind="threshold";
        else if(kind==="threshold") kind="tempo";
        else if(kind==="tempo") kind="endurance";
        else if(kind==="endurance") kind="recovery";
        tag += " · RAMP alto";
      }else if(ramp <= 1.5){
        // allow a bit more if already not high
        if(kind==="endurance" && (tsb!==null && tsb>0) && !didQualityYesterday) kind="tempo";
      }
    }

    if(kind==="off"){
      badge = {text:"Riposo", cls:"bad"};
    }else if(kind==="recovery"){
      badge = {text:"Recupero", cls:"bad"};
    }else if(kind==="endurance"){
      badge = {text:"Fondo", cls:"ok"};
    }else if(kind==="tempo"){
      badge = {text:"Medio", cls:"warn"};
    }else if(kind==="threshold"){
      badge = {text:"Soglia", cls:"warn"};
    }else if(kind==="vo2"){
      badge = {text:"VO2max", cls:"warn"};
    }else if(kind==="sprint"){
      badge = {text:"Sprint", cls:"warn"};
    }

    return {kind, tag, badge};
  }

  function durationMinutes(sport, ctl, durOverride){
    const o = n(durOverride);
    if(o!==null && o>0) return Math.round(clamp(o, 20, 360));
    const c = (ctl==null) ? 50 : clamp(ctl, 0, 120);
    if(sport==="bike_indoor") return Math.round(clamp(40 + c*0.45, 45, 90));
    if(sport==="bike_outdoor") return Math.round(clamp(60 + c*0.85, 75, 210));
    return Math.round(clamp(25 + c*0.38, 30, 85)); // run
  }

  
  function buildWorkout(opts){
    const {
      sport, hasPower, didQualityYesterday,
      ctl, atl, tsb, ramp,
      durationMin,
      ftp,
      hrMax, hrRest,
      sleepH, sleepScore, hrv, hrv7, rhr,
      goal, meteo, approachMin, usableMin, logisticRecovery,
      injPain, injArea, injImpact
    } = opts;

    const tsbUsed = calcTSB(ctl, atl, tsb);
    const st = computeState({ctl, atl, tsb: tsbUsed, ramp, didQualityYesterday});
    const rd = computeReadiness({
      sleepH, sleepScore, hrv, hrv7,
      rhr, rhrBase: hrRest,
      injuryPain: injPain,
      injuryArea: injArea,
      injuryImpact: injImpact,
      sport,
      tsb: tsbUsed
    });

    const mins = durationMin;
    const head = [];
    const goalUsed = goal || "ftp";
    if(sport==="bike_indoor") head.push("BICI INDOOR");
    if(sport==="bike_outdoor") head.push("BICI OUTDOOR");
    if(sport==="run") head.push("CORSA");

    // Category from fatigue state (with constraints)
    let cat = st.kind;
    if(didQualityYesterday && !["recovery","off"].includes(cat)) cat = "endurance";
    if((sport==="bike_outdoor" || sport==="run") && cat==="vo2") cat = "threshold";

    // Apply readiness (manual check-in): downgrade intensity when needed
    if(rd && rd.level==="yellow"){
      if(cat==="vo2" || cat==="threshold") cat = degradeCat(cat, 2); // avoid quality
      else if(cat==="tempo") cat = degradeCat(cat, 1);
    }else if(rd && rd.level==="red"){
      // Prefer true rest after quality / deep fatigue, otherwise recovery
      if(didQualityYesterday || (tsbUsed!==null && tsbUsed<=-15)) cat = "off";
      else cat = "recovery";
    }

    if(sport==="run" && rd && rd.runBlock){
      if(cat!=="off") cat = "recovery";
    }

    const isBikeSport = (sport==="bike_indoor" || sport==="bike_outdoor");
    if(isBikeSport && rd && rd.bikeBlock){
      // if an injury likely affects cycling, avoid intensity.
      if(["vo2","threshold","tempo"].includes(cat)) cat = "endurance";
    }

    // Goal-first logic: FTP first, VO2 secondary.
    // On fresh days, let the chosen focus materially change the session shape.
    if(isBikeSport && goalUsed==="ftp"){
      if(cat==="vo2") cat = "threshold";
      else if(cat==="tempo" && rd && rd.level==="green" && !didQualityYesterday) cat = "threshold";
    }else if(isBikeSport && goalUsed==="vo2"){
      if(rd && rd.level==="green" && !didQualityYesterday){
        if(cat==="threshold" || cat==="tempo") cat = "vo2";
        else if(cat==="endurance" && tsbUsed!==null && tsbUsed>=5) cat = "vo2";
      }
      if(sport==="bike_outdoor" && rd && rd.level!=="red" && !didQualityYesterday && meteo!=="bad"){
        if((usableMin===null || usableMin >= 3) && (tsbUsed===null || tsbUsed >= 0)) cat = "vo2";
      }
    }else if(isBikeSport && goalUsed==="sprint"){
      const sprintReady = (rd && rd.level==="green" && !didQualityYesterday && mins <= 60 && canSuggestSprint());
      if(sprintReady) cat = "sprint";
      else if(cat==="vo2") cat = "threshold";
      else if(cat==="threshold") cat = "tempo";
    }

    if(sport==="bike_outdoor" && meteo==="bad" && ["vo2","threshold","sprint"].includes(cat)){
      cat = degradeCat(cat, 1);
    }

    const h = mins/60;
    let raw = tssBase(ctl, ramp) * tssMultiplier(tsbUsed, didQualityYesterday);
    if(sport==="run") raw *= 0.90;

    const IF_RANGE = {
      recovery:[0.45,0.60],
      endurance:[0.60,0.75],
      tempo:[0.75,0.88],
      threshold:[0.88,0.98],
      vo2:[0.88,0.95],
      sprint:[0.70,0.85],
    };
    const r = IF_RANGE[cat] || IF_RANGE.endurance;

    let ifNeed = Math.sqrt(raw/(h*100));
    if(!Number.isFinite(ifNeed)) ifNeed = 0.70;
    // TSS caps (coach rules): apply mainly for sessions ≤95′ (manual days)
    const TSS_CAPS = {
      recovery:[20,35],
      endurance:[40,50],
      tempo:[55,70],
      threshold:[75,85],
      vo2:[75,85],
      sprint:[35,55],
    };

    let loIF = r[0], hiIF = r[1];
    if(mins <= 95){
      const cap = TSS_CAPS[cat];
      if(cap){
        const ifMinCap = Math.sqrt(cap[0]/(h*100));
        const ifMaxCap = Math.sqrt(cap[1]/(h*100));
        loIF = Math.max(loIF, ifMinCap);
        hiIF = Math.min(hiIF, ifMaxCap);
      }
    }

    let ifChosen = clamp(ifNeed, loIF, hiIF);
    ifChosen = clamp(ifChosen, 0.45, 1.05);
    const targetTSS = Math.round(ifChosen*ifChosen*h*100);

    const GOAL_LABEL = {ftp:"FTP", vo2:"VO2max", general:"Generale", sprint:"Sprint"};
    head.push("Focus: " + (GOAL_LABEL[goalUsed] || "FTP"));
    head.push("Durata: " + mins + "′");
    head.push("TSS: " + targetTSS);
    head.push("IF: " + ifChosen.toFixed(2));

    let lines = [];
    let variantName = "";
    const bullet = (s)=>lines.push("• " + s);
    const plain = (s)=>lines.push(s);

    function badgeFor(cat){
      if(cat==="off") return {text:"Riposo", cls:"bad"};
      if(cat==="recovery") return {text:"Recupero", cls:"bad"};
      if(cat==="endurance") return {text:"Fondo", cls:"ok"};
      if(cat==="tempo") return {text:"Medio", cls:"warn"};
      if(cat==="threshold") return {text:"Soglia", cls:"warn"};
      if(cat==="vo2") return {text:"VO2max", cls:"warn"};
      if(cat==="sprint") return {text:"Sprint", cls:"warn"};
      return {text:"—", cls:""};
    }
    const badge = badgeFor(cat);

    function pack(){
      const RD_LABEL = {green:"VERDE", yellow:"GIALLO", red:"ROSSO"};
      const rdShort = (rd && rd.level) ? (RD_LABEL[rd.level] || rd.level.toUpperCase()) : "";
      const rs = (rd && rd.reasons && rd.reasons.length) ? rd.reasons : [];
      const rsShort = rs.length ? (" (" + rs.slice(0,2).join(", ") + (rs.length>2 ? ", …" : "") + ")") : "";
      const metaCore = st.tag + (rdShort ? (" · Readiness " + rdShort + rsShort) : "");
      const meta = (variantName ? (metaCore + " · " + variantName) : metaCore);
      const catLine = "Categoria scelta: " + badge.text + (variantName ? (" · " + variantName) : "");
      return {
        text: head.join(" · ") + "\n" + catLine + "\n\n" + lines.join("\n"),
        meta,
        badge,
        readiness: rd || null,
        summary: {cat, targetTSS, ifChosen}
      };
    }

    if(cat==="off"){
      bullet("Riposo");
      return pack();
    }

    // Warm-up / cool-down (max 10′)
    function pickWarmCool(total){
      let wu = Math.min(10, Math.max(5, Math.round(total*0.15)));
      let cd = Math.min(10, Math.max(4, Math.round(total*0.10)));
      if(wu+cd > total-5){
        const overflow = (wu+cd) - (total-5);
        const redCd = Math.min(Math.max(0, cd-3), overflow);
        cd -= redCd;
        let rem = overflow - redCd;
        if(rem>0) wu = Math.max(3, wu-rem);
      }
      wu = Math.min(10, wu);
      cd = Math.min(10, cd);
      return {wu, cd};
    }

    const wc = pickWarmCool(mins);
    const wu = wc.wu;
    const cd = wc.cd;
    const main = Math.max(0, mins - wu - cd);

    // Intensity helpers (show watts if power, otherwise HR zone + bpm)
    // Potenza per zone (semplificate) — coerenti con i range tipici e con i workout .zwo
    // Z1 ~55% FTP, Z2 ~70% FTP, Z3 ~85% FTP, Z4 ~100% FTP, Z5 ~118% FTP
    const zPct = {1:0.55, 2:0.70, 3:0.85, 4:1.00, 5:1.18};

    function powerText(zone){
      const p = zPct[zone] || 0.70;
      if(!ftp) return "";
      const w = Math.round(ftp * p);
      return w + " W";
    }

    function hrText(zone){
      let txt = "Z" + zone;
      if(hrMax && hrRest){
        const hrr = hrMax - hrRest;
        const bounds = {
          1:[0.50,0.60],
          2:[0.60,0.70],
          3:[0.70,0.80],
          4:[0.80,0.90],
          5:[0.90,1.00],
        }[zone] || [0.60,0.70];
        const lo = Math.round(hrRest + hrr*bounds[0]);
        const hi = Math.round(hrRest + hrr*bounds[1]);
        const mid = Math.round((lo+hi)/2);
        txt += " (~" + mid + " bpm)";
      }
      return txt;
    }

    function intStr(zone){
      return hasPower ? powerText(zone) : hrText(zone);
    }

    function appendNutrition(){
      if(cat==="off") return;
      const hours = mins/60;
      const isIndoor = (sport==="bike_indoor");
      const isRunSport = (sport==="run");

      let choRange = [0,0];
      if(cat==="recovery") choRange = [0,30];
      else if(cat==="endurance") choRange = (mins>=90 ? [40,60] : [30,50]);
      else if(cat==="tempo") choRange = [60,80];
      else if(cat==="threshold" || cat==="vo2") choRange = [70,90];
      else choRange = [30,60];

      const lo = choRange[0], hi = choRange[1];
      const mid = Math.round((lo+hi)/2);
      const tot = Math.round(mid*hours);

      plain("");
      plain("NUTRIZIONE");

      if(hi <= 0 || (cat==="recovery" && mins <= 45)){
        bullet("Carbo: opzionali (acqua + elettroliti).");
      }else{
        bullet("Carbo: " + lo + "–" + hi + " g/ora.");
        bullet("Totale: " + Math.round(lo*hours) + "–" + Math.round(hi*hours) + " g (su " + mins + "′).");
      }

      const fluid = isIndoor ? [600,900] : (isRunSport ? [300,600] : [500,750]);
      bullet("Idratazione: " + fluid[0] + "–" + fluid[1] + " ml/ora.");
      if(isIndoor) bullet("Indoor: ventilatore + asciugamano (sudorazione alta).");
      bullet("Post: 25–35 g proteine + carbo (soprattutto se qualità).");
    }

    function buildOutdoorMethod(){
      if(!(sport==="bike_outdoor" && hasPower && ftp)) return null;
      if(!["tempo","threshold","vo2","sprint"].includes(cat)) return null;

      const approach = Math.max(0, Math.round(approachMin || wu));
      const usable = Math.max(3, Math.round(usableMin || (cat==="vo2" ? 6 : 8)));
      const easyCap = round5(Math.min(140, ftp*0.72));
      const z2Lo = round5(ftp*0.66);
      const z2Hi = round5(ftp*0.76);
      const backLo = round5(ftp*0.63);
      const backHi = round5(ftp*0.73);
      const minBack = Math.min(20, Math.max(10, Math.round(mins*0.10)));

      function optionHeader(title){
        plain("");
        plain(title);
      }
      function fmtMin(val){
        const x = Math.round(val*10)/10;
        return Number.isInteger(x) ? String(x) : x.toFixed(1);
      }
      function optionFooter(total, approachM, qualityM, recM, z2M){
        plain("Tempo stimato: " + fmtMin(total) + "′ (avvicinamento " + fmtMin(approachM) + "′ + qualità " + fmtMin(qualityM) + "′ + recuperi " + fmtMin(recM) + "′ + Z2 " + fmtMin(z2M) + "′)");
      }
      function recLine(recMin){
        return logisticRecovery
          ? ("Recupero logistico ~" + recMin + "′ — discesa o ritorno; se pedalato facile, cap " + easyCap + " W")
          : ("Rec " + recMin + "′ facile — cap " + easyCap + " W");
      }

      function emitStandardOption(label, cfg){
        optionHeader(label);
        bullet("Avvicinamento " + approach + "′ — " + wattsText(z2Lo, z2Hi));
        let z2Used = 0;
        let recUsed = 0;
        const between = cfg.betweenZ2 || [];
        for(let i=1;i<=cfg.reps;i++){
          bullet("LAP · " + cfg.work + "′ — " + wattsText(cfg.target.lo, cfg.target.hi) + " (centro ~" + cfg.target.center + " W, cap " + cfg.cap + " W)");
          if(i<cfg.reps){
            const extraZ2 = between[i-1] || 0;
            if(extraZ2 > 0){
              bullet("Z2 tra i blocchi " + extraZ2 + "′ — " + wattsText(backLo, backHi));
              z2Used += extraZ2;
            }
            bullet(recLine(cfg.recMin));
            recUsed += cfg.recMin;
          }
        }
        if(cfg.finalZ2 > 0){
          bullet("Rientro / completamento Z2 " + cfg.finalZ2 + "′ — " + wattsText(backLo, backHi));
          z2Used += cfg.finalZ2;
        }
        optionFooter(mins, approach, cfg.reps*cfg.work, recUsed, z2Used);
      }

      if(cat==="sprint"){
        const reps = mins >= 55 ? 8 : 6;
        const totalQuality = reps * 2;
        const z2Final = Math.max(minBack, mins - approach - totalQuality);
        variantName = "Sprint 15″";
        optionHeader("Scelta A · Sprint puro");
        bullet("Avvicinamento " + approach + "′ — " + wattsText(z2Lo, z2Hi));
        for(let i=1;i<=reps;i++){
          bullet("LAP · 15″ forte / quasi massimale");
          if(i<reps) bullet("1′45″ facile — cap " + easyCap + " W");
        }
        if(z2Final > 0) bullet("Rientro / completamento Z2 " + z2Final + "′ — " + wattsText(backLo, backHi));
        optionFooter(mins, approach, reps*0.25, (reps-1)*1.75, z2Final);

        if(reps >= 8){
          optionHeader("Scelta B · Più conservativa");
          bullet("Avvicinamento " + approach + "′ — " + wattsText(z2Lo, z2Hi));
          for(let i=1;i<=6;i++){
            bullet("LAP · 15″ forte / quasi massimale");
            if(i<6) bullet("1′45″ facile — cap " + easyCap + " W");
          }
          const z2FinalB = Math.max(minBack, mins - approach - 12);
          bullet("Rientro / completamento Z2 " + z2FinalB + "′ — " + wattsText(backLo, backHi));
          optionFooter(mins, approach, 1.5, 8.75, z2FinalB);
        }
        return {name: variantName, sprintSuggested: true};
      }

      let work = 8, reps = 3, recMin = 5;
      let target = wattRangeText(ftp*0.99, 5, 5);
      let cap = round5(Math.min(ftp*1.04, ftp+8));

      if(cat==="vo2"){
        if(usable >= 4){ work = 3; reps = mins >= 70 ? 5 : 4; recMin = 3; }
        else { work = 2; reps = 5; recMin = 3; }
        target = wattRangeText(ftp*1.14, 4, 8);
        cap = round5(ftp*1.20);
        variantName = "VO2 outdoor " + reps + "×" + work + "′";
      }else if(cat==="threshold"){
        if(usable >= 15 && mins >= 60){ work = 15; reps = 2; recMin = 5; }
        else if(usable >= 10 && mins >= 55){ work = 10; reps = 3; recMin = 5; }
        else if(usable >= 8){ work = 8; reps = 3; recMin = 4; }
        else if(usable >= 6){ work = 6; reps = 4; recMin = 4; }
        else { work = Math.max(3, usable); reps = 4; recMin = 3; }
        if(work >= 15) target = wattRangeText(ftp*0.99, 5, 5);
        else if(work >= 10) target = wattRangeText(ftp*0.985, 5, 7);
        else if(work >= 8) target = wattRangeText(ftp*0.98, 5, 8);
        else target = wattRangeText(ftp*0.975, 5, 8);
        variantName = "Salita FTP " + reps + "×" + work + "′";
      }else{
        if(usable >= 10 && mins >= 55){ work = 10; reps = 3; recMin = 5; }
        else if(usable >= 8){ work = 8; reps = 3; recMin = 4; }
        else if(usable >= 6){ work = 6; reps = 4; recMin = 4; }
        else { work = Math.max(3, usable); reps = 4; recMin = 3; }
        target = wattRangeText(ftp*0.90, 5, 8);
        cap = round5(Math.min(ftp*0.95, ftp+2));
        variantName = "Salita Tempo " + reps + "×" + work + "′";
      }

      const maxRepsByCat = {threshold: (work >= 15 ? 2 : work >= 10 ? 3 : 4), tempo: (work >= 10 ? 3 : 4), vo2: 5};
      reps = Math.min(reps, maxRepsByCat[cat] || reps);

      const nominalQuality = (r) => (r*work + Math.max(0, r-1)*recMin);
      while(reps > 1 && (approach + nominalQuality(reps) + minBack) > mins) reps -= 1;

      const remaining = Math.max(0, mins - approach - nominalQuality(reps));
      const finalOnly = remaining;
      emitStandardOption("Scelta A · Allunga tutto in fondo", {
        reps, work, recMin, target, cap,
        betweenZ2: [],
        finalZ2: finalOnly
      });

      if(reps >= 2){
        const slots = Math.max(1, reps - 1);
        let between = Array(slots).fill(0);
        let usedBetween = 0;
        let finalZ2 = remaining;

        if(remaining > 0){
          if(remaining >= slots){
            let units = Math.round(remaining);
            let base = Math.floor(units / (slots + 1));
            let rest = units - base * (slots + 1);
            between = Array(slots).fill(base);
            for(let i=0; i<slots && rest>0; i++, rest--) between[i] += 1;
            finalZ2 = base + rest;
          }else{
            finalZ2 = remaining;
          }
          usedBetween = between.reduce((a,b)=>a+b,0);
          finalZ2 = Math.max(0, remaining - usedBetween);
        }

        emitStandardOption("Scelta B · Distribuisci la Z2 tra i blocchi", {
          reps, work, recMin, target, cap,
          betweenZ2: between,
          finalZ2
        });
      }
      return {name: variantName};
    }

    // Blocks (indoor structured, outdoor steady)
    const advice = [];
    const useOutdoorMethod = (sport==="bike_outdoor" && hasPower && ftp && ["tempo","threshold","vo2","sprint"].includes(cat));
    if(!useOutdoorMethod) bullet("Riscaldamento " + wu + "′ — " + intStr(1));

    const painTxt = (injPain!=null && injPain>0)
      ? ("infortunio " + injPain + "/10" + (injArea ? " (" + injArea + ")" : ""))
      : "";

    if(rd && rd.runBlock){
      advice.push("Infortunio: " + painTxt + " — evita corsa oggi. Alternativa: bici Z1/Z2 30–60′.");
    }else if(rd && rd.bikeBlock){
      advice.push("Infortunio: " + painTxt + " — evita intensità. Oggi solo Z1/Z2.");
    }else if(injPain!=null && injPain>0){
      advice.push("Infortunio: " + painTxt + " — monitora (stop se peggiora).");
    }

    if(sport==="bike_outdoor"){ 
      const metric = hasPower ? "Lap Avg Power" : "Lap Avg HR";
      if(cat==="endurance"){
        advice.push("Outdoor: scegli percorso scorrevole o una salita lunga; evita stop. Usa " + metric + " per tenere costante.");
      }else if(cat==="tempo" || cat==="threshold"){
        advice.push("Outdoor: usa LAP per ogni blocco; guarda durata + " + metric + ". Se stop/traffico, riparti e completa i minuti previsti.");
      }
    }

    function appendAdvice(){
      return;
    }

if(cat==="recovery"){
  bullet("Facile " + main + "′ — " + intStr(1));
  bullet("Defaticamento " + cd + "′ — " + intStr(1));
  appendNutrition();
  appendAdvice();
  return pack();
}

// Outdoor method-first logic (lap based, block precision > second precision)
const outdoorPicked = buildOutdoorMethod();
if(outdoorPicked){
  if(outdoorPicked.name) variantName = outdoorPicked.name;
  appendNutrition();
  appendAdvice();
  return pack();
}

// Variants (controlled)
const picked = applyVariant(cat, sport, main, bullet, intStr, didQualityYesterday, tsbUsed);
    if(picked && picked.name) variantName = picked.name;

bullet("Defaticamento " + cd + "′ — " + intStr(1));
appendNutrition();
appendAdvice();
return pack();

  }


  function validate(){
    const dur = n(els.dur.value);
    if(dur===null || dur<=0){
      toast("Seleziona Durata");
      return false;
    }
    const isBike = (state.sport==="bike_indoor" || state.sport==="bike_outdoor");
    const isRun = (state.sport==="run");

    if(isBike && state.hasPower){
      const ftp = n(els.ftp.value);
      if(ftp===null || ftp<=0){
        toast("Inserisci FTP");
        return false;
      }
    }else{
      // HR mode for run, and for bike without power
      const hrMax = n(isRun ? els.hrMaxRun.value : els.hrMaxBike.value);
      const hrRest = n(isRun ? els.hrRestRun.value : els.hrRestBike.value);
      if(hrMax===null || hrMax<=0 || hrRest===null || hrRest<=0 || hrMax<=hrRest){
        toast("Inserisci FC max e FC riposo");
        return false;
      }
    }
    return true;
  }


  
  function generate(){
    if(!validate()) return;

    const ctl = n(els.ctl.value);
    const atl = n(els.atl.value);
    const tsb = n(els.tsb.value);
    const ramp = n(els.ramp.value);

    const durationMin = durationMinutes(state.sport, ctl, els.dur.value);

    const isRun = (state.sport==="run");
    const isBike = (state.sport==="bike_indoor" || state.sport==="bike_outdoor");

    const ftp = (isBike && state.hasPower) ? n(els.ftp.value) : null;
    const hrMax = (!state.hasPower || isRun) ? n(isRun ? els.hrMaxRun.value : els.hrMaxBike.value) : null;
    const hrRest = (!state.hasPower || isRun) ? n(isRun ? els.hrRestRun.value : els.hrRestBike.value) : null;

    const w = buildWorkout({
      sport: state.sport,
      hasPower: (isBike ? state.hasPower : false),
      didQualityYesterday: state.didQualityYesterday,
      ctl, atl, tsb, ramp,
      durationMin,
      ftp,
      hrMax,
      hrRest,
      sleepH: n(els.sleepH.value),
      sleepScore: n(els.sleepScore.value),
      hrv: n(els.hrv.value),
      hrv7: n(els.hrv7.value),
      rhr: n(els.rhr.value),
      goal: (els.goal.value || "ftp").trim(),
      meteo: (els.meteo.value || "ok").trim(),
      approachMin: n(els.approachMin.value),
      usableMin: n(els.usableMin.value),
      logisticRecovery: state.logisticRecovery,
      injPain: n(els.injPain.value),
      injArea: (els.injArea.value || "").trim(),
      injImpact: (els.injImpact.value || "auto").trim()
    });

    if(w && w.sprintSuggested) markSprintSuggested();
    els.outText.textContent = w.text;
    els.outMeta.textContent = w.meta;
    els.stateBadge.textContent = w.badge.text;
    els.stateBadge.className = "badge " + (w.badge.cls || "");
    setReadinessUI(w.readiness);
    els.copyBtn.disabled = false;
    save();
    toast("Allenamento generato");
  }


  function copy(){
    const txt = els.outText.textContent || "";
    if(!txt.trim()) return;
    navigator.clipboard?.writeText(txt).then(()=>toast("Copiato"), ()=>toast("Copia non disponibile"));
  }

  
  function reset(){
    els.dur.value = "";
    els.ftp.value = "197";
    els.hrMaxBike.value = "";
    els.hrRestBike.value = "";
    els.hrMaxRun.value = "";
    els.hrRestRun.value = "";

    // check-in
    els.sleepH.value = "";
    els.sleepScore.value = "";
    els.hrv.value = "";
    els.hrv7.value = "";
    els.rhr.value = "";
    els.meteo.value = "ok";
    els.goal.value = "ftp";
    els.approachMin.value = "10";
    els.usableMin.value = "8";
    els.injPain.value = "";
    els.injArea.value = "";
    els.injImpact.value = "auto";

    els.ctl.value = "";
    els.atl.value = "";
    els.tsb.value = "";
    els.ramp.value = "";

    state.hasPower = false;
    state.didQualityYesterday = false;
    state.logisticRecovery = false;
    els.powChk.checked = false;
    els.qualChk.checked = false;
    if(els.logRecChk) els.logRecChk.checked = false;
    setSwitch(els.powSwitch, false);
    setSwitch(els.qualSwitch, false);
    if(els.logRecSwitch) setSwitch(els.logRecSwitch, false);

    setSport("bike_indoor");
    updateVisibility();
  if(!els.dur.value){
    const d0 = durationMinutes(state.sport, n(els.ctl.value), null);
    els.dur.value = d0;
  }

    els.outText.textContent = "Inserisci i dati e genera.";
    els.outMeta.textContent = "—";
    els.stateBadge.textContent = "—";
    els.stateBadge.className = "badge";
    setReadinessUI(null);
    els.copyBtn.disabled = true;

    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    try{ STORAGE_KEYS_MIGRATE.forEach(k=>localStorage.removeItem(k)); }catch(_){ }
    try{ localStorage.removeItem(WORKOUT_KEY_LAST); }catch(_){ }
    try{ localStorage.removeItem(SPRINT_KEY_LAST); }catch(_){ }
    toast("Reset");
  }


  // wiring
  function bindTap(el, fn){
    let last = 0;
    const run = (e)=>{
      const now = Date.now();
      if(now - last < 450) return; // dedupe pointer+click
      last = now;
      // iOS: if a number field is focused, first tap may just blur — do it ourselves
      try{
        const ae = document.activeElement;
        if(ae && ae.blur) ae.blur();
      }catch(_){}
      fn(e);
    };
    if(window.PointerEvent){
      el.addEventListener('pointerup', (e)=>{
        if(e.pointerType==='mouse' && e.button!==0) return;
        run(e);
      });
    }else{
      el.addEventListener('touchend', (e)=>run(e), {passive:true});
    }
    el.addEventListener('click', (e)=>run(e));
  }

  document.querySelectorAll('.seg button').forEach(b=>{
    bindTap(b, ()=>setSport(b.dataset.sport));
  });

  function rowToggle(wrap, chk){
    bindTap(wrap, (e)=>{
      // If the user tapped the switch itself, the label will toggle the checkbox.
      if(e.target && (e.target.tagName==="INPUT" || e.target.closest('input') || e.target.closest('.switchWrap'))) return;
      chk.checked = !chk.checked;
      chk.dispatchEvent(new Event('change', {bubbles:true}));
    });
  }

  function syncPower(){
    state.hasPower = !!els.powChk.checked;
    setSwitch(els.powSwitch, state.hasPower);
    updateVisibility();
    if(!els.dur.value){
      const d0 = durationMinutes(state.sport, n(els.ctl.value), null);
      els.dur.value = d0;
    }
    save();
  }

  function syncQuality(){
    state.didQualityYesterday = !!els.qualChk.checked;
    setSwitch(els.qualSwitch, state.didQualityYesterday);
    save();
  }

  function syncLogisticRecovery(){
    state.logisticRecovery = !!els.logRecChk.checked;
    if(els.logRecSwitch) setSwitch(els.logRecSwitch, state.logisticRecovery);
    save();
  }

  rowToggle(els.powWrap, els.powChk);
  rowToggle(els.qualWrap, els.qualChk);
  if(els.logRecWrap) rowToggle(els.logRecWrap, els.logRecChk);
  els.powChk.addEventListener('change', syncPower);
  els.qualChk.addEventListener('change', syncQuality);
  if(els.logRecChk) els.logRecChk.addEventListener('change', syncLogisticRecovery);

  ["dur","ftp","goal","approachMin","usableMin","hrMaxBike","hrRestBike","hrMaxRun","hrRestRun","sleepH","sleepScore","hrv","hrv7","rhr","injPain","injArea","ctl","atl","tsb","ramp"].forEach(id=>{
    $(id).addEventListener('input', save, {passive:true});
  });

  // select needs change event
  els.injImpact.addEventListener('change', save, {passive:true});
  els.goal.addEventListener('change', save, {passive:true});
  els.meteo.addEventListener('change', save, {passive:true});

  // show/hide injury extra fields
  els.injPain.addEventListener('input', updateInjuryUI, {passive:true});

  // ± per valori negativi (iOS: tastierino numerico senza tasto meno)
  document.querySelectorAll('.signBtn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const id = btn.dataset.sign;
      const el = $(id);
      if(!el) return;
      if(el.value === "") return;
      const val = n(el.value);
      if(val===null) return;
      el.value = String(-val);
      save();
      try{ el.focus({preventScroll:true}); }catch(_){ el.focus(); }
    });
  });



  els.genBtn.addEventListener('click', generate);
  els.copyBtn.addEventListener('click', copy);
  els.resetBtn.addEventListener('click', reset);

  // init
  load();
  setSport(state.sport);
  setSwitch(els.powSwitch, state.hasPower);
  setSwitch(els.qualSwitch, state.didQualityYesterday);
  if(els.logRecSwitch) setSwitch(els.logRecSwitch, state.logisticRecovery);
  updateDurQuick();
  updateVisibility();
  updateInjuryUI();
  setReadinessUI(null);
  if(!els.dur.value){
    const d0 = durationMinutes(state.sport, n(els.ctl.value), null);
    els.dur.value = d0;
  }
  if(!els.ftp.value) els.ftp.value = "197";
  if(!els.goal.value) els.goal.value = "ftp";
  if(!els.meteo.value) els.meteo.value = "ok";
  if(!els.approachMin.value) els.approachMin.value = "10";
  if(!els.usableMin.value) els.usableMin.value = "8";

  // PWA SW
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('./sw.js').then((reg)=>{
        try{ reg.update && reg.update(); }catch(_){}
        // auto-refresh once when a new SW takes control (keeps users off stale cached versions)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', ()=>{
          if(refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      }).catch(()=>{});
    });
  }
})();
