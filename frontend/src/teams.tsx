import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useModel, useT } from './model'
import { AdminModal } from './flows'

export type TeamMember = { id:string; name:string; email:string; role:string; status:'member'|'invited' }
export type Team = { id:string; ownerId:string; name:string; description:string; field:string; roles:string[]; members:TeamMember[]; projectId?:string; open:boolean; sample?:boolean }
export type JoinRequest = { id:string; teamId:string; userId:string; name:string; email:string; role:string; message:string; status:'pending'|'accepted'|'declined' }
type Store = {teams:Team[];requests:JoinRequest[]}
const samples:Team[] = [
  {id:'sample-arts',ownerId:'sample-a',name:'Art Together',description:'Creative workshops and pop-up exhibitions for students.',field:'Arts & culture',roles:['Design','Marketing'],members:[{id:'a',name:'A',email:'',role:'Founder',status:'member'}],open:true,sample:true},
  {id:'sample-green',ownerId:'sample-b',name:'Green Campus',description:'Making everyday campus life a little more sustainable.',field:'Climate',roles:['Research','Operations','Finance'],members:[{id:'b',name:'B',email:'',role:'Founder',status:'member'}],open:true,sample:true},
  {id:'sample-study',ownerId:'sample-c',name:'Study Circle',description:'Peer learning and friendly study groups across different subjects.',field:'EdTech',roles:['Content','Development'],members:[{id:'c',name:'C',email:'',role:'Founder',status:'member'}],open:true,sample:true},
]
const availableRoles=['Design','Marketing','Research','Finance','Development','Content','Operations']
function readStore(actor:string):Store {
  try {const data=JSON.parse(sessionStorage.getItem(`ofe:teams:v1:${actor}`)||'null');if(data && Array.isArray(data.teams)&&Array.isArray(data.requests))return data}catch{}
  return {teams:samples,requests:[]}
}
const TeamContext=createContext({store:{teams:samples,requests:[]} as Store, actor:'visitor', commit:(_change:(store:Store)=>Store)=>{}})
export function TeamProvider({children}:{children:ReactNode}) {
  const {userId,account}=useModel()
  const actor=userId ?? (account==='student'?'demo-student':'visitor')
  const [state,setState]=useState(()=>({actor,store:readStore(actor)}))
  useEffect(()=>{setState({actor,store:readStore(actor)})},[actor])
  const store=state.actor===actor?state.store:readStore(actor)
  const commit=(change:(store:Store)=>Store)=>setState(previous=>{
    const next=change(previous.actor===actor?previous.store:readStore(actor))
    try{sessionStorage.setItem(`ofe:teams:v1:${actor}`,JSON.stringify(next))}catch{}
    return {actor,store:next}
  })
  return <TeamContext.Provider value={{store,actor,commit}}>{children}</TeamContext.Provider>
}
export const useTeams=()=>useContext(TeamContext)

