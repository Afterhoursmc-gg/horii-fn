import 'dotenv/config';import {spawn} from 'node:child_process';
const port=process.env.TEST_PORT||'4317';
const base=`http://127.0.0.1:${port}`;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function req(path:string,opts:any={}){const r=await fetch(base+path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})},body:opts.body?JSON.stringify(opts.body):undefined});const j=await r.json().catch(()=>({}));return {r,j}}
async function waitApi(){for(let i=0;i<80;i++){try{const {r}=await req('/health');if(r.ok)return}catch{}await wait(250)}throw new Error('api timeout')}
async function main(){
 const api=spawn(process.execPath,['--import','tsx','apps/api/src/server.ts'],{stdio:'inherit',env:{...process.env,PORT:port,HOST_BOOTSTRAP_TOKEN:'test_bootstrap',HOST_AGENT_SECRET:'test_host_secret'}});try{await waitApi();
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
 let rebootNoServer=await req('/matchmaking/queue',{method:'POST',headers:ah,body:{region:'EU',adapter:'project_reboot'}}); if(rebootNoServer.r.status!==503)throw new Error('expected reboot unavailable without registered healthy server');
 let reg=await req('/hosts/register',{method:'POST',headers:{'x-host-bootstrap-token':'test_bootstrap'},body:{name:'Test Local Reboot Host',region:'EU',baseUrl:'http://127.0.0.1:3551',publicHost:'127.0.0.1',publicPort:7777,supportedVersions:['10.31'],clientVersion:'10.31',diagnostics:{test:true},agentVersion:'test'}}); if(!reg.r.ok)throw new Error('host register failed '+JSON.stringify(reg.j));
 const hh={authorization:`Bearer ${reg.j.hostToken}`};
 let hbBad=await req('/hosts/heartbeat',{method:'POST',headers:hh,body:{readyState:'not_ready',verifiedCompatible:false,capacityTotal:1,capacityAvailable:0,health:{backendOk:false}}}); if(!hbBad.r.ok||hbBad.j.allocatable!==false)throw new Error('bad heartbeat should not be allocatable '+JSON.stringify(hbBad.j));
 let stillNo=await req('/matchmaking/queue',{method:'POST',headers:ah,body:{region:'EU',adapter:'project_reboot'}}); if(stillNo.r.status!==503)throw new Error('not-ready host allocated unexpectedly');
 let hbGood=await req('/hosts/heartbeat',{method:'POST',headers:hh,body:{readyState:'ready',verifiedCompatible:true,capacityTotal:1,capacityAvailable:1,baseUrl:'http://127.0.0.1:3551',publicHost:'127.0.0.1',publicPort:7777,supportedVersions:['10.31'],clientVersion:'10.31',health:{backendOk:true,gamePortOpen:true,fortniteDetected:true},diagnostics:{testReady:true}}}); if(!hbGood.r.ok||hbGood.j.allocatable!==true)throw new Error('ready heartbeat should be allocatable '+JSON.stringify(hbGood.j));
 let realAlloc=await req('/matchmaking/queue',{method:'POST',headers:ah,body:{region:'EU',adapter:'project_reboot',partyId:party.j.party.id}}); if(!realAlloc.r.ok||realAlloc.j.mock)throw new Error('ready host allocation failed '+JSON.stringify(realAlloc.j));
 let mm=await req('/matchmaking/queue',{method:'POST',headers:ah,body:{region:'NA',adapter:'project_reboot',allowMockFallback:true,partyId:party.j.party.id}}); if(!mm.r.ok||!mm.j.mock)throw new Error('mock fallback failed '+JSON.stringify(mm.j));
 let diag=await req(`/sessions/${mm.j.session.id}/diagnostics`,{headers:ah}); if(!diag.r.ok||diag.j.playableVerified!==false)throw new Error('diagnostics failed '+JSON.stringify(diag.j));
 console.log(JSON.stringify({ok:true,flow:'account-locker-friends-party-project_reboot_unavailable-mock_fallback-session_diagnostics',session:mm.j.session.id},null,2));
 } finally {api.kill('SIGTERM')}
}
main().catch(e=>{console.error(e);process.exit(1)})
