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
const availableRoles=['Design','Marketing','Research','Finance','Development','Content','Operations','Other']
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

export function Teams({go,embedded=false}:{go:(page:'apply'|'startups')=>void;embedded?:boolean}) {
  const t=useT()
  const {account,userEmail,submissions,userId,liveMode}=useModel()
  const {store,actor,commit}=useTeams()
  const [dialog,setDialog]=useState<'create'|'manage'|null>(null)
  const [selected,setSelected]=useState('')
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [projectId,setProject]=useState('')
  const [memberName,setMemberName]=useState('')
  const [role,setRole]=useState('Design')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{setDialog(null);setSelected('');setNotice('')},[actor])
  const mine=store.teams.filter(team=>team.ownerId===actor)
  const team=mine.find(team=>team.id===selected)
  const ownedProjects=submissions.filter(p=>p.ownerId===(liveMode?userId:'demo-student')||(!liveMode&&p.id.startsWith('student-')))
  const close=()=>{setDialog(null);setNotice('');setError('');setMemberName('')}
  const create=()=>{if(account!=='student'){go('apply');return}setName('');setDescription('');setProject('');setDialog('create')}
  return <section className={embedded?'workspace-section personal-teams':'shell page personal-teams'}>
    <div className="workspace-head"><h2>{t('My teams')}</h2><button className="primary" onClick={create}>{t('Create a team')} ＋</button></div>
    <p className="field-help">{t('Teams stay in this browser session.')}</p>
    {!mine.length&&<div className="workspace-empty"><h3>{t('No teams yet')}</h3><p>{t('Create a team and add the people working on your project.')}</p></div>}
    <div className="personal-team-list">{mine.map(row=><article key={row.id}><div><span className="community-monogram">{row.name.slice(0,2).toUpperCase()}</span><h3>{row.name}</h3><p>{row.description}</p><small>{row.members.length} {t('members')}</small></div><button className="secondary" onClick={()=>{setSelected(row.id);setDialog('manage')}}>{t('Manage team')}</button></article>)}</div>
    {dialog==='create'&&<AdminModal title={t('Create a team')} eyebrow="My teams" onClose={close}><form onSubmit={e=>{e.preventDefault();if(!name.trim()||!description.trim())return;const id=crypto.randomUUID();commit(data=>({...data,teams:[{id,ownerId:actor,name:name.trim(),description:description.trim(),field:'Other',roles:[],projectId:projectId||undefined,open:false,members:[{id:actor,name:t('You'),email:userEmail,role:'Founder',status:'member'}]},...data.teams]}));setSelected(id);setDialog('manage')}}><div className="modal-form-body"><label>{t('Team name')}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>{t('Description')}<textarea required rows={3} maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>{t('Connect a project (optional)')}<select value={projectId} onChange={e=>setProject(e.target.value)}><option value="">{t('No project yet')}</option>{ownedProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><div className="modal-form-actions"><button type="button" className="secondary" onClick={close}>{t('Cancel')}</button><button className="primary">{t('Create a team')}</button></div></form></AdminModal>}
    {dialog==='manage'&&team&&<AdminModal title={team.name} eyebrow="My teams" onClose={close}><form onSubmit={e=>{e.preventDefault();const normalized=memberName.trim();if(!normalized)return;commit(data=>({...data,teams:data.teams.map(row=>row.id===team.id&&row.ownerId===actor?{...row,members:[...row.members,{id:crypto.randomUUID(),name:normalized,email:'',role,status:'member'}]}:row)}));setMemberName('');setError('');setNotice('Team member added.')}}><div className="modal-form-body"><h3>{t('Team members')}</h3><div className="team-member-list">{team.members.map(member=><div key={member.id}><span className="team-member-avatar">{(member.name||member.email).slice(0,1).toUpperCase()}</span><div><strong>{member.name||member.email}</strong><small>{t(member.role === 'Other' ? 'Other role' : member.role)} · {t(member.status==='member'?'Member':'Invitation draft')}</small></div>{member.id!==actor&&<button type="button" className="inline-link" onClick={()=>commit(data=>({...data,teams:data.teams.map(row=>row.id===team.id&&row.ownerId===actor?{...row,members:row.members.filter(m=>m.id!==member.id)}:row)}))}>{t('Remove')}</button>}</div>)}</div><h3>{t('Add team member')}</h3><label>{t('Person’s name')}<input required value={memberName} maxLength={80} onChange={e=>setMemberName(e.target.value)}/></label><label>{t('Role in the team')}<select value={role} onChange={e=>setRole(e.target.value)}>{availableRoles.map(r=><option key={r} value={r}>{t(r === 'Other' ? 'Other role' : r)}</option>)}</select></label>{error&&<p role="alert" className="form-error">{t(error)}</p>}{notice&&<p role="status" className="draft-notice">{t(notice)}</p>}</div><div className="modal-form-actions"><button type="button" className="secondary" onClick={close}>{t('Done')}</button><button className="primary">{t('Add member')}</button></div></form></AdminModal>}
  </section>
}
