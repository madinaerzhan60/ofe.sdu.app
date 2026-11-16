import { useEffect, useState } from 'react'
import { eventDate } from '../event-date'
import { NewsCard, ProjectCard, isPublic } from '../cards'
import { useModel, useT } from '../model'
import { Link, prefersReducedMotion } from '../router'
import { CountUp, Icon, SectionHead, type IconName } from '../ui'
import { Countdown } from './founders-cup'

const slides = [
  { image: '/demo-day/awards.webp', caption: 'Demo Day 2026 · SDU University' },
  { image: '/demo-day/IMG_7414.webp', caption: 'Student founders on the Demo Day stage' },
  { image: '/demo-day/IMG_7500.webp', caption: 'Teams that started at OFE' },
  { image: '/demo-day/IMG_7247.webp', caption: 'Ideas, teams and first customers' },
]

function HeroSlider() {
  const t = useT()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(() => prefersReducedMotion())
  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % slides.length), 6500)
    return () => window.clearTimeout(timer)
  }, [index, paused])
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  return <>
    <div className="home-hero-slides" aria-hidden="true">
      {slides.map((slide, i) => <div key={slide.image} className={`home-hero-slide${i === index ? ' is-active' : ''}${paused ? ' is-paused' : ''}`}>
        <img src={slide.image} alt="" width={1920} height={1078} fetchPriority={i === 0 ? 'high' : 'low'} loading={i === 0 ? 'eager' : 'lazy'} />
      </div>)}
    </div>
    <div className="home-hero-controls">
      <div className="home-hero-dots" role="group" aria-label={t('Slides')}>
        {slides.map((slide, i) => <button key={slide.image} type="button" className={`home-hero-dot${i === index ? ' is-active' : ''}${paused ? ' is-paused' : ''}`} aria-label={`${t('Slide')} ${i + 1}: ${t(slide.caption)}`} aria-current={i === index} onClick={() => setIndex(i)}><span /></button>)}
      </div>
      <button type="button" className="home-hero-pause" aria-label={t(paused ? 'Play slideshow' : 'Pause slideshow')} onClick={() => setPaused(!paused)}><Icon name={paused ? 'play' : 'pause'} size={16} /></button>
      <p className="home-hero-caption" aria-live="polite">{t(slides[index].caption)}</p>
    </div>
  </>
}

const tiles: { title: string; text: string; to: 'startups' | 'teams' | 'events' | 'apply'; icon: IconName }[] = [
  { title: 'Project catalog', text: 'Student startups from every field', to: 'startups', icon: 'grid' },
  { title: 'Teams', text: 'Find teammates and roles', to: 'teams', icon: 'users' },
  { title: 'Events & news', text: 'Hackathons, championships, winners', to: 'events', icon: 'calendar' },
  { title: 'Share a project', text: 'Submit for review by OFE', to: 'apply', icon: 'send' },
]

const steps = [
  ['01', 'Your idea', 'Describe the problem you want to solve and who it is for.', 'bulb'],
  ['02', 'Team', 'Add teammates by their corporate @sdu.edu.kz email.', 'users'],
  ['03', 'Review', 'OFE reviews the project and helps with feedback.', 'check'],
  ['04', 'Demo Day', 'Present your project on stage at SDU Founders Cup.', 'trophy'],
] as const

