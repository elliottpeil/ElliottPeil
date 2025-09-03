// =======================
//        CONFIG
// =======================
const CONFIG = {
    GRID_W: 120, 
    GRID_H: 12,           // reduced height to make header smaller
    CELL_W: 8,   
    CELL_H: 12,
    FONT_PX: 16,         // smaller font
  
    HOLD_MS: 100,
    TRANSITION_BASE_MS: 3000,
  
    // Enhanced transition parameters
    NEIGHBOR_INFLUENCE: 0.3,
    ACTIVITY_DECAY: 0.85,
    PROPAGATION_SPEED: 0.015,
    LOCAL_VARIANCE: 0.4,
  
    JITTER_PROB: 0.001,
  
    // field shaping
    EQUALIZE_FIELD: true,
    FIELD_BLUR: 2,
    GLYPH_SEEDS: 8,
  
    // transition modes
    NOISE_SCALE: 0.1, NOISE_OCTAVES: 3,
    SPIRAL_TURNS: 8.5, SPIRAL_PRECESS: 0.6,
    RIPPLE_WAVELEN: 8, RIPPLE_DIRECTION: 1,
    BRUSH_WIDTH: 5.0, BRUSH_VARIANCE: 0.6,
    FLOOD_ANGLE_DEG: 45, FLOOD_ANISO: 0.7,
  
    QC_WAVES: 6,
    QC_FREQ: 0.12,
    SHOCK_SEEDS: 4,
    SHOCK_FREQ: 0.4,
    SHOCK_DECAY: 0.3,
  
    LOW_POWER: false
  };
  
  // =======================
  //        UTILS
  // =======================
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const easeInOutCubic=t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const smoothstep=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
  const PI=Math.PI;
  
  // Enhanced Perlin noise
  const Perlin=(()=>{
    const p=new Uint8Array(512);
    for(let i=0;i<256;i++)p[i]=i;
    for(let i=255;i>0;i--){const j=(Math.random()*(i+1))|0;[p[i],p[j]]=[p[j],p[i]];}
    for(let i=0;i<256;i++)p[i+256]=p[i];
    const fade=t=>t*t*t*(t*(t*6-15)+10);
    const grad=(h,x,y)=>((h&3)<2?x:-x)+((h&1)?y:-y);
    return (x,y)=>{
      let xi=Math.floor(x)&255, yi=Math.floor(y)&255;
      x-=Math.floor(x); y-=Math.floor(y);
      const u=fade(x), v=fade(y);
      const aa=p[p[xi]+yi], ab=p[p[xi]+yi+1], ba=p[p[xi+1]+yi], bb=p[p[xi+1]+yi+1];
      const L=(a,b,t)=>a+t*(b-a);
      return L(L(grad(aa,x,y),grad(ba,x-1,y),u), L(grad(ab,x,y-1),grad(bb,x-1,y-1),u), v);
    };
  })();
  
  // =======================
  //   FONTS & CANVAS
  // =======================
  const fonts = Array.from(document.querySelectorAll('.art')).map(art=>({
    name: art.dataset.name,
    lines: art.textContent.replace(/\s+$/,'').split('\n').map(l=>l.padEnd(CONFIG.GRID_W,' '))
  }));
  
  const canvas=document.getElementById('canvas');
  const ctx=canvas.getContext('2d');
  canvas.width=CONFIG.GRID_W*CONFIG.CELL_W;
  canvas.height=CONFIG.GRID_H*CONFIG.CELL_H;
  ctx.font=`${CONFIG.FONT_PX}px monospace`;
  ctx.textBaseline='bottom';
  
  // =======================
  //    DYNAMIC LADDERS
  // =======================
  function buildDynamicLadder(sourceGrid, targetGrid) {
    const chars = new Set([' ']);
    for(let y=0; y<CONFIG.GRID_H; y++) {
      for(let x=0; x<CONFIG.GRID_W; x++) {
        chars.add(sourceGrid[y][x]);
        chars.add(targetGrid[y][x]);
      }
    }
    const baseLadder = " .,·':;-_=+*!?/\\|()[]{}iIlL1tfjrxnuvczXYUJCLQ0OZmpqdbkhaoNHKMW&8%@#█▓▒░";
    const ladder = [];
    const charSet = new Set(chars);
    for(const ch of baseLadder) { if(charSet.has(ch)) { ladder.push(ch); charSet.delete(ch); } }
    const remaining = Array.from(charSet).filter(ch => ch !== ' ').sort();
    function estimateDensity(ch){
      const densityMap = {' ':0,'.':1,',':2,':':3,';':4,'-':5,'_':6,'=':7,'+':8,'*':9,'!':10,'?':11,'/':12,'\\':13,'|':14,'(' :15,')':16,'[':17,']':18,'{':19,'}':20,'i':21,'I':22,'l':23,'L':24,'1':25,'t':26,'f':27,'j':28,'r':29,'x':30,'n':31,'u':32,'v':33,'c':34,'z':35,'X':36,'Y':37,'U':38,'J':39,'C':40,'Q':41,'0':42,'O':43,'Z':44,'m':45,'p':46,'q':47,'d':48,'b':49,'k':50,'h':51,'a':52,'o':53,'N':54,'H':55,'K':56,'M':57,'W':58,'&':59,'8':60,'%':61,'@':62,'#':63,'█':64,'▓':65,'▒':66,'░':67};
      return densityMap[ch] !== undefined ? densityMap[ch] : 50;
    }
    for(const ch of remaining){
      let inserted=false, density=estimateDensity(ch);
      for(let i=1;i<ladder.length;i++){
        const prev=estimateDensity(ladder[i-1]), next=estimateDensity(ladder[i]);
        if(density>=prev && density<=next){ ladder.splice(i,0,ch); inserted=true; break; }
      }
      if(!inserted) ladder.push(ch);
    }
    return ladder.join('');
  }
  
  // =======================
  //      GRID OPS
  // =======================
  function centerASCII(font){
    const maxLen=Math.max(...font.lines.map(l=>l.trimEnd().length));
    const padX=Math.max(0,Math.floor((CONFIG.GRID_W-maxLen)/2));
    const padY=Math.max(0,Math.floor((CONFIG.GRID_H-font.lines.length)/2));
    const g=Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(' '));
    font.lines.forEach((line,y)=>{
      if(y+padY<CONFIG.GRID_H){
        const t=line.trimEnd();
        for(let x=0;x<t.length&&x+padX<CONFIG.GRID_W;x++) g[y+padY][x+padX]=t[x];
      }
    });
    return g;
  }
  function drawGrid(grid,color='#000'){
    ctx.fillStyle=color;
    for(let y=0;y<CONFIG.GRID_H;y++){
      for(let x=0;x<CONFIG.GRID_W;x++){
        const ch=grid[y][x];
        if(ch!==' ') ctx.fillText(ch,x*CONFIG.CELL_W,(y+1)*CONFIG.CELL_H);
      }
    }
  }
  
  // =======================
  //    ACTIVITY SYSTEM
  // =======================
  let activityGrid = Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(0));
  let transitionProgress = Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(0));
  function updateActivity(sourceGrid, targetGrid) {
    const newActivity = Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(0));
    for(let y=0;y<CONFIG.GRID_H;y++){
      for(let x=0;x<CONFIG.GRID_W;x++){
        if(sourceGrid[y][x] !== targetGrid[y][x]) newActivity[y][x]=1.0;
      }
    }
    for(let y=0;y<CONFIG.GRID_H;y++){
      for(let x=0;x<CONFIG.GRID_W;x++){
        let maxNeighbor=0;
        for(let dy=-1;dy<=1;dy++){
          for(let dx=-1;dx<=1;dx++){
            const ny=y+dy,nx=x+dx;
            if(ny>=0&&ny<CONFIG.GRID_H&&nx>=0&&nx<CONFIG.GRID_W){
              maxNeighbor=Math.max(maxNeighbor,activityGrid[ny][nx]);
            }
          }
        }
        const influence=maxNeighbor*CONFIG.NEIGHBOR_INFLUENCE*CONFIG.PROPAGATION_SPEED;
        newActivity[y][x]=Math.max(newActivity[y][x],influence);
        newActivity[y][x]=Math.max(newActivity[y][x],activityGrid[y][x]*CONFIG.ACTIVITY_DECAY);
      }
    }
    activityGrid=newActivity;
    for(let y=0;y<CONFIG.GRID_H;y++){
      for(let x=0;x<CONFIG.GRID_W;x++){
        const variance=(Perlin(x*0.1,y*0.1)+1)*0.5*CONFIG.LOCAL_VARIANCE;
        const localSpeed=1.0+variance*activityGrid[y][x];
        const increment=localSpeed*(1/60)*(1000/CONFIG.TRANSITION_BASE_MS);
        transitionProgress[y][x]=Math.min(1,transitionProgress[y][x]+increment);
      }
    }
  }
  
  // =======================
  //    ENHANCED TWEENING
  // =======================
  function createSmartTweener(sourceGrid, targetGrid) {
    const ladder = buildDynamicLadder(sourceGrid, targetGrid);
    const LUT = new Map([...ladder].map((ch,i)=>[ch,i]));
    const MAX_DENS = ladder.length - 1;
    const glyphIndex = ch => ch===' ' ? 0 : (LUT.has(ch) ? LUT.get(ch) : Math.floor(MAX_DENS*0.5));
    function tweenChar(a,b,progress,localActivity){
      if(a===b) return a;
      const ia=glyphIndex(a), ib=glyphIndex(b);
      const activityBoost=1+localActivity*0.5;
      const adjusted=Math.pow(clamp(progress*activityBoost,0,1),1.8);
      let idx;
      if(Math.abs(ib-ia)<=1) idx=Math.round(lerp(ia,ib,adjusted));
      else idx=Math.round(lerp(ia,ib,easeInOutCubic(adjusted)));
      return ladder[clamp(idx,0,MAX_DENS)];
    }
    return { tweenChar, ladder };
  }
  
  // =======================
  //        FIELDS
  // =======================
  function buildDistanceField(grid) {
    const H=CONFIG.GRID_H, W=CONFIG.GRID_W, INF=1e9;
    const d=Array.from({length:H},()=>Array(W).fill(INF));
    for(let y=0;y<H;y++){ for(let x=0;x<W;x++){ if(grid[y][x]!==' ') d[y][x]=0; } }
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        if(x>0) d[y][x]=Math.min(d[y][x],d[y][x-1]+1);
        if(y>0) d[y][x]=Math.min(d[y][x],d[y-1][x]+1);
        if(x>0&&y>0) d[y][x]=Math.min(d[y][x],d[y-1][x-1]+1.414);
        if(x<W-1&&y>0) d[y][x]=Math.min(d[y][x],d[y-1][x+1]+1.414);
      }
    }
    for(let y=H-1;y>=0;y--){
      for(let x=W-1;x>=0;x--){
        if(x<W-1) d[y][x]=Math.min(d[y][x],d[y][x+1]+1);
        if(y<H-1) d[y][x]=Math.min(d[y][x],d[y+1][x]+1);
        if(x<W-1&&y<H-1) d[y][x]=Math.min(d[y][x],d[y+1][x+1]+1.414);
        if(x>0&&y<H-1) d[y][x]=Math.min(d[y][x],d[y+1][x-1]+1.414);
      }
    }
    let max=0;
    for(let y=0;y<H;y++){ for(let x=0;x<W;x++){ if(d[y][x]<INF) max=Math.max(max,d[y][x]); } }
    const m=Math.max(1,max);
    return d.map(r=>r.map(v=>v>=INF?1: v/m));
  }
  function buildNoiseField(){
    const H=CONFIG.GRID_H, W=CONFIG.GRID_W;
    const s=CONFIG.NOISE_SCALE, oct=CONFIG.NOISE_OCTAVES;
    const f=Array.from({length:H},()=>Array(W).fill(0));
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        let amp=1, freq=1, sum=0, norm=0;
        for(let o=0;o<oct;o++){ sum += amp*((Perlin((x*s)*freq,(y*s)*freq)+1)/2); norm+=amp; amp*=0.5; freq*=2; }
        f[y][x]=sum/norm;
      }
    }
    return f;
  }
  function buildRippleField(){
    const H=CONFIG.GRID_H, W=CONFIG.GRID_W;
    const cx=W/2, cy=H/2, wl=CONFIG.RIPPLE_WAVELEN;
    const f=Array.from({length:H},()=>Array(W).fill(0));
    let max=0;
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const r=Math.hypot(x-cx,y-cy);
        const v=(r%wl);
        f[y][x]=v; if(v>max) max=v;
      }
    }
    const m=Math.max(1,max);
    return f.map(r=>r.map(v=>v/m));
  }
  function equalizeAndBlur(field){
    if(!CONFIG.EQUALIZE_FIELD) return field;
    const bins=256, hist=new Array(bins).fill(0); let total=0, H=field.length, W=field[0].length;
    for(let y=0;y<H;y++){ for(let x=0;x<W;x++){ const v=clamp(field[y][x],0,1); hist[Math.min(bins-1,(v*(bins-1))|0)]++; total++; } }
    if(total===0) return field;
    const cdf=new Array(bins).fill(0); let acc=0; for(let i=0;i<bins;i++){ acc+=hist[i]; cdf[i]=acc/total; }
    let out=field.map(r=>r.slice());
    for(let y=0;y<H;y++){ for(let x=0;x<W;x++){ const i=Math.min(bins-1,(clamp(field[y][x],0,1)*(bins-1))|0); out[y][x]=cdf[i]; } }
    if(CONFIG.FIELD_BLUR>0){
      for(let pass=0; pass<CONFIG.FIELD_BLUR; pass++){
        const blurred=out.map(r=>r.slice());
        for(let y=0;y<H;y++){
          for(let x=0;x<W;x++){
            let sum=0,count=0;
            for(let dy=-1;dy<=1;dy++){ for(let dx=-1;dx<=1;dx++){ const yy=y+dy,xx=x+dx; if(yy>=0&&yy<H&&xx>=0&&xx<W){ sum+=out[yy][xx]; count++; } } }
            blurred[y][x]=sum/count;
          }
        }
        out=blurred;
      }
    }
    return out;
  }
  
  // =======================
  //      JITTER
  // =======================
  const JITTER_MAP={
    '.':['·',':',',','*'],
    '-':['_','─','~','='],
    '#':['@','>','=','0'],
    '/':['|','/'],
    '\\':['|','\\'],
    '_':['-','_','='],
    '|':['!','|','l'],
    '@':['&','%','@'],
    '*':['+','*','x','✦'],
    'o':['○','●','◯','⊙'],
    'O':['○','●','◯','⊙','⬢']
  };
  function applyJitter(grid){
    const p=CONFIG.JITTER_PROB;
    return grid.map(row=>row.map(ch=>{
      if(Math.random()<p && JITTER_MAP[ch]) {
        const alternatives=JITTER_MAP[ch];
        return alternatives[(Math.random()*alternatives.length)|0];
      }
      return ch;
    }));
  }
  
  // =======================
  //        STATE
  // =======================
  let currentFont=fonts[0], nextFont=fonts[1], idx=1;
  let transitionType='organic';
  let transitionStart=0, transitionDuration=CONFIG.TRANSITION_BASE_MS, inTransition=false;
  let paused=false;
  let currentTweener=null;
  let fieldCache=null;
  
  // =======================
  //     TRANSITIONS
  // =======================
  function organicTransition(elapsed, sourceGrid, targetGrid) {
    const globalProgress = Math.min(1, elapsed / transitionDuration);
    updateActivity(sourceGrid, targetGrid);
    if(!currentTweener) currentTweener = createSmartTweener(sourceGrid, targetGrid);
    const output = Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(' '));
    for(let y=0;y<CONFIG.GRID_H;y++){
      for(let x=0;x<CONFIG.GRID_W;x++){
        const sourceChar=sourceGrid[y][x];
        const targetChar=targetGrid[y][x];
        const localProgress=transitionProgress[y][x];
        const localActivity=activityGrid[y][x];
        output[y][x]=currentTweener.tweenChar(sourceChar,targetChar,localProgress,localActivity);
      }
    }
    drawGrid(applyJitter(output));
  }
  function fieldBasedTransition(elapsed, sourceGrid, targetGrid, fieldType='distance'){
    if(!fieldCache){
      let rawField;
      if(fieldType==='distance') rawField=buildDistanceField(targetGrid);
      else if(fieldType==='noise') rawField=buildNoiseField();
      else if(fieldType==='ripple') rawField=buildRippleField();
      fieldCache = equalizeAndBlur(rawField);
    }
    if(!currentTweener) currentTweener=createSmartTweener(sourceGrid,targetGrid);
    const globalProgress = easeInOutCubic(elapsed / transitionDuration);
    const output = Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(' '));
    for(let y=0;y<CONFIG.GRID_H;y++){
      for(let x=0;x<CONFIG.GRID_W;x++){
        const sourceChar=sourceGrid[y][x], targetChar=targetGrid[y][x];
        if(sourceChar===' ' && targetChar===' '){ output[y][x]=' '; continue; }
        const fieldValue=fieldCache[y][x];
        const rampWidth=0.3;
        const localProgress=clamp((globalProgress - fieldValue) / rampWidth, 0, 1);
        output[y][x]=currentTweener.tweenChar(sourceChar,targetChar,localProgress,1.0);
      }
    }
    drawGrid(applyJitter(output));
  }
  
  // =======================
  //        LOOP
  // =======================
  function prepareTransition(){
    const sourceGrid=centerASCII(currentFont);
    const targetGrid=centerASCII(nextFont);
    activityGrid=Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(0));
    transitionProgress=Array.from({length:CONFIG.GRID_H},()=>Array(CONFIG.GRID_W).fill(0));
    currentTweener=null; fieldCache=null;
    return {sourceGrid, targetGrid};
  }
  let lastPrep=null;
  const TRANSITION_TYPES=['organic','distance_field','noise_field','ripple_field'];
  function animate(time){
    if(paused){ requestAnimationFrame(animate); return; }
    if(!transitionStart) transitionStart=time;
    if(!inTransition){
      inTransition=true;
      transitionStart=time;
      transitionDuration=CONFIG.TRANSITION_BASE_MS*(0.8+Math.random()*0.4);
      idx=(idx+1)%fonts.length;
      nextFont=fonts[idx];
      const weights=[0.4,0.2,0.2,0.2];
      const rand=Math.random(); let cumulative=0;
      for(let i=0;i<weights.length;i++){ cumulative+=weights[i]; if(rand<=cumulative){ transitionType=TRANSITION_TYPES[i]; break; } }
      lastPrep=prepareTransition();
      document.getElementById('info').textContent=`${currentFont.name} → ${nextFont.name} (${transitionType})`;
    }
    const elapsed=time-transitionStart;
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    if(transitionType==='organic') organicTransition(elapsed,lastPrep.sourceGrid,lastPrep.targetGrid);
    else if(transitionType==='distance_field') fieldBasedTransition(elapsed,lastPrep.sourceGrid,lastPrep.targetGrid,'distance');
    else if(transitionType==='noise_field') fieldBasedTransition(elapsed,lastPrep.sourceGrid,lastPrep.targetGrid,'noise');
    else if(transitionType==='ripple_field') fieldBasedTransition(elapsed,lastPrep.sourceGrid,lastPrep.targetGrid,'ripple');
    if(elapsed>transitionDuration+CONFIG.HOLD_MS){ inTransition=false; currentFont=nextFont; }
    requestAnimationFrame(animate);
  }
  
  // =======================
  //     CONTROLS
  // =======================
  window.addEventListener('keydown',(e)=>{
    if(e.code==='Space'){ paused=!paused; return; }
    if(e.key==='n'||e.key==='Enter'){ inTransition=false; return; }
    if(e.key==='['){ CONFIG.TRANSITION_BASE_MS=Math.max(800,CONFIG.TRANSITION_BASE_MS*0.8); inTransition=false; }
    if(e.key===']'){ CONFIG.TRANSITION_BASE_MS=Math.min(10000,CONFIG.TRANSITION_BASE_MS*1.25); inTransition=false; }
    if(e.key==='o'){ transitionType='organic'; inTransition=false; }
    if(e.key==='d'){ transitionType='distance_field'; inTransition=false; }
    if(e.key==='r'){ transitionType='ripple_field'; inTransition=false; }
    if(e.key==='f'){ transitionType='noise_field'; inTransition=false; }
    if(e.key==='i'){ const info=document.getElementById('info'); info.style.display=info.style.display==='none'?'block':'none'; }
    if(e.key==='q'){ CONFIG.NEIGHBOR_INFLUENCE=clamp(CONFIG.NEIGHBOR_INFLUENCE+0.1,0,1); }
    if(e.key==='a'){ CONFIG.NEIGHBOR_INFLUENCE=clamp(CONFIG.NEIGHBOR_INFLUENCE-0.1,0,1); }
    if(e.key==='w'){ CONFIG.PROPAGATION_SPEED=clamp(CONFIG.PROPAGATION_SPEED+0.05,0.05,0.5); }
    if(e.key==='s'){ CONFIG.PROPAGATION_SPEED=clamp(CONFIG.PROPAGATION_SPEED-0.05,0.05,0.5); }
  });
  
  // =======================
  //       PUBLIC API
  // =======================
  window.ASCIIMorph = {
    transitions: TRANSITION_TYPES.slice(),
    use(name){ if(TRANSITION_TYPES.includes(name)){ transitionType=name; inTransition=false; } },
    next(){ inTransition=false; },
    config(){ return JSON.parse(JSON.stringify(CONFIG)); },
    set(key,value){ if(key in CONFIG) CONFIG[key]=value; },
    addFont(name, ascii){
      const lines=ascii.replace(/\s+$/, '').split('\n').map(l=>l.padEnd(CONFIG.GRID_W,' '));
      fonts.push({name, lines});
    },
    say(ascii){
      this.addFont('live_'+(Date.now()%1e6), ascii);
      idx = fonts.length - 2;
      inTransition = false;
    },
    pause(){ paused=!paused; },
    getInfo(){
      return { currentFont: currentFont.name, nextFont: nextFont.name, transitionType, paused,
               progress: inTransition ? (Date.now()-transitionStart)/transitionDuration : 0 };
    }
  };
  
  // Start the animation
  requestAnimationFrame(animate);
  
  // Initialize info
  document.getElementById('info').textContent = `${currentFont.name} (ready)`;
  
  console.log('%cSmooth ASCII Morph Enhanced',
    'background:#000;color:#0f0;padding:4px 8px;border-radius:4px;font-family:monospace',
    '\n🎛️  Controls:',
    '\n   Space = pause/resume',
    '\n   N/Enter = next transition',
    '\n   [ ] = speed control',
    '\n   O = organic mode',
    '\n   D = distance field',
    '\n   R = ripple field',
    '\n   F = noise field',
    '\n   I = toggle info',
    '\n   Q/A = neighbor influence ±',
    '\n   W/S = propagation speed ±',
    '\n\n🔧 API:',
    '\n   ASCIIMorph.use("organic")',
    '\n   ASCIIMorph.say("YOUR\\nTEXT\\nHERE")',
    '\n   ASCIIMorph.set("TRANSITION_BASE_MS", 2000)'
  );