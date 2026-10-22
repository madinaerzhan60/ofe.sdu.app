import { useT } from './model'

export function AboutSection({go}:{go:(page:'apply'|'teams'|'demo')=>void}) {
  const t=useT()
  return <section id="about" className="shell about-story">
    <div className="about-story-intro"><div><p className="eyebrow">SDU · OFE</p><h2>{t('About')}</h2><p>{t('OFE supports student innovation, commercialises technological solutions and accelerates project teams.')}</p></div><aside className="about-belief"><span className="about-belief-symbol" aria-hidden="true">✳</span><h3>{t('Our aim')}</h3><p>{t('Student innovation. Technology with a future. Teams ready to grow.')}</p></aside></div>
    <div className="about-journey-heading"><h3>{t('What we do')}</h3></div>
    <ol className="about-journey">{[
      ['01','Idea validation','Turn a promising thought into a problem worth solving. Talk to future users, test your assumptions and discover what people really need.'],
      ['02','Founder support','Build with people who have been there. Learn from mentors and experienced entrepreneurs as you work through your next steps.'],
      ['03','Community','Find your people. Meet ambitious students from different fields, share ideas and connect with future collaborators and co-founders.'],
      ['04','Market access',"Take your idea beyond campus. Explore connections with investors, partners and Kazakhstan's startup ecosystem."],
    ].map(([n,title,description])=><li key={n}><span>{n}</span><h4>{t(title)}</h4><p>{t(description)}</p></li>)}</ol>
    <div className="about-next-step"><div><span>26 NOVEMBER · 2026</span><h3>SDU FOUNDERS CUP</h3></div><button className="primary" onClick={()=>go('demo')}>{t('Explore the event')} ↗</button></div>
  </section>
}
