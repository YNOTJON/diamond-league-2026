const teams = [
["Arizona Diamondbacks","Chase Field",109],["Athletics","Sutter Health Park",133],["Atlanta Braves","Truist Park",144],["Baltimore Orioles","Oriole Park at Camden Yards",110],["Boston Red Sox","Fenway Park",111],
["Chicago Cubs","Wrigley Field",112],["Chicago White Sox","Rate Field",145],["Cincinnati Reds","Great American Ball Park",113],["Cleveland Guardians","Progressive Field",114],["Colorado Rockies","Coors Field",115],
["Detroit Tigers","Comerica Park",116],["Houston Astros","Daikin Park",117],["Kansas City Royals","Kauffman Stadium",118],["Los Angeles Angels","Angel Stadium",108],["Los Angeles Dodgers","Dodger Stadium",119],
["Miami Marlins","loanDepot park",146],["Milwaukee Brewers","American Family Field",158],["Minnesota Twins","Target Field",142],["New York Mets","Citi Field",121],["New York Yankees","Yankee Stadium",147],
["Philadelphia Phillies","Citizens Bank Park",143],["Pittsburgh Pirates","PNC Park",134],["San Diego Padres","Petco Park",135],["San Francisco Giants","Oracle Park",137],["Seattle Mariners","T-Mobile Park",136],
["St. Louis Cardinals","Busch Stadium",138],["Tampa Bay Rays","Tropicana Field",139],["Texas Rangers","Globe Life Field",140],["Toronto Blue Jays","Rogers Centre",141],["Washington Nationals","Nationals Park",120]
];
const $ = id => document.getElementById(id);
const home = $("homeTeam"), away = $("awayTeam"), park = $("ballpark");
teams.forEach((t,i)=>{home.add(new Option(t[0],i));away.add(new Option(t[0],i));park.add(new Option(t[1],i));});
home.value = "18"; away.value = "21"; park.value = "18";
function syncPark(){park.value=home.value;$("stadiumName").textContent=teams[park.value][1];}
home.addEventListener("change",syncPark); park.addEventListener("change",()=>{$("stadiumName").textContent=teams[park.value][1]});
$("stadiumName").textContent=teams[park.value][1];

