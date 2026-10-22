import { useT } from './model'

export function AboutSection({go}:{go:(page:'apply'|'teams'|'demo')=>void}) {
  const t=useT()
  return <section id="about" className="shell about-story">
    <div className="about-story-intro"><div><p className="eyebrow">{t('ABOUT OFE')}</p><h2>{t('Big things begin with a small “what if?”')}</h2><p>{t('OFE is SDU’s Office for Entrepreneurship. A starting point for students who want to turn curiosity into a project — in any field.')}</p><div className="about-field-tags">{['Education','Culture','Environment','Business','And your idea'].map(text=><span key={text}>{t(text)}</span>)}</div></div>
    <aside className="about-belief"><span className="about-belief-symbol" aria-hidden="true">✳</span><p>{t('You do not need all the answers. A question worth exploring is enough to begin.')}</p><small>{t('FOR CURIOUS PEOPLE. FROM EVERY FIELD.')}</small></aside></div>
    <div className="about-journey-heading"><h3>{t('From “what if” to “let’s try”.')}</h3><p>{t('A practical way to take your first steps. No complicated vocabulary required.')}</p></div>
    <ol className="about-journey">{[
      ['01','Notice something worth changing.','Start with an everyday problem. Who experiences it, and what could make it better?'],
      ['02','Find people who care too.','Different strengths make a better team. Look for a collaborator, not someone exactly like you.'],
      ['03','Try a small first version.','A sketch, a workshop, a simple service or a first product. Learn by trying something real.'],
      ['04','Share what you are building.','Create a project page, explain your idea and explore opportunities to present it to others.'],
    ].map(([n,title,description])=><li key={n}><span>{n}</span><h4>{t(title)}</h4><p>{t(description)}</p></li>)}</ol>
    <div className="about-questions"><div><p className="eyebrow">{t('BEFORE YOU START')}</p><h3>{t('You might be wondering…')}</h3><p>{t('It is okay to be at the beginning.')}</p></div><div className="about-faq">{[
      ['Do I need a finished project?','No. You can start with an idea. Describe the problem and who you want to help; you can develop the rest step by step.'],
      ['What if I am not from IT?','You belong here too. Education, design, business, culture and social initiatives all need people who want to create something useful.'],
      ['What if I do not have a team?','Explore open roles through Projects → Find a team, or create a team around your idea. You do not have to do everything alone.'],
    ].map(([question,answer])=><details key={question}><summary>{t(question)}<span aria-hidden="true">＋</span></summary><p>{t(answer)}</p></details>)}</div></div>
    <div className="about-next-step"><div><span>26 NOVEMBER · 2026</span><h3>SDU FOUNDERS CUP</h3><p>{t('A date to keep in mind. Explore the event page for details and updates.')}</p></div><button className="primary" onClick={()=>go('demo')}>{t('Explore the event')} ↗</button></div>
  </section>
}
