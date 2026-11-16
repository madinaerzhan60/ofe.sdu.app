import { isPublic } from '../cards'
import { useModel, useT } from '../model'
import { Link } from '../router'
import { CountUp, Icon, PageHero, SectionHead, type IconName } from '../ui'

const services: [IconName, string, string][] = [
  ['grid', 'Project catalog', 'A public showcase of student projects that passed OFE review.'],
  ['users', 'Teams', 'Gather teammates by their corporate SDU email and assign roles.'],
  ['check', 'Review and feedback', 'Every application is reviewed by OFE. If changes are needed, you get clear feedback.'],
  ['trophy', 'Demo Day', 'The best projects present on stage at SDU Founders Cup.'],
  ['megaphone', 'News and media', 'The OFE media team covers hackathons, championships and student wins.'],
  ['calendar', 'Events', 'Meetups, competitions and workshops for student founders.'],
]

const timeline = [
  ['Your idea', 'Describe the problem you want to solve and who it is for.'],
  ['Team', 'Add teammates by their corporate @sdu.edu.kz email.'],
  ['Application', 'Leave your Telegram and phone so OFE can contact you, then submit.'],
  ['Review', 'OFE reviews the project and helps with feedback.'],
  ['Catalog', 'Approved projects appear in the public catalog.'],
  ['Demo Day', 'Present your project on stage at SDU Founders Cup.'],
]

export function About() {
  const t = useT()
  const { submissions, news } = useModel()
  const projects = submissions.filter(isPublic).length
  return <main id="main" className="about-page">
    <PageHero eyebrow="SDU · OFE" crumbs={[{ label: 'About us' }]} image="/demo-day/IMG_7500.webp"
      title={<>Office for <em>Entrepreneurship</em></>}
      lead={t('OFE is SDU’s Office for Entrepreneurship. We help students develop ideas, build teams and present their projects.')}>
      <nav className="page-hero-tabs" aria-label={t('On this page')}>
        {[['mission', 'Mission'], ['services', 'What we do'], ['how', 'How it works'], ['contacts', 'Contacts']].map(([hash, label]) => <Link key={hash} to="about" hash={hash}>{t(label)}</Link>)}
      </nav>
    </PageHero>

    <section id="mission" className="pg-section">
      <div className="wrap mission-grid">
        <div className="reveal-up">
          <p className="kicker">{t('Mission')}</p>
          <h2 className="display-quote">{t('Every student idea deserves a first step, a team and a stage.')}</h2>
        </div>
        <div className="mission-copy reveal-up" style={{ '--i': 1 } as React.CSSProperties}>
          <p>{t('The Office for Entrepreneurship works inside SDU University. We bring together students from every faculty who want to build something of their own: in business, IT, education, art or social impact.')}</p>
          <p>{t('We do not expect a ready company. An idea and the wish to try are enough to start.')}</p>
          <div className="mini-stats">
            <div><strong><CountUp value={projects} /></strong><span>{t('projects in the catalog')}</span></div>
            <div><strong><CountUp value={news.filter(post => post.published).length} /></strong><span>{t('news and announcements')}</span></div>
            <div><strong>2026</strong><span>{t('first Demo Day')}</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="services" className="pg-section pg-section-muted">
      <div className="wrap">
        <SectionHead eyebrow={t('What we do')} title={t('Support for student founders')} />
        <div className="service-grid">{services.map(([icon, title, text], i) => <article key={title} className="service-card reveal-up" style={{ '--i': i } as React.CSSProperties}>
          <span className="service-icon"><Icon name={icon} size={26} /></span>
          <h3>{t(title)}</h3><p>{t(text)}</p>
        </article>)}</div>
      </div>
    </section>

    <section id="how" className="pg-section">
      <div className="wrap">
        <SectionHead eyebrow={t('How it works')} title={t('From idea to Demo Day')} lead={t('Six steps from the first thought to the stage.')} />
        <ol className="timeline">{timeline.map(([title, text], i) => <li key={title} className="timeline-item reveal-up" style={{ '--i': i } as React.CSSProperties}>
          <span className="timeline-dot">{String(i + 1).padStart(2, '0')}</span>
          <div><h3>{t(title)}</h3><p>{t(text)}</p></div>
        </li>)}</ol>
        <div className="center-actions reveal-up"><Link to="apply" className="btn btn-primary btn-lg">{t('Share a project')}<Icon name="arrow" size={18} /></Link></div>
      </div>
    </section>

    <section id="partners" className="pg-section pg-section-dark">
      <div className="wrap partners-grid">
        <div className="reveal-up">
          <p className="kicker kicker-on-dark">{t('For partners and mentors')}</p>
          <h2>{t('Support the next generation of SDU founders')}</h2>
          <p>{t('Companies, mentors and investors can join Demo Day as jury, share cases for championships or help teams with expertise.')}</p>
          <a className="btn btn-accent" href="https://www.instagram.com/ofe_sdu/" target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={18} />{t('Write to OFE')}</a>
        </div>
        <figure className="partners-figure reveal-up" style={{ '--i': 1 } as React.CSSProperties}>
          <img src="/brand/sdu-30-shield.webp" alt="SDU University · 30th anniversary" width={420} height={513} loading="lazy" />
        </figure>
      </div>
    </section>

    <section id="contacts" className="pg-section">
      <div className="wrap">
        <SectionHead eyebrow={t('Contacts')} title={t('Stay in touch with OFE')} />
        <div className="contact-grid">
          <a className="contact-card reveal-up" href="https://www.instagram.com/ofe_sdu/" target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={28} /><span><small>Instagram</small><strong>@ofe_sdu</strong></span><Icon name="arrowUpRight" size={18} /></a>
          <a className="contact-card reveal-up" style={{ '--i': 1 } as React.CSSProperties} href="https://sdu.edu.kz/" target="_blank" rel="noopener noreferrer"><Icon name="globe" size={28} /><span><small>{t('University')}</small><strong>sdu.edu.kz</strong></span><Icon name="arrowUpRight" size={18} /></a>
          <div className="contact-card reveal-up" style={{ '--i': 2 } as React.CSSProperties}><Icon name="pin" size={28} /><span><small>{t('Location')}</small><strong>SDU University</strong><span>{t('Almaty, Kazakhstan')}</span></span></div>
        </div>
      </div>
    </section>
  </main>
}
