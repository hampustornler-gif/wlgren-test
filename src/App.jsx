
import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const C = {
  bg:'#0f0f0f', card:'#1a1a1a', border:'#2a2a2a', text:'#e5e7eb', muted:'#9ca3af', green:'#22c55e'
}
const ui = {
  app:{minHeight:'100vh',background:C.bg,color:C.text,fontFamily:'Inter,system-ui,sans-serif'},
  wrap:{maxWidth:1200,margin:'0 auto',padding:24},
  card:{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20},
  input:{width:'100%',padding:'12px 14px',borderRadius:10,border:`1px solid ${C.border}`,background:'#111',color:'#fff',outline:'none'},
  btn:{padding:'12px 16px',borderRadius:10,border:'none',background:C.green,color:'#000',fontWeight:800,cursor:'pointer'},
  btn2:{padding:'10px 14px',borderRadius:10,border:`1px solid ${C.border}`,background:'#222',color:'#fff',cursor:'pointer'},
  nav:{display:'flex',gap:10,flexWrap:'wrap',margin:'18px 0'}
}

function Badge({role}){ return <span style={{padding:'4px 10px',borderRadius:999,fontSize:12,background:role==='admin'?'#7c3aed33':role==='trainer'?'#2563eb33':'#22c55e33',color:'#fff'}}>{role}</span> }

export default function App(){
  const [session,setSession]=useState(null)
  const [profile,setProfile]=useState(null)
  const [view,setView]=useState('dashboard')
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')
  const [authMode,setAuthMode]=useState('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [fullName,setFullName]=useState('')
  const [users,setUsers]=useState([])
  const [clients,setClients]=useState([])
  const [workouts,setWorkouts]=useState([])
  const [measurements,setMeasurements]=useState([])

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data || null)
    return data || null
  }

  const loadDashboard = async (p) => {
    if (!p) return
    const { data: w } = await supabase.from('workouts').select('*').eq('user_id', p.id).order('date', { ascending: false }).limit(5)
    const { data: m } = await supabase.from('body_measurements').select('*').eq('user_id', p.id).order('date', { ascending: false }).limit(5)
    setWorkouts(w || [])
    setMeasurements(m || [])
    if (p.role === 'trainer' || p.role === 'admin') {
      const { data: c } = await supabase.from('trainer_clients').select('profiles!trainer_clients_client_id_fkey(id, full_name, email)').eq('trainer_id', p.id)
      setClients((c || []).map(r => r.profiles).filter(Boolean))
    }
    if (p.role === 'admin') {
      const { data: u } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(u || [])
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session || null
      setSession(s)
      if (s?.user) await loadProfile(s.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s?.user) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (profile) loadDashboard(profile) }, [profile])

  const auth = async () => {
    setErr('')
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErr(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      if (error) setErr(error.message)
    }
  }

  const signOut = async () => supabase.auth.signOut()
  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)
    if (!error) await loadProfile(profile.id)
  }

  if (loading) return <div style={{padding:24,color:'#fff'}}>Laddar...</div>

  if (!session) return (
    <div style={{...ui.app,display:'grid',placeItems:'center',padding:24}}>
      <div style={{...ui.card,width:'100%',maxWidth:440}}>
        <h1 style={{color:C.green,margin:0}}>GymLog</h1>
        <p style={{color:C.muted,marginTop:8}}>Logga in eller skapa konto.</p>
        {err ? <div style={{color:'#fca5a5',marginBottom:12}}>{err}</div> : null}
        {authMode === 'register' && <input style={{...ui.input,marginBottom:10}} placeholder="Namn" value={fullName} onChange={e => setFullName(e.target.value)} />}
        <input style={{...ui.input,marginBottom:10}} placeholder="E-post" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={{...ui.input,marginBottom:12}} placeholder="Lösenord" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <div style={{display:'flex',gap:10}}>
          <button style={ui.btn} onClick={auth}>{authMode === 'login' ? 'Logga in' : 'Skapa konto'}</button>
          <button style={ui.btn2} onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Registrera' : 'Till login'}</button>
        </div>
      </div>
    </div>
  )

  const Dashboard = () => {
    if (!profile) return <div style={ui.card}>Ingen profil hittad.</div>
    if (profile.role === 'admin') {
      return <div style={ui.card}>
        <h2>Admin-dashboard</h2>
        <p style={{color:C.muted}}>Användare: {users.length}</p>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',marginTop:12}}>
            <thead><tr><th align="left">Namn</th><th align="left">E-post</th><th align="left">Roll</th></tr></thead>
            <tbody>{users.map(u => <tr key={u.id}><td>{u.full_name || '–'}</td><td>{u.email}</td><td><Badge role={u.role} /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    }
    if (profile.role === 'trainer') {
      return <div style={ui.card}>
        <h2>Tränardashboard</h2>
        <p style={{color:C.muted}}>Klienter: {clients.length}</p>
        <ul>{clients.map(c => <li key={c.id}>{c.full_name || c.email}</li>)}</ul>
      </div>
    }
    return <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
      <div style={ui.card}><h3>Pass</h3><div style={{fontSize:28,color:C.green}}>{workouts.length}</div></div>
      <div style={ui.card}><h3>Mätningar</h3><div style={{fontSize:28,color:C.green}}>{measurements.length}</div></div>
      <div style={ui.card}><h3>Roll</h3><Badge role={profile.role} /></div>
    </div>
  }

  const ProfilePage = () => <div style={ui.card}>
    <h2>Profil</h2>
    <input style={{...ui.input,marginBottom:12}} value={fullName || profile.full_name || ''} onChange={e => setFullName(e.target.value)} />
    <button style={ui.btn} onClick={saveProfile}>Spara</button>
  </div>

  return <div style={ui.app}>
    <div style={ui.wrap}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
        <div>
          <h1 style={{margin:0,color:C.green}}>GymLog</h1>
          <div style={{color:C.muted}}>{profile?.full_name || session.user.email} <Badge role={profile?.role || 'client'} /></div>
        </div>
        <button style={ui.btn2} onClick={signOut}>Logga ut</button>
      </div>
      <div style={ui.nav}>
        <button style={ui.btn2} onClick={() => setView('dashboard')}>Dashboard</button>
        <button style={ui.btn2} onClick={() => setView('profile')}>Profil</button>
      </div>
      {view === 'dashboard' && <Dashboard />}
      {view === 'profile' && <ProfilePage />}
    </div>
  </div>
}