export function Home() {
  const t = useT()
  const { submissions, events, news, lang } = useModel()
  const projects = submissions.filter(isPublic)
  const current = events.find(e => e.id === 'current' && e.published) ?? events.find(e => e.id !== 'archive' && e.published && e.date)
  const published = news.filter(post => post.published)
  const [lead, ...rest] = [...published].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.date.localeCompare(a.date))
  const fields = new Set(projects.map(project => project.industry).filter(Boolean)).size
  return <main id="main" className="home">
    <section className="home-hero" aria-labelledby="hero-title">
      <HeroSlider />
      <div className="home-hero-overlay" aria-hidden="true" />
      <div className="wrap home-hero-inner">
        <div className="home-hero-copy">
          <p className="kicker kicker-on-dark home-hero-kicker"><span className="kicker-line" />SDU University · {t('Office for Entrepreneurship')}</p>
          <h1 id="hero-title" className="home-hero-title"><span>Office for</span> <span className="home-hero-title-accent">Entrepreneurship</span></h1>
          <p className="home-hero-lead">{t('We help SDU students turn ideas into projects: find a team, get feedback and present on Demo Day.')}</p>
          <div className="home-hero-actions">
            <Link to="startups" className="btn btn-accent btn-lg">{t('Project catalog')}<Icon name="arrow" size={18} /></Link>
            <Link to="apply" className="btn btn-on-dark btn-lg">{t('Share a project')}</Link>
          </div>
        </div>
        {current && <Link to="demo" className="home-hero-event">
          <span className="home-hero-event-date"><strong>{current.date.slice(8)}</strong><span>{eventDate(current.date, lang).month}</span></span>
          <span className="home-hero-event-copy"><small>{t('Next event')}</small><strong>{t(current.title) === 'SDU FOUNDERS CUP' ? 'SDU Founders Cup' : t(current.title)}</strong><span>{t(current.place)}</span></span>
          <Icon name="arrowUpRight" size={20} />
        </Link>}
      </div>
    </section>

    <section className="quick-tiles" aria-label={t('Quick links')}>
      <div className="wrap quick-tiles-grid">
        {tiles.map((tile, i) => <Link key={tile.title} to={tile.to} className="quick-tile" style={{ '--i': i } as React.CSSProperties}>
          <span className="quick-tile-icon"><Icon name={tile.icon} size={24} /></span>
          <span><strong>{t(tile.title)}</strong><small>{t(tile.text)}</small></span>
          <Icon name="arrow" size={18} className="quick-tile-arrow" />
        </Link>)}
      </div>
    </section>

    <section className="stats-band" aria-label={t('OFE in numbers')}>
      <div className="wrap stats-grid">
        {[[projects.length, 'projects in the catalog'], [fields, 'fields and industries'], [published.length, 'news and announcements'], [4, 'Demo Day 2026 winners']].map(([value, label], i) => <div key={String(label)} className="stat reveal-up" style={{ '--i': i } as React.CSSProperties}>
          <strong><CountUp value={Number(value)} /></strong><span>{t(String(label))}</span>
        </div>)}
      </div>
    </section>

    {lead && <section className="pg-section">
      <div className="wrap">
        <SectionHead eyebrow={t('News')} title={t('Life of the Office')} action={<Link to="events" className="link-arrow">{t('All news')}<Icon name="arrow" size={16} /></Link>} />
        <div className="news-layout">
          <NewsCard post={lead} variant="feature" />
          <div className="news-stack">{rest.slice(0, 3).map((post, i) => <NewsCard key={post.id} post={post} variant="compact" index={i + 1} />)}</div>
        </div>
      </div>
    </section>}

    {current && <section className="pg-section pg-section-tight">
      <div className="wrap">
        <div className="event-banner reveal-up">
          <img src="/demo-day/IMG_7440.webp" alt="" loading="lazy" width={1600} height={898} className="event-banner-bg" />
          <div className="event-banner-copy">
            <p className="kicker kicker-on-dark">{t('NEXT DEMO DAY')}</p>
            <h2>SDU Founders Cup</h2>
            <p>{eventDate(current.date, lang).full} · {t(current.place)}</p>
            <div className="button-group"><Link to="register" className="btn btn-accent">{t('Register your team')}<Icon name="arrow" size={18} /></Link><Link to="demo" className="btn btn-on-dark">{t('About the event')}</Link></div>
          </div>
          <div className="event-banner-timer"><span>{t('Until we meet')}</span><Countdown date={current.date} /></div>
        </div>
      </div>
    </section>}

    {projects.length > 0 && <section className="pg-section pg-section-muted">
      <div className="wrap">
        <SectionHead eyebrow={t('02 — PORTFOLIO')} title={t('Projects from our community')} action={<Link to="startups" className="link-arrow">{t('Open the catalog')}<Icon name="arrow" size={16} /></Link>} />
        <div className="pcard-grid">{projects.slice(0, 6).map((project, i) => <ProjectCard key={project.id} project={project} index={i} />)}</div>
      </div>
    </section>}

    <section className="pg-section">
      <div className="wrap">
        <SectionHead eyebrow={t('How it works')} title={t('From idea to Demo Day')} lead={t('Four steps that every project at OFE goes through.')} />
        <ol className="steps">{steps.map(([n, title, text, icon], i) => <li key={n} className="step reveal-up" style={{ '--i': i } as React.CSSProperties}>
          <span className="step-icon"><Icon name={icon} size={26} /></span>
          <span className="step-num">{n}</span>
          <h3>{t(title)}</h3>
          <p>{t(text)}</p>
        </li>)}</ol>
      </div>
    </section>
  </main>
}
