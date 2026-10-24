import {useT} from './model'
const icons = [
 <><circle cx="12" cy="10" r="6"/><path d="m9 16 1 4h4l1-4M10 23h4M12 1V0M3 4l2 2M21 4l-2 2"/></>,
 <><circle cx="9" cy="8" r="3"/><circle cx="18" cy="10" r="2"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 15a5 5 0 0 1 6 5"/></>,
 <><path d="M3 4h18v12H9l-6 5V4Z"/><path d="M7 8h10M7 12h6"/></>,
 <><path d="M5 19 19 5M6 5h13v13M5 10v9h9"/></>,
]
export function AboutSection({go}:{go:(page:'apply'|'teams'|'demo')=>void}) {
 const t=useT()
 const services=[
 ['01','Explore projects','Browse student startups and learn about their ideas and progress.'],
 ['02','Your team','Add team members and their roles to your project workspace.'],
 ['03','Submit a project','Send your project for review and follow its application status.'],
 ['04','Events & Demo Day','View upcoming event details and photos from the first Demo Day.'],
 ]
 return <section id="about" className="shell about-story">
  <div className="about-story-intro reveal"><div><p className="eyebrow">SDU · OFE</p><h2>{t('About')}</h2><p>{t('OFE is SDU’s Office for Entrepreneurship. We help students develop ideas, build teams and present their projects.')}</p><a className="about-instagram" href="https://www.instagram.com/ofe_sdu/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg><span>Instagram · @ofe_sdu</span><span aria-hidden="true">↗</span></a></div><aside className="about-belief"><div className="about-belief-top"><span className="about-belief-symbol" aria-hidden="true">✳</span><span>{t('Office for Entrepreneurship')}</span></div><h3>{t('From idea to project')}</h3><div className="about-path"><span>{t('Idea')}</span><i aria-hidden="true">↗</i><span>{t('Team')}</span><i aria-hidden="true">↗</i><span>{t('Project')}</span></div></aside></div>
  <div className="about-journey-heading reveal"><h3>{t('On the platform')}</h3></div>
  <ol className="about-journey">{services.map(([n,title,description],index)=><li key={n} className="reveal"><div className="about-service-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[index]}</svg><span>{n}</span></div><h4>{t(title)}</h4><p>{t(description)}</p></li>)}</ol>
  <div className="about-next-step reveal"><div><span>{t('26 November · 2026')}</span><h3>SDU FOUNDERS CUP</h3></div><button className="primary" onClick={()=>go('demo')}>{t('Explore the event')} ↗</button></div>
 </section>
}
