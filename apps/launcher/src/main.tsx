import React,{useEffect,useMemo,useState}from'react';
import{createRoot}from'react-dom/client';
import{invoke}from'@tauri-apps/api/core';
import'./style.css';

const DEFAULT_API='https://api.fn.horii.dev';

type BackendStatus={
  api:string;
  database:string;
  redis:string;
  fortniteCompatibility:string;
  rebootIntegration:string;
  remoteHosts?:{total:number;ready:number;stale:number;allocatable:number};
};

type ClientDiag={found?:boolean;path?:string|null;version?:string|null;message?:string;allowed_to_launch?:boolean;error?:string};

function friendlyError(error:string){
  const map:Record<string,string>={
    invalid_credentials:'Wrong email or password.',
    no_ready_project_reboot_host:'No remote Project Reboot host is verified ready yet.',
    project_reboot_unavailable:'Remote Project Reboot host is unavailable.',
    invalid_region:'Invalid matchmaking region.'
  };
  return map[error]||error;
}

function App(){
  const[api,setApi]=useState(localStorage.getItem('horii_fn_api')||DEFAULT_API);
  const[email,setEmail]=useState(localStorage.getItem('horii_fn_email')||'');
  const[password,setPassword]=useState('');
  const[token,setToken]=useState(localStorage.getItem('horii_fn_token')||'');
  const[user,setUser]=useState<any>(null);
  const[status,setStatus]=useState<BackendStatus|null>(null);
  const[diag,setDiag]=useState<ClientDiag|null>(null);
  const[session,setSession]=useState<any>(null);
  const[msg,setMsg]=useState('Ready.');
  const[busy,setBusy]=useState(false);

  const remoteReady=(status?.remoteHosts?.allocatable||0)>0;
  const clientDetected=diag?.found===true;
  const canPlay=!!token&&clientDetected&&remoteReady&&!busy;
  const lockReasons=useMemo(()=>{
    const r:string[]=[];
    if(!token)r.push('Log in with H0RII FN.');
    if(!clientDetected)r.push('Detect a compatible local Fortnite client.');
    if(!remoteReady)r.push('No verified remote Project Reboot host is ready on the VPS.');
    return r;
  },[token,clientDetected,remoteReady]);

  function saveApi(v:string){setApi(v);localStorage.setItem('horii_fn_api',v.replace(/\/$/,''))}

  async function check(){
    setBusy(true);setMsg('Checking backend...');
    try{
      const r=await fetch(`${api.replace(/\/$/,'')}/status`,{cache:'no-store'});
      const j=await r.json().catch(()=>({error:'bad_response'}));
      if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
      setStatus(j);setMsg(`Backend online. Remote hosts ready: ${j.remoteHosts?.allocatable??0}.`);
    }catch(e:any){setStatus(null);setMsg(`Backend check failed: ${e?.message||String(e)}`)}
    finally{setBusy(false)}
  }

  async function login(){
    setBusy(true);setMsg('Logging in...');setSession(null);
    try{
      const r=await fetch(`${api.replace(/\/$/,'')}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
      const j=await r.json().catch(()=>({error:'bad_response'}));
      if(!r.ok)throw new Error(friendlyError(j.error||'Login failed'));
      setToken(j.accessToken);setUser(j.user);localStorage.setItem('horii_fn_token',j.accessToken);localStorage.setItem('horii_fn_email',email);
      setMsg(`Logged in as ${j.user.displayName}.`);
      await check();
    }catch(e:any){setToken('');setUser(null);localStorage.removeItem('horii_fn_token');setMsg(e?.message||String(e))}
    finally{setBusy(false)}
  }

  async function detect(){
    setBusy(true);setMsg('Detecting local Fortnite install...');
    try{const d=await invoke<ClientDiag>('detect_fortnite_install');setDiag(d);setMsg(d.found?'Client detected. Waiting for verified remote host.':(d.message||'Client not found.'))}
    catch(e:any){setDiag({error:String(e)});setMsg('Diagnostics failed')}
    finally{setBusy(false)}
  }

  async function play(){
    if(!canPlay){setMsg(`PLAY locked: ${lockReasons.join(' ')}`);return}
    setBusy(true);setMsg('Requesting remote private match...');setSession(null);
    try{
      const r=await fetch(`${api.replace(/\/$/,'')}/matchmaking/queue`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({adapter:'project_reboot',region:'EU',allowMockFallback:false})});
      const j=await r.json().catch(()=>({error:'bad_response'}));
      if(!r.ok)throw new Error(friendlyError(j.error||j.health?.reason||`HTTP ${r.status}`));
      setSession(j);setMsg(`Remote session allocated: ${j.session?.connection?.host}:${j.session?.connection?.port}. Launch handoff is still blocked until Project Reboot client launch path is verified.`);
    }catch(e:any){setMsg(e?.message||String(e))}
    finally{setBusy(false)}
  }

  useEffect(()=>{check();detect();},[]);

  return <main>
    <aside>
      <h1>H0RII FN</h1>
      <label>API URL</label>
      <input value={api} onChange={e=>saveApi(e.target.value)} />
      <button disabled={busy} onClick={check}>Server status</button>
      <button disabled={busy} onClick={detect}>Detect local Fortnite</button>
      <button disabled={!canPlay} onClick={play}>PLAY</button>
      <p className={canPlay?'ok':'warn'}>{msg}</p>
      <p className="warn">Client-only mode: your PC does not host matches. PLAY requires H0RII backend + a verified remote Project Reboot host.</p>
      {!canPlay&&<ul>{lockReasons.map(x=><li key={x}>{x}</li>)}</ul>}
    </aside>
    <section>
      <h2>Login</h2>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button disabled={busy||!email||!password} onClick={login}>Login with H0RII FN</button>
      {user&&<p className="ok">Logged in: {user.displayName}</p>}

      <h2>Backend</h2>
      <pre>{JSON.stringify(status,null,2)}</pre>

      <h2>Client diagnostics</h2>
      <pre>{JSON.stringify(diag,null,2)}</pre>

      <h2>Session</h2>
      <pre>{JSON.stringify(session,null,2)}</pre>

      <p className="warn">No Epic auth, no binary downloads, no anti-cheat/DRM bypass. Real gameplay requires remote Project Reboot evidence: join, movement, building, editing and weapons.</p>
    </section>
  </main>
}

createRoot(document.getElementById('root')!).render(<App/>);