export function Teams({go}:{go:(page:'apply'|'startups')=>void}) {
  const t=useT()
  const {account,userEmail,submissions,userId,liveMode}=useModel()
  const {store,actor,commit}=useTeams()
  const [tab,setTab]=useState<'discover'|'mine'>('discover')
  const [search,setSearch]=useState('')
  const [role,setRole]=useState('All')
  const [dialog,setDialog]=useState<'create'|'manage'|'join'|'login'|null>(null)
  const [selected,setSelected]=useState('')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [field,setField]=useState('Other')
  const [roles,setRoles]=useState<string[]>([])
  const [projectId,setProject]=useState('')
  const [memberName,setMemberName]=useState('')
  const [email,setEmail]=useState('')
  const [memberRole,setMemberRole]=useState('Design')
  const [message,setMessage]=useState('')
  useEffect(()=>{setDialog(null);setNotice('');setTab('discover')},[actor])
  const mine=store.teams.filter(team=>team.ownerId===actor || team.members.some(m=>m.email && m.email.toLowerCase()===userEmail.toLowerCase()&&m.status==='member'))
  const team=store.teams.find(team=>team.id===selected)
  const ownedProjects=submissions.filter(p=>p.ownerId===(liveMode?userId:'demo-student') || (!liveMode&&p.id.startsWith('student-')))
  const shown=(tab==='mine'?mine:store.teams.filter(team=>team.open)).filter(team=>(role==='All'||team.roles.includes(role))&&[team.name,t(team.description),t(team.field),...team.roles.map(t)].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const close=()=>{setDialog(null);setError('');setEmail('');setMemberName('');setMessage('')}
  const openCreate=()=>{setError('');if(account!=='student'){setDialog('login');return}setName('');setDescription('');setRoles([]);setProject('');setDialog('create')}
  const addInvite=(team:Team)=>{
    const normalized=email.trim().toLowerCase()
    if(team.ownerId!==actor)return
    if(team.members.some(m=>m.email.toLowerCase()===normalized)){setError('This person is already a member or has an invitation.');return}
    const member:TeamMember={id:crypto.randomUUID(),name:memberName.trim(),email:normalized,role:memberRole,status:'invited'}
    commit(data=>({...data,teams:data.teams.map(row=>row.id===team.id?{...row,members:[...row.members,member]}:row)}))
    setEmail('');setMemberName('');setError('');setNotice('Invitation saved as a draft. No email has been sent.')
  }
  return <main className="shell page teams-page">
    <div className="community-page-head"><div><p className="eyebrow">SDU · COMMUNITY</p><h1>{t('Good ideas need good people.')}</h1><p>{t('Find a team that needs your strengths, or bring people together around your own idea.')}</p></div><button className="primary" onClick={openCreate}>{t('Create a team')}<span aria-hidden="true">＋</span></button></div>
    <div className="team-demo-note">{t('Team preview: invitations and requests are saved in this browser session. They are not sent to other people yet.')}</div>
    <div className="team-overview"><div><span>{t('Open teams')}</span><strong>{store.teams.filter(team=>team.open).length}</strong></div><div><span>{t('Different strengths')}</span><strong>{availableRoles.length}</strong></div><div><span>{t('Your teams')}</span><strong>{mine.length}</strong></div></div>
    <div className="community-toolbar"><div className="community-tabs"><button className={tab==='discover'?'active':''} aria-pressed={tab==='discover'} onClick={()=>{setTab('discover');setSearch('');setRole('All')}}>{t('Find a team')}</button><button className={tab==='mine'?'active':''} aria-pressed={tab==='mine'} onClick={()=>{setTab('mine');setSearch('');setRole('All')}}>{t('My teams')} · {mine.length}</button></div><button className="inline-link" onClick={()=>go('startups')}>{t('Explore projects')} ↗</button></div>
    <div className="community-search"><span aria-hidden="true">⌕</span><input aria-label={t('Search teams')} placeholder={t('Search by team, idea or field…')} value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label={t('Choose a role')} value={role} onChange={e=>setRole(e.target.value)}><option value="All">{t('All roles')}</option>{availableRoles.map(r=><option key={r} value={r}>{t(r)}</option>)}</select></div>
    {notice && <div className="admin-notice" role="status"><span>{t(notice)}</span><button aria-label={t('Close')} onClick={()=>setNotice('')}>×</button></div>}
    <div className="team-card-grid">{shown.map(team=>{
      const requested=store.requests.some(r=>r.teamId===team.id&&r.userId===actor&&r.status==='pending')
      const isMine=team.ownerId===actor
      const isMember=team.members.some(m=>m.status==='member'&&(m.id===actor||Boolean(userEmail&&m.email.toLowerCase()===userEmail.toLowerCase())))
      return <article className="team-card" key={team.id}><div className="team-card-top"><span className="community-monogram">{team.name.slice(0,2).toUpperCase()}</span><span className="team-open-tag">{t(team.sample?'Sample team':team.open?'Looking for people':'Team complete')}</span></div><span className="community-field">{t(team.field)}</span><h2>{team.name}</h2><p>{t(team.description)}</p><div className="team-roles"><small>{t('We are looking for')}</small><div>{team.roles.map(r=><span key={r}>{t(r)}</span>)}{!team.roles.length&&<span>{t('No open roles')}</span>}</div></div><div className="team-card-bottom"><span>{team.members.filter(m=>m.status==='member').length} {t('members')}</span><button className="secondary" disabled={!isMine&&(requested||isMember)} onClick={()=>{setSelected(team.id);setError('');setMemberName('');setEmail(userEmail);setMessage('');setMemberRole(team.roles[0]||'Design');setDialog(account!=='student'?'login':isMine?'manage':'join')}}>{t(isMine?'Manage team':isMember?'Already a member':requested?'Request pending':'I am interested')}<span aria-hidden="true">↗</span></button></div></article>
    })}</div>
    {!shown.length&&<div className="community-empty"><span aria-hidden="true">◇</span><h2>{t(tab==='mine'&&!mine.length?'Your team can start here.':'No teams match your search.')}</h2><p>{t(tab==='mine'&&!mine.length?'Bring together people with different strengths. Start with a name and a simple idea.':'Try another role or clear your search.')}</p><div className="button-row"><button className="primary" onClick={openCreate}>{t('Create a team')}</button><button className="secondary" onClick={()=>{setSearch('');setRole('All');setTab('discover')}}>{t('Find a team')}</button></div></div>}
    {dialog==='login'&&<AdminModal title={t('Your next step starts with an account.')} eyebrow="SDU COMMUNITY" onClose={close}><div className="modal-form-body"><p>{t('Sign in to create a team, invite people or send a request to join.')}</p><button className="primary" onClick={()=>{close();go('apply')}}>{t('Sign in')}</button></div></AdminModal>}
    {dialog==='create'&&<AdminModal title={t('Bring your team together.')} eyebrow="Your team" onClose={close}><form onSubmit={e=>{e.preventDefault();if(!name.trim()||!description.trim())return;const next:Team={id:crypto.randomUUID(),ownerId:actor,name:name.trim(),description:description.trim(),field,roles,projectId:projectId||undefined,open:true,members:[{id:actor,name:t('You'),email:userEmail,role:'Founder',status:'member'}]};commit(data=>({...data,teams:[next,...data.teams]}));setSelected(next.id);setTab('mine');setNotice('Team created in this preview. Add your first invitation.');setDialog('manage')}}><div className="modal-form-body"><label>{t('Team name')}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder={t('A name people will remember')}/></label><label>{t('What brings your team together?')}<textarea required rows={3} maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} placeholder={t('What are you creating, and who could help?')}/></label><label>{t('Industry')}<select value={field} onChange={e=>setField(e.target.value)}>{['Other','Arts & culture','EdTech','HealthTech','Climate','Food & hospitality','Social impact','Retail & services','SaaS'].map(r=><option key={r} value={r}>{t(r)}</option>)}</select></label><label>{t('Connect a project (optional)')}<select value={projectId} onChange={e=>setProject(e.target.value)}><option value="">{t('No project yet')}</option>{ownedProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><fieldset className="role-choices"><legend>{t('Who would you like to meet?')}</legend>{availableRoles.map(r=><label key={r}><input type="checkbox" checked={roles.includes(r)} onChange={e=>setRoles(e.target.checked?[...roles,r]:roles.filter(x=>x!==r))}/><span>{t(r)}</span></label>)}</fieldset></div><div className="modal-form-actions"><button type="button" className="secondary" onClick={close}>{t('Cancel')}</button><button className="primary" disabled={!name.trim()||!description.trim()}>{t('Create a team')}</button></div></form></AdminModal>}
    {dialog==='manage'&&team&&team.ownerId===actor&&<AdminModal title={team.name} eyebrow="Your team" onClose={close}><form onSubmit={e=>{e.preventDefault();addInvite(team)}}><div className="modal-form-body"><div className="team-manage-setting"><div><strong>{t('Looking for people')}</strong><p>{t('Show this team in the team directory.')}</p></div><label className="team-switch"><input type="checkbox" aria-label={t('Show team in directory')} checked={team.open} onChange={e=>commit(data=>({...data,teams:data.teams.map(row=>row.id===team.id?{...row,open:e.target.checked}:row)}))}/></label></div><h3>{t('Team members')}</h3><div className="team-member-list">{team.members.map(member=><div key={member.id}><span className="team-member-avatar">{(member.name||member.email).slice(0,1).toUpperCase()}</span><div><strong>{member.name||member.email}</strong>{member.email&&<small>{member.email}</small>}<small>{t(member.role)} · {t(member.status==='member'?'Member':'Invitation draft')}</small></div>{member.id!==actor&&<button type="button" className="inline-link" onClick={()=>commit(data=>({...data,teams:data.teams.map(row=>row.id===team.id?{...row,members:row.members.filter(m=>m.id!==member.id)}:row)}))}>{t('Remove')}</button>}</div>)}</div><fieldset className="role-choices"><legend>{t('Who would you like to meet?')}</legend>{availableRoles.map(r=><label key={r}><input type="checkbox" checked={team.roles.includes(r)} onChange={e=>commit(data=>({...data,teams:data.teams.map(row=>row.id===team.id?{...row,roles:e.target.checked?[...row.roles,r]:row.roles.filter(x=>x!==r)}:row)}))}/><span>{t(r)}</span></label>)}</fieldset>
      <section className="team-request-list"><h3>{t('Requests to join')}</h3>{store.requests.filter(r=>r.teamId===team.id&&r.status==='pending').length ? store.requests.filter(r=>r.teamId===team.id&&r.status==='pending').map(request=><article key={request.id}><strong>{request.name}</strong><small>{t(request.role)}</small><p>{request.message}</p><div className="button-row"><button type="button" className="secondary" onClick={()=>commit(data=>({...data,requests:data.requests.map(r=>r.id===request.id?{...r,status:'accepted'}:r),teams:data.teams.map(row=>row.id===team.id?{...row,members:row.members.some(m=>m.email.toLowerCase()===request.email.toLowerCase())?row.members.map(m=>m.email.toLowerCase()===request.email.toLowerCase()?{...m,status:'member',name:request.name,role:request.role}:m):[...row.members,{id:request.userId,name:request.name,email:request.email,role:request.role,status:'member'}]}:row)}))}>{t('Accept')}</button><button type="button" className="inline-link" onClick={()=>commit(data=>({...data,requests:data.requests.map(r=>r.id===request.id?{...r,status:'declined'}:r)}))}>{t('Decline')}</button></div></article>):<p className="field-help">{t('No requests yet.')}</p>}</section>
      <h3>{t('Invite someone')}</h3><p className="field-help">{t('Save their email and role. They become a member only after accepting an invitation.')}</p><label>{t('Person’s name')}<input value={memberName} maxLength={80} onChange={e=>setMemberName(e.target.value)} placeholder={t('Name (optional)')}/></label><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label><label>{t('Role in the team')}<select value={memberRole} onChange={e=>setMemberRole(e.target.value)}>{availableRoles.map(r=><option key={r} value={r}>{t(r)}</option>)}</select></label>{error&&<p role="alert" className="form-error">{t(error)}</p>}{notice&&<p role="status" className="team-modal-notice">{t(notice)}</p>}</div><div className="modal-form-actions"><button type="button" className="secondary" onClick={close}>{t('Done')}</button><button className="primary">{t('Add invitation')}</button></div></form></AdminModal>}
    {dialog==='join'&&team&&<AdminModal title={`${t('Join')} ${team.name}`} eyebrow="Find your people" onClose={close}><form onSubmit={e=>{e.preventDefault();if(!memberName.trim()||!message.trim())return;const request:JoinRequest={id:crypto.randomUUID(),teamId:team.id,userId:actor,name:memberName.trim(),email:email.trim().toLowerCase(),role:memberRole,message:message.trim(),status:'pending'};commit(data=>data.requests.some(r=>r.teamId===team.id&&r.userId===actor&&r.status==='pending')?data:{...data,requests:[...data.requests,request]});close();setNotice('Request saved as a draft. The team has not been notified yet.')}}><div className="modal-form-body"><p>{t(team.description)}</p><label>{t('Your name')}<input required maxLength={80} value={memberName} onChange={e=>setMemberName(e.target.value)}/></label><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>{t('I can help with')}<select value={memberRole} onChange={e=>setMemberRole(e.target.value)}>{(team.roles.length?team.roles:availableRoles).map(r=><option key={r} value={r}>{t(r)}</option>)}</select></label><label>{t('A few words about you')}<textarea required rows={4} maxLength={500} value={message} onChange={e=>setMessage(e.target.value)} placeholder={t('Tell the team what interests you and what you would like to contribute.')}/></label><p className="field-help">{t('This is a preview. Your message will not be sent yet.')}</p></div><div className="modal-form-actions"><button type="button" className="secondary" onClick={close}>{t('Cancel')}</button><button className="primary" disabled={!memberName.trim()||!message.trim()}>{t('Save join request')}</button></div></form></AdminModal>}
  </main>
}