const canvas=$("field"), ctx=canvas.getContext("2d");
let mode="bat", running=false, target={x:.5,y:.51}, pitch=null, pitchTime=0, pitchResult="", balls=0,strikes=0,outs=0,runs=0,swings=0,gamepadSeen=false,lastButtons=[];
const pitchSpeeds={"4-Seam Fastball":96,"Sinker":93,"Cutter":90,"Slider":85,"Curveball":79,"Changeup":83,"Splitter":86};
function toast(s){$("toast").textContent=s}
function updateScore(){$("count").textContent=`${balls} - ${strikes}`;$("runs").textContent=runs;$("outs").textContent=`${outs} OUT`}
function resizeCanvas(){const r=canvas.getBoundingClientRect();const d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.width*9/16*d);ctx.setTransform(canvas.width/960,0,0,canvas.height/540,0,0);draw()}
window.addEventListener("resize",resizeCanvas);
function draw(){
 const c=ctx; c.clearRect(0,0,960,540);
 // Original stylized ballpark illustration
 const sky=c.createLinearGradient(0,0,0,280);sky.addColorStop(0,"#16364b");sky.addColorStop(1,"#6a9c9c");c.fillStyle=sky;c.fillRect(0,0,960,540);
 c.fillStyle="#102a3b";c.fillRect(0,140,960,78);
 // stands, crowd dots
 for(let y=151;y<215;y+=10){for(let x=8;x<960;x+=13){c.fillStyle=["#e7b16a","#7fc7c7","#d6e3e8","#9c8bd1","#df795f"][((x*3+y*7)%5)];c.globalAlpha=.72;c.fillRect(x,y,7,4)}}c.globalAlpha=1;
 // outfield and warning track
 c.fillStyle="#b7a27c";c.beginPath();c.moveTo(480,215);c.lineTo(870,340);c.lineTo(730,500);c.lineTo(230,500);c.lineTo(90,340);c.closePath();c.fill();
 c.fillStyle="#287b4e";c.beginPath();c.moveTo(480,220);c.lineTo(845,340);c.lineTo(710,475);c.lineTo(250,475);c.lineTo(115,340);c.closePath();c.fill();
 // grass stripes
 c.save();c.beginPath();c.moveTo(480,220);c.lineTo(845,340);c.lineTo(710,475);c.lineTo(250,475);c.lineTo(115,340);c.closePath();c.clip();
 for(let i=0;i<12;i++){c.fillStyle=i%2?"#2d8553":"#246f47";c.fillRect(80+i*75,210,40,300)}c.restore();
 // infield diamond
 c.fillStyle="#b87850";c.beginPath();c.moveTo(480,300);c.lineTo(650,380);c.lineTo(480,460);c.lineTo(310,380);c.closePath();c.fill();
 c.fillStyle="#347e4b";c.beginPath();c.moveTo(480,320);c.lineTo(625,380);c.lineTo(480,440);c.lineTo(335,380);c.closePath();c.fill();
 // bases + mound
 c.fillStyle="#d5b28a";c.beginPath();c.arc(480,380,27,0,Math.PI*2);c.fill();
 c.fillStyle="#f4f0df";[[480,310],[610,380],[480,450],[350,380]].forEach(([x,y])=>{c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillRect(-7,-7,14,14);c.restore()});
 // foul lines
 c.strokeStyle="#f3ead1";c.lineWidth=2;c.beginPath();c.moveTo(480,490);c.lineTo(115,340);c.moveTo(480,490);c.lineTo(845,340);c.stroke();
 // batter + pitcher simple vector figures
 drawPlayer(432,455,"#e6f0f4",false);drawPlayer(480,375,"#d5f0f7",true);
 // batter's box + strike zone overlay
 c.strokeStyle="#f7f3df";c.lineWidth=2;c.strokeRect(390,422,65,70);
 c.strokeStyle="#d5f3ff";c.setLineDash([6,5]);c.strokeRect(405,416,70,76);c.setLineDash([]);
 c.fillStyle="#d8eff5";c.font="700 12px Inter";c.fillText("STRIKE ZONE",406,409);
 // target reticle relative to strike zone
 const tx=405+target.x*70,ty=416+target.y*76;
 c.strokeStyle="#c5f36b";c.lineWidth=3;c.beginPath();c.arc(tx,ty,13,0,Math.PI*2);c.moveTo(tx-20,ty);c.lineTo(tx+20,ty);c.moveTo(tx,ty-20);c.lineTo(tx,ty+20);c.stroke();
 // pitch path and ball
 if(pitch){let p=Math.min(1,(performance.now()-pitchTime)/pitch.duration);let bx=480+(tx-480)*p,by=375+(ty-375)*p;c.fillStyle="#fff";c.beginPath();c.arc(bx,by,8,0,Math.PI*2);c.fill();c.strokeStyle="#d95757";c.lineWidth=1.5;c.beginPath();c.moveTo(bx-4,by-3);c.lineTo(bx+4,by+3);c.moveTo(bx-4,by+3);c.lineTo(bx+4,by-3);c.stroke();if(p>=1){/* resolved by the pitch timer below */}}
 // HUD label
 c.fillStyle="#061925d9";c.fillRect(20,20,245,50);c.fillStyle="#c5f36b";c.font="800 11px Inter";c.fillText(mode==="bat"?"BATTING PRACTICE":"PITCHING PRACTICE",34,39);c.fillStyle="#e8f3f8";c.font="600 12px Inter";c.fillText(teams[home.value][0]+"  vs  "+teams[away.value][0],34,57);
 if(pitchResult){c.fillStyle="#061925d9";c.fillRect(650,20,285,42);c.fillStyle="#fff";c.font="800 14px Inter";c.fillText(pitchResult,666,46)}
 // little mobile prompt
 c.fillStyle="#f3f8fb";c.globalAlpha=.75;c.font="600 10px Inter";c.fillText("DRAG TARGET • SWING WITH BUTTONS",24,520);c.globalAlpha=1;
}
function drawPlayer(x,y,color,pitcher){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-23,8,0,Math.PI*2);ctx.fill();ctx.fillRect(-7,-16,14,26);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-3,8);ctx.lineTo(-8,23);ctx.moveTo(3,8);ctx.lineTo(8,23);ctx.moveTo(-6,-10);ctx.lineTo(-17,0);ctx.moveTo(6,-10);ctx.lineTo(17,-3);ctx.stroke();if(!pitcher){ctx.strokeStyle="#c5f36b";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(14,-5);ctx.lineTo(28,-25);ctx.stroke()}ctx.restore()}
function reset(){balls=0;strikes=0;outs=0;runs=0;swings=0;pitch=null;pitchResult="";updateScore();draw();toast("Ready — choose a swing or throw a pitch")}
function start(){running=true;pitchResult="";toast(mode==="bat"?"Aim with the target, then swing as the ball arrives":"Choose a pitch and press THROW PITCH");draw()}
function countStrike(){strikes++;if(strikes>=3){outs++;strikes=0;balls=0;pitchResult="STRIKEOUT";toast("Strike three — batter out");}else{pitchResult="STRIKE";toast("Strike! Aim and try again")};updateScore();draw()}
function countBall(){balls++;if(balls>=4){runs++;balls=0;strikes=0;pitchResult="WALK";toast("Ball four — walk");}else{pitchResult="BALL";toast("Ball — watch the zone")};updateScore();draw()}
function swing(kind){
 if(!running)start();
 if(mode==="pitch"){throwPitch();return}
 if(pitch){return}
 swings++;
 // Simulated timing grade and aim quality
 const aimDist=Math.hypot(target.x-.5,target.y-.5);
 const timing=Math.random();
 if(kind==="bunt"){if(timing>.24){pitchResult="BUNT FOUL";strikes=Math.min(2,strikes+1);toast("Bunt foul — keep the count");}else{pitchResult="BUNT IN PLAY";toast("Bunt in play!");runs+=Math.random()>.82?1:0;} }
 else if(timing>.82){pitchResult=kind==="power"?"HOME RUN!":"GREAT CONTACT!";runs+=kind==="power"?2:1;toast(kind==="power"?"Crushed! Home run!":"Solid contact — run scored");}
 else if(timing>.55){pitchResult=aimDist<.22?"LINE DRIVE":"FLY BALL";if(aimDist<.22){runs++;toast("Squared it up — hit!")}else{outs++;toast("Ball in play — caught");}}
 else if(timing>.28){pitchResult="FOUL BALL";strikes=Math.min(2,strikes+1);toast("Foul ball")}
 else{pitchResult="SWING & MISS";strikes++;if(strikes>=3){outs++;strikes=0;balls=0;toast("Strike three — batter out")}else toast("Swing and a miss")}
 updateScore();draw();
}
function throwPitch(){
 if(!running)start();
 if(pitch)return;
 const name=$("pitchType").value,speed=pitchSpeeds[name]||90;
 pitch={duration:Math.max(420,1200-(speed-75)*15),name};pitchTime=performance.now();pitchResult=name.toUpperCase();
 toast(`${name} — ${speed} MPH (prototype estimate)`);
 draw();
 // In pitching practice, resolved pitch gives simple feedback after travel
 setTimeout(()=>{if(pitch){pitch=null;if(mode==="pitch"){const accuracy=1-Math.hypot(target.x-.5,target.y-.5);pitchResult=accuracy>.75?"DOT! PERFECT LOCATION":accuracy>.45?"GOOD LOCATION":"WILD PITCH";toast(pitchResult);if(accuracy<.25)countBall();else draw()}else{const inside=target.x>.18&&target.x<.82&&target.y>.12&&target.y<.88;if(inside){if(Math.random()>.58)countStrike();else countBall()}else countBall();}},Math.max(500,1200-(speed-75)*15)+50);
}
$("startGame").addEventListener("click",start);
$("normalHit").addEventListener("click",()=>swing("normal"));
$("powerHit").addEventListener("click",()=>swing("power"));
$("buntHit").addEventListener("click",()=>swing("bunt"));
$("pitchBtn").addEventListener("click",throwPitch);
$("resetGame").addEventListener("click",reset);
document.querySelectorAll(".mode").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x===b));toast(mode==="bat"?"Batting mode selected":"Pitching mode selected");draw()}));
// Drag/touch target: touch works on mobile, mouse works on desktop.
let dragging=false;
function moveTarget(e){const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*960,y=(e.clientY-r.top)/r.height*540;target.x=Math.max(0,Math.min(1,(x-405)/70));target.y=Math.max(0,Math.min(1,(y-416)/76));draw()}
canvas.addEventListener("pointerdown",e=>{dragging=true;canvas.setPointerCapture(e.pointerId);moveTarget(e)});
canvas.addEventListener("pointermove",e=>{if(dragging)moveTarget(e)});
canvas.addEventListener("pointerup",()=>dragging=false);canvas.addEventListener("pointercancel",()=>dragging=false);
// Keyboard shortcuts
window.addEventListener("keydown",e=>{if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName))return;const k=e.key.toLowerCase();if(k==="x")swing("normal");if(k==="q")swing("power");if(k==="w")swing("bunt");if(k===" "){e.preventDefault();throwPitch()}if(k==="arrowleft")target.x=Math.max(0,target.x-.04);if(k==="arrowright")target.x=Math.min(1,target.x+.04);if(k==="arrowup")target.y=Math.max(0,target.y-.04);if(k==="arrowdown")target.y=Math.min(1,target.y+.04);draw()});
// Standard Gamepad API: PS4 controller generally maps X=0, circle=1, square=2, triangle=3; browser/OS mappings can differ.
function pollGamepad(){
 const pads=navigator.getGamepads?navigator.getGamepads():[];let found=false;
 for(const p of pads){if(!p)continue;found=true;
   const ax=p.axes[0]||0,ay=p.axes[1]||0;
   if(Math.abs(ax)>.25)target.x=Math.max(0,Math.min(1,target.x+ax*.012));
   if(Math.abs(ay)>.25)target.y=Math.max(0,Math.min(1,target.y+ay*.012));
   const pressed=i=>!!(p.buttons[i]&&p.buttons[i].pressed);
   if(pressed(0)&&!lastButtons[0])swing("normal");
   if(pressed(2)&&!lastButtons[2])swing("power");
   if(pressed(3)&&!lastButtons[3])swing("bunt");
   if(pressed(1)&&!lastButtons[1])throwPitch();
   if(pressed(4)&&!lastButtons[4]){const s=$("pitchType");s.selectedIndex=(s.selectedIndex+s.options.length-1)%s.options.length}
   if(pressed(5)&&!lastButtons[5]){const s=$("pitchType");s.selectedIndex=(s.selectedIndex+1)%s.options.length}
   lastButtons=p.buttons.map(b=>b.pressed);
 }
 $("controllerStatus").textContent=found?"Controller: connected":"Controller: connect PS4 via Bluetooth/USB";
 gamepadSeen=found;draw();requestAnimationFrame(pollGamepad);
}
window.addEventListener("gamepadconnected",()=>{$("controllerStatus").textContent="Controller: connected"});
window.addEventListener("gamepaddisconnected",()=>{$("controllerStatus").textContent="Controller: disconnected"});
$("loadRoster").addEventListener("click",async()=>{
 const team=teams[home.value],rosterType=$("rosterSelect").value;
 $("rosterStatus").textContent="Loading 2026 roster…";$("rosterList").innerHTML="";
 try{
  const url=`https://statsapi.mlb.com/api/v1/teams/${team[2]}/roster?rosterType=${rosterType}&season=2026`;
  const res=await fetch(url);if(!res.ok)throw new Error("Roster API unavailable");
  const data=await res.json();const players=data.roster||[];
  $("rosterStatus").textContent=`${players.length} players returned for ${team[0]} (2026)`;
  $("rosterList").innerHTML=players.map(p=>`<div class="player"><span>${escapeHtml(p.person?.fullName||"Unknown player")}</span><small>${escapeHtml(p.position?.abbreviation||"—")}</small></div>`).join("")||"No roster data returned.";
 }catch(err){$("rosterStatus").textContent="Could not load roster. Open via Live Server and check internet access."; $("rosterList").innerHTML='<small>Roster service may be unavailable or blocked by the browser. The game remains playable.</small>'}
});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
resizeCanvas();updateScore();requestAnimationFrame(pollGamepad);
