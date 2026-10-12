import http from 'node:http';
import crypto from 'node:crypto';
import {WebSocketServer} from 'ws';

type Mode='solo'|'squad';
type Vec={x:number;y:number;z:number};
type Player={id:string;name:string;team:number;bot:boolean;hp:number;shield:number;pos:Vec;alive:boolean;weapon:string;kills:number};
type Match={id:string;mode:Mode;region:string;createdAt:string;state:'waiting'|'running'|'ended';maxPlayers:number;botCount:number;players:Map<string,Player>;connections:Set<any>;tick:number};

const port=Number(process.env.PORT||4318);
const publicHost=process.env.PUBLIC_HOST||'127.0.0.1';
const publicPort=Number(process.env.PUBLIC_PORT||port);
const publicPathPrefix=(process.env.PUBLIC_PATH_PREFIX||'').replace(/\/$/,'');
const matches=new Map<string,Match>();
const weapons=['pulse_rifle','tactical_smg','pump_blaster','burst_carbine'];
const botNames=['Byte','Echo','Nova','Glitch','Vortex','Rift','Pixel','Orbit','Flux','Kilo','Rune','Zero','Skye','Ash','Bolt','Mira','Frost','Nox','Jinx','Lux'];
function json(res:http.ServerResponse,status:number,body:any){const data=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json','content-length':Buffer.byteLength(data)});res.end(data)}
function readBody(req:http.IncomingMessage){return new Promise<any>((resolve)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch{resolve({})}})})}
function rand(n:number){return Math.floor(Math.random()*n)}
function pos():Vec{return{x:Math.round((Math.random()*200-100)*10)/10,y:0,z:Math.round((Math.random()*200-100)*10)/10}}
function makeBot(i:number,team:number):Player{return{id:`bot_${crypto.randomUUID()}`,name:`H0RII Bot ${botNames[i%botNames.length]}`,team,bot:true,hp:100,shield:50,pos:pos(),alive:true,weapon:weapons[rand(weapons.length)],kills:0}}
function publicMatch(m:Match){return{id:m.id,mode:m.mode,region:m.region,state:m.state,maxPlayers:m.maxPlayers,botCount:m.botCount,players:[...m.players.values()].map(p=>({id:p.id,name:p.name,team:p.team,bot:p.bot,hp:p.hp,shield:p.shield,pos:p.pos,alive:p.alive,weapon:p.weapon,kills:p.kills})),createdAt:m.createdAt,connect:{wsPath:`${publicPathPrefix}/match/${m.id}`,host:publicHost,port:publicPort,secure:publicPort===443}}}
function createMatch(input:any):Match{const mode:Mode=input.mode==='squad'?'squad':'solo';const humanCount=Math.max(1,Math.min(4,Number(input.humanCount||1)));const targetBots=Math.max(1,Math.min(99,Number(input.botCount ?? (mode==='squad'?20:31))));const maxPlayers=humanCount+targetBots;const id=crypto.randomUUID();const m:Match={id,mode,region:String(input.region||'EU').toUpperCase(),createdAt:new Date().toISOString(),state:'running',maxPlayers,botCount:targetBots,players:new Map(),connections:new Set(),tick:0};const humanTeam=1;for(let i=0;i<humanCount;i++){m.players.set(`human_slot_${i+1}`,{id:`human_slot_${i+1}`,name:i===0?String(input.displayName||'Player'):`Squadmate ${i+1}`,team:humanTeam,bot:false,hp:100,shield:100,pos:pos(),alive:true,weapon:'starter_pistol',kills:0})}for(let i=0;i<targetBots;i++){const team=mode==='squad'?2+Math.floor(i/4):2+i;m.players.set(`bot_slot_${i+1}`,makeBot(i,team))}matches.set(id,m);return m}
function simulate(m:Match){
  m.tick++;
  const humans=[...m.players.values()].filter(p=>!p.bot&&p.alive);
  for(const p of m.players.values()){
    if(!p.alive||!p.bot)continue;
    p.pos.x+=Math.round((Math.random()*2-1)*10)/10;
    p.pos.z+=Math.round((Math.random()*2-1)*10)/10;
    if(Math.random()<0.015){
      const enemies=[...m.players.values()].filter(e=>e.alive&&e.team!==p.team);
      const target=enemies[rand(enemies.length)]||null;
      if(target){
        const dmg=rand(18)+7;
        if(target.shield>0)target.shield=Math.max(0,target.shield-dmg);else target.hp=Math.max(0,target.hp-dmg);
        if(target.hp<=0){target.alive=false;p.kills++}
      }
    }
  }
  const aliveTeams=new Set([...m.players.values()].filter(p=>p.alive).map(p=>p.team));
  if(aliveTeams.size<=1||humans.length===0)m.state='ended';
}
setInterval(()=>{for(const m of matches.values()){if(m.state==='running')simulate(m);const payload=JSON.stringify({type:'state',match:publicMatch(m),serverTime:new Date().toISOString()});for(const ws of m.connections){if(ws.readyState===1)ws.send(payload)}}},250);
setInterval(()=>{const cutoff=Date.now()-60*60_000;for(const [id,m] of matches){if(new Date(m.createdAt).getTime()<cutoff||m.state==='ended'&&m.connections.size===0)matches.delete(id)}},30_000);
const server=http.createServer(async(req,res)=>{const url=new URL(req.url||'/',`http://${req.headers.host||'127.0.0.1'}`);if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'horii-fn-game-server',runtime:'horii_native',modes:['solo','squad'],bots:true,matches:matches.size,publicHost,publicPort});if(req.method==='POST'&&url.pathname==='/matches'){const body=await readBody(req);const m=createMatch(body);return json(res,201,{match:publicMatch(m),playable:true,notice:'H0RII native runtime match allocated. This is an original prototype runtime, not Fortnite/Project Reboot.'})}if(req.method==='GET'&&url.pathname.startsWith('/matches/')){const id=url.pathname.split('/')[2];const m=matches.get(id);return m?json(res,200,{match:publicMatch(m)}):json(res,404,{error:'match_not_found'})}return json(res,404,{error:'not_found'})});
const wss=new WebSocketServer({server});wss.on('connection',(ws,req)=>{const id=(req.url||'').split('/').filter(Boolean)[1];const m=id?matches.get(id):null;if(!m){ws.close(1008,'match_not_found');return}m.connections.add(ws);ws.send(JSON.stringify({type:'hello',match:publicMatch(m),controls:{move:'send {type:"input",dx,dz}',shoot:'send {type:"input",shoot:true,targetId}'}}));ws.on('message',raw=>{try{const msg=JSON.parse(String(raw));const p=m.players.get('human_slot_1');if(!p||!p.alive)return;if(msg.type==='input'){p.pos.x+=Math.max(-5,Math.min(5,Number(msg.dx||0)));p.pos.z+=Math.max(-5,Math.min(5,Number(msg.dz||0)));if(msg.shoot&&msg.targetId){const t=m.players.get(String(msg.targetId));if(t&&t.alive&&t.team!==p.team){const dmg=25;if(t.shield>0)t.shield=Math.max(0,t.shield-dmg);else t.hp=Math.max(0,t.hp-dmg);if(t.hp<=0){t.alive=false;p.kills++}}}}}catch{}});ws.on('close',()=>m.connections.delete(ws))});
server.listen(port,'127.0.0.1',()=>console.log(`H0RII FN game server on 127.0.0.1:${port}`));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
