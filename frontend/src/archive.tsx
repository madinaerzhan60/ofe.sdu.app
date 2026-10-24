import React,{useContext} from 'react'
import {createRoot} from 'react-dom/client'
import {usePlatform} from './backend'
import {ThemeToggle} from './theme'
import {AppContext,translations} from './model'
import {useLanguage} from './use-language'
import './translations'
import './archive.css'
import './brand-theme.css'
function safeLink(value?:string){try{const url=new URL(value||'');return ['http:','https:'].includes(url.protocol)?url.href:undefined}catch{return undefined}}
function Archive(){
 const [lang,setLang]=useLanguage()
 const defaults=useContext(AppContext)
 const t=(text:string)=>lang==='EN'?text:translations[text]?.[lang==='RU'?0:1]??text
 const {events,authLoading,error}=usePlatform([],[])
 const archive=events.find(event=>event.id==='archive'&&event.published)
 const finalists=archive?.finalists??[]
 return <AppContext.Provider value={{...defaults,lang}}><header><a className="brand" href="/"><img src="/sdu-entrepreneurship-emblem.png" alt={t('SDU Office for Entrepreneurship')}/>{t('SDU · Entrepreneurship')}</a><div className="archive-header-actions"><ThemeToggle/><div className="archive-language" role="group" aria-label={t('Language selector')}>{(['KK','RU','EN'] as const).map(value=><button key={value} type="button" aria-pressed={lang===value} onClick={()=>setLang(value)}>{value}</button>)}</div><a className="back" href="/">{t('Back to OFE')} →</a></div></header>
 <main><section className="archive-hero"><div className="edition">{t('THE FIRST CHAPTER')}<span>01 / DEMO DAY</span></div><h1>{t('Small beginnings.')}<br/><em>{t('Extraordinary ideas.')}</em></h1><div className="hero-bottom"><p>{t('Our first Demo Day brought student founders and their ideas into the spotlight. Meet last year’s finalists and discover what they are building.')}</p><a href="#finalists">{t('Explore the finalists')} ↓</a></div><div className="edition-art" aria-hidden="true">01</div></section>
 <div className="archive-event-gallery"><figure className="archive-event-photo"><img src="/first-demo-day-awards.jpg" alt={t('Group photo at the SDU Demo Day award ceremony')} width="6000" height="3368" loading="lazy"/></figure></div>
 <section className="finalists" id="finalists"><div className="section-heading"><div><span>{t('THE FOUNDERS & THEIR STARTUPS')}</span><h2>{t('Last year’s finalists')}</h2></div><span className="finalist-count">{String(finalists.length).padStart(2,'0')}</span></div>{authLoading?<p role="status">{t('Loading finalists…')}</p>:error?<p role="alert">{t('We couldn’t load the finalists. Please refresh and try again.')}</p>:!finalists.length?<div className="coming-soon"><span>{t('THE STORY CONTINUES')}</span><h3>{t('Meet the finalists soon.')}</h3><p>{t('Startup stories, teams and event highlights will appear here as the archive is added.')}</p></div>:<div className="finalist-grid">{finalists.map((row,index)=><article key={row.id}><div className="project-cover">{safeLink(row.image)?<img src={safeLink(row.image)} alt={row.name} loading="lazy"/>:<span>{row.name.slice(0,2).toUpperCase()}</span>}<b>{String(index+1).padStart(2,'0')}</b></div><div className="project-copy"><span>{t('FINALIST')}</span><h3>{row.name}</h3><p>{row.description}</p><div className="project-members">{row.members}</div>{safeLink(row.website)&&<a href={safeLink(row.website)} target="_blank" rel="noopener noreferrer">{t('Visit startup')} ↗</a>}</div></article>)}</div>}</section></main>
 <footer><strong>{t('Ideas start here.')}</strong><span>{t('SDU Office for Entrepreneurship')}</span><a href="/">{t('Back to the community')} →</a></footer></AppContext.Provider>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Archive/></React.StrictMode>)
