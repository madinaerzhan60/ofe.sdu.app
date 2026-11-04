import React,{useContext} from 'react'
import {createRoot} from 'react-dom/client'
import {usePlatform} from './backend'
import {ThemeToggle} from './theme'
import {AppContext,translations} from './model'
import {useLanguage} from './use-language'
import './translations'
import {ArchiveGallery} from './archive-gallery'
import {ArchiveWinners} from './archive-winners'
import './archive.css'
import './brand-theme.css'
function safeLink(value?:string){try{const url=new URL(value||'');return ['http:','https:'].includes(url.protocol)?url.href:undefined}catch{return undefined}}
function Archive(){
 const [lang,setLang]=useLanguage()
 const defaults=useContext(AppContext)
 const t=(text:string)=>lang==='EN'?text:translations[text]?.[lang==='RU'?0:1]??text
 const {events,submissions,authLoading,error}=usePlatform([],[])
 const archive=events.find(event=>event.id==='archive'&&event.published)
 const finalists=archive?.finalists??[]
 return <AppContext.Provider value={{...defaults,lang}}><header><a className="brand" href="/"><img src="/sdu-entrepreneurship-emblem.png" alt={t('SDU Office for Entrepreneurship')}/>{t('SDU · Entrepreneurship')}</a><div className="archive-header-actions"><ThemeToggle/><div className="archive-language" role="group" aria-label={t('Language selector')}>{(['KK','RU','EN'] as const).map(value=><button key={value} type="button" aria-pressed={lang===value} onClick={()=>setLang(value)}>{value}</button>)}</div><a className="back" href="/">{t('Back to OFE')} →</a></div></header>
 <main><section className="archive-hero"><div className="edition">{t('THE FIRST CHAPTER')}<span>2026 / DEMO DAY</span></div><div className="chapter-art" aria-hidden="true">01</div><h1>Demo Day<span className="archive-year">2026</span></h1><div className="hero-bottom"><a href="#winners">{t('Meet the teams')} ↓</a></div></section>
 <ArchiveGallery t={t}/>
 <ArchiveWinners t={t} projects={[...finalists,...submissions.filter(p=>p.status==="Approved"&&p.publication&&p.visible!==false).map(p=>({id:p.id,name:p.name,description:p.about||p.description,members:p.team,website:p.product}))]}/>
 {finalists.length>0&&<section className="finalists" id="finalists"><div className="section-heading"><div><span>{t('FROM THE DEMO DAY STAGE')}</span><h2>{t('The projects & teams')}</h2></div><span className="finalist-count">{String(finalists.length).padStart(2,'0')}</span></div>{authLoading?<p role="status">{t('Loading finalists…')}</p>:error?<p role="alert">{t('We couldn’t load the finalists. Please refresh and try again.')}</p>:!finalists.length?<div className="coming-soon"><span>{t('THE STORY CONTINUES')}</span><h3>{t('Meet the finalists soon.')}</h3><p>{t('Startup stories, teams and event highlights will appear here as the archive is added.')}</p></div>:<div className="finalist-grid">{finalists.map((row,index)=><article key={row.id}><div className="project-cover">{safeLink(row.image)?<img src={safeLink(row.image)} alt={row.name} loading="lazy"/>:<span>{row.name.slice(0,2).toUpperCase()}</span>}<b>{String(index+1).padStart(2,'0')}</b></div><div className="project-copy"><span>{t('FINALIST')}</span><h3>{row.name}</h3><p>{row.description}</p><div className="project-members">{row.members}</div>{safeLink(row.website)&&<a href={safeLink(row.website)} target="_blank" rel="noopener noreferrer">{t('Visit startup')} ↗</a>}</div></article>)}</div>}</section>}</main>
</AppContext.Provider>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Archive/></React.StrictMode>)
