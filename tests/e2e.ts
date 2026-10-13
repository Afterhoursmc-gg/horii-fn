import 'dotenv/config';import {spawn} from 'node:child_process';
const port=process.env.TEST_PORT||'4317';
const runtimePort=process.env.TEST_RUNTIME_PORT||'4318';
const base=`http://127.0.0.1:${port}`;
const runtimeBase=`http://127.0.0.1:${runtimePort}`;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function req(path:string,opts:any={}){const r=await fetch(base+path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})},body:opts.body?JSON.stringify(opts.body):undefined});const j=await r.json().catch(()=>({}));return {r,j}}
async function runtimeReq(path:string,opts:any={}){const r=await fetch(runtimeBase+path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})},body:opts.body?JSON.stringify(opts.body):undefined});const j=await r.json().catch(()=>({}));return {r,j}}
async function waitHttp(url:string){for(let i=0;i<80;i++){try{const r=await fetch(url);if(r.ok)return}catch{}await wait(250)}throw new Error('timeout '+url)}
async function main(){
 const runtime=spawn(process.execPath,['--import','tsx','apps/game-server/src/server.ts'],{stdio:'inherit',env:{...process.env,PORT:runtimePort,PUBLIC_HOST:'127.0.0.1',PUBLIC_PORT:runtimePort}});
 const api=spawn(process.execPath,['--import','tsx','apps/api/src/server.ts'],{stdio:'inherit',env:{...process.env,PORT:port,HORII_RUNTIME_URL:runtimeBase,HOST_BOOTSTRAP_TOKEN:'test_bootstrap',HOST_AGENT_SECRET:'test_host_secret'}});
 try{await waitHttp(runtimeBase+'/health');await waitHttp(base+'/health');
 const suffix=Date.now();
 let a=await req('/auth/register',{method:'POST',body:{email:`a${suffix}@fn.local`,password:'Passw0rd!aa',displayName:'PlayerA'}}); if(!a.r.ok)throw new Error('register a '+JSON.stringify(a.j));
 let b=await req('/auth/register',{method:'POST',body:{email:`b${suffix}@fn.local`,password:'Passw0rd!bb',displayName:'PlayerB'}}); if(!b.r.ok)throw new Error('register b '+JSON.stringify(b.j));
 const ah={authorization:`Bearer ${a.j.accessToken}`}; const bh={authorization:`Bearer ${b.j.accessToken}`};
 let profile=await req('/me',{headers:ah}); if(!profile.r.ok)throw new Error('profile failed');
 let locker=await req('/locker/equip',{method:'POST',headers:ah,body:{cosmeticId:'outfit_horii_runner'}}); if(!locker.r.ok)throw new Error('locker failed '+JSON.stringify(locker.j));
 let fr=await req('/friends/request',{method:'POST',headers:ah,body:{email:`b${suffix}@fn.local`}}); if(!fr.r.ok)throw new Error('friend request failed '+JSON.stringify(fr.j));
 let list=await req('/friends',{headers:bh}); const pending=list.j.friends[0]; if(!pending)throw new Error('missing pending friend');
 let acc=await req(`/friends/${pending.id}/accept`,{method:'POST',headers:bh}); if(!acc.r.ok)throw new Error('accept failed '+JSON.stringify(acc.j));
 let party=await req('/parties',{method:'POST',headers:ah,body:{privacy:'friends'}}); if(!party.r.ok)throw new Error('party failed '+JSON.stringify(party.j));
 let solo=await req('/matchmaking/queue',{method:'POST',headers:ah,body:{region:'EU',adapter:'horii_runtime',mode:'solo',botCount:7}}); if(!solo.r.ok||!solo.j.playable||solo.j.session.connection.mode!=='solo'||solo.j.session.connection.botCount!==7)throw new Error('solo runtime allocation failed '+JSON.stringify(solo.j));
 let soloRuntime=await runtimeReq(`/matches/${solo.j.session.connection.matchId}`); if(!soloRuntime.r.ok||soloRuntime.j.match.players.filter((p:any)=>p.bot).length!==7)throw new Error('solo runtime match missing bots '+JSON.stringify(soloRuntime.j));
 let squad=await req('/matchmaking/queue',{method:'POST',headers:ah,body:{region:'EU',adapter:'horii_runtime',mode:'squad',humanCount:4,botCount:12,partyId:party.j.party.id}}); if(!squad.r.ok||!squad.j.playable||squad.j.session.connection.mode!=='squad'||squad.j.session.connection.botCount!==12)throw new Error('squad runtime allocation failed '+JSON.stringify(squad.j));
 let status=await req('/status'); if(!status.r.ok||status.j.primaryRuntime!=='chapter1_legacy'||!status.j.horiiRuntime?.ok||status.j.playableVerified!==false||!status.j.ogfnBackend)throw new Error('status did not show chapter1 legacy + ogfn backend state '+JSON.stringify(status.j));
 let rebootNoServer=await req('/matchmaking/queue',{method:'POST',headers:ah,body:{region:'EU',adapter:'project_reboot'}}); if(rebootNoServer.r.status!==503)throw new Error('expected reboot unavailable without registered healthy server');
 let reg=await req('/hosts/register',{method:'POST',headers:{'x-host-bootstrap-token':'test_bootstrap'},body:{name:'Test Local Reboot Host',region:'EU',baseUrl:'http://127.0.0.1:3551',publicHost:'127.0.0.1',publicPort:7777,supportedVersions:['10.31'],clientVersion:'10.31',diagnostics:{test:true},agentVersion:'test'}}); if(!reg.r.ok)throw new Error('host register failed '+JSON.stringify(reg.j));
 const hh={authorization:`Bearer ${reg.j.hostToken}`};
 let hbBad=await req('/hosts/heartbeat',{method:'POST',headers:hh,body:{readyState:'not_ready',verifiedCompatible:false,capacityTotal:1,capacityAvailable:0,health:{backendOk:false}}}); if(!hbBad.r.ok||hbBad.j.allocatable!==false)throw new Error('bad heartbeat should not be allocatable '+JSON.stringify(hbBad.j));
 let diag=await req(`/sessions/${solo.j.session.id}/diagnostics`,{headers:ah}); if(!diag.r.ok||diag.j.playableVerified!==false)throw new Error('diagnostics failed '+JSON.stringify(diag.j));
 console.log(JSON.stringify({ok:true,flow:'account-friends-party-horii_runtime_solo_squad_bots-project_reboot_legacy_unavailable',solo:solo.j.session.connection,squad:squad.j.session.connection},null,2));
 } finally {api.kill('SIGTERM');runtime.kill('SIGTERM')}
}
main().catch(e=>{console.error(e);process.exit(1)})
