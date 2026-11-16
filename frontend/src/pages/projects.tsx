import { useEffect, useMemo, useState } from 'react'
import { ProjectCard, isPublic } from '../cards'
import { StartupEditor, ownsStartup } from '../media'
import { useModel, useT } from '../model'
import { Link, useRouter } from '../router'
import { StorageImage } from '../storage'
import { Icon, PageHero, SectionHead, useReveal } from '../ui'
import { formatPhone } from '../validation'
import { publicProjects } from '../catalog'

const stages = ['Idea', 'Prototype', 'MVP', 'Seed', 'Growth']

export function Projects() {
  const t = useT()
  const { submissions, eventProjects, events } = useModel()
  const [search, setSearch] = useState('')
  const [field, setField] = useState('All')
  const [stage, setStage] = useState('All')
  const [eventId, setEventId] = useState('All')
  const [sort, setSort] = useState('newest')
  const [shown, setShown] = useState(9)
  const projects = publicProjects(submissions, eventProjects)
  const fields = [...new Set(projects.map(p => p.industry).filter(Boolean))]
  const query = search.trim().toLowerCase()
  const filtered = useMemo(() => projects
    .filter(p => (eventId === 'All' || p.eventIds?.includes(eventId)) && (field === 'All' || p.industry === field) && (stage === 'All' || p.stage === stage)
      && [p.name, p.description, t(p.description), p.industry, t(p.industry)].join(' ').toLowerCase().includes(query))
    .sort((a, b) => sort === 'az' ? a.name.localeCompare(b.name) : (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [projects, field, stage, eventId, query, sort, t])
  useEffect(() => setShown(9), [search, field, stage, eventId, sort])
  useReveal([filtered.length, shown])
  const reset = () => { setSearch(''); setField('All'); setStage('All'); setEventId('All') }
  return <main id="main" className="catalog-page">
    <PageHero eyebrow="SDU · OFE" crumbs={[{ label: 'Project catalog' }]} title={t('Project catalog')} lead={t('Student startups and projects from every field at SDU. Published projects and confirmed event participants.')}>
      <div className="catalog-search" role="search">
        <Icon name="search" size={22} />
        <input aria-label={t('Search projects')} placeholder={t('Search by name, idea or field…')} value={search} onChange={e => setSearch(e.target.value)} />
        <Link to="apply" className="btn btn-accent">{t('Add project')}<Icon name="plus" size={18} /></Link>
      </div>
    </PageHero>
    <section className="pg-section pg-section-tight">
      <div className="wrap">
        <div className="filter-bar">
          <div className="chip-row" role="group" aria-label={t('Field')}>
            <button type="button" className={`chip-button${field === 'All' ? ' is-active' : ''}`} aria-pressed={field === 'All'} onClick={() => setField('All')}>{t('All topics')}<small>{projects.length}</small></button>
            {fields.map(name => <button key={name} type="button" className={`chip-button${field === name ? ' is-active' : ''}`} aria-pressed={field === name} onClick={() => setField(name)}>{t(name)}<small>{projects.filter(p => p.industry === name).length}</small></button>)}
          </div>
          <div className="filter-selects">
            <label className="select-pill"><span>{t('Event')}</span><select value={eventId} onChange={e => setEventId(e.target.value)}><option value="All">{t('All events')}</option>{events.filter(event => event.published).map(event => <option key={event.id} value={event.id}>{t(event.title)}{event.date ? ` · ${event.date.slice(0,4)}` : ''}</option>)}</select></label>
            <label className="select-pill"><span>{t('Stage')}</span><select value={stage} onChange={e => setStage(e.target.value)}><option value="All">{t('All stages')}</option>{stages.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
            <label className="select-pill"><span>{t('Sort')}</span><select aria-label={t('Sort startups')} value={sort} onChange={e => setSort(e.target.value)}><option value="newest">{t('Newest first')}</option><option value="az">{t('A–Z')}</option></select></label>
          </div>
        </div>
        <div className="results-bar"><p role="status">{filtered.length} {t('projects found')}</p>{(search || field !== 'All' || stage !== 'All' || eventId !== 'All') && <button type="button" className="link-arrow" onClick={reset}>{t('Clear filters')}</button>}</div>
        {filtered.length ? <div className="pcard-grid">{filtered.slice(0, shown).map((project, i) => <ProjectCard key={project.id} project={project} index={i} />)}</div>
          : <div className="empty-state"><Icon name="search" size={36} /><h2>{t('No projects found')}</h2><p>{t('Try a different name or clear the filters to see all projects.')}</p><button type="button" className="btn btn-outline" onClick={reset}>{t('Clear filters')}</button></div>}
        {filtered.length > shown && <div className="more-row"><p>{t('Showing')} {shown} {t('of')} {filtered.length}</p><button type="button" className="btn btn-outline" onClick={() => setShown(shown + 9)}>{t('Explore more projects')}</button></div>}
      </div>
    </section>
  </main>
}

export function ProjectProfile() {
  const t = useT()
  const { route } = useRouter()
  const { submissions, account, userId, userEmail, liveMode, isAdmin, events, eventProjects } = useModel()
  const [editing, setEditing] = useState(false)
  const submission = submissions.find(row => row.id === route.id)
  const project = submission ?? eventProjects.find(row => row.id === route.id)
  const owner = Boolean(submission && account === 'student' && ownsStartup(submission, userId, liveMode))
  const member = Boolean(submission?.members?.some(m => m.email === userEmail.toLowerCase()))
  const canSee = project && (!submission || isPublic(submission) || owner || isAdmin || member)
  useReveal([route.id, editing])
  if (!project || !canSee) return <main id="main" className="wrap page-missing"><Icon name="search" size={40} /><h1>{t('Startup unavailable')}</h1><Link to="startups" className="btn btn-primary">{t('All startups')}</Link></main>
  const related = publicProjects(submissions, eventProjects).filter(row => row.id !== project.id).sort((a, b) => Number(b.industry === project.industry) - Number(a.industry === project.industry)).slice(0, 3)
  const product = /^https?:\/\//i.test(project.product) ? project.product : undefined
  const connected = events.filter(event => event.published && project.eventIds?.includes(event.id))
  const privateView = owner || isAdmin || member
  return <main id="main" className="pp-page">
    <section className={`pp-cover${project.cover ? ' has-image' : ''}`}>
      {project.cover && <StorageImage src={project.cover} alt="" />}
      <div className="wrap pp-cover-inner">
        <nav className="breadcrumbs" aria-label={t('Breadcrumbs')}><ol><li><Link to="home">{t('Home')}</Link></li><li><Link to="startups">{t('Project catalog')}</Link></li><li><span aria-current="page">{project.name}</span></li></ol></nav>
        <div className="pp-identity">
          <span className="pp-logo">{project.image ? <StorageImage src={project.image} alt="" /> : project.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <div className="chip-row"><span className="chip chip-on-media">{t(project.industry)}</span><span className="chip chip-on-media">{t(project.stage)}</span>{submission && !isPublic(submission) && <span className="chip chip-warning">{t(submission.status)}</span>}</div>
            <div className="chip-row">{connected.map(event => <Link key={event.id} to="events" id={event.id} className="chip">{t(event.title)}{event.date ? ` · ${event.date.slice(0,4)}` : ''}</Link>)}</div>
            <h1>{project.name}</h1>
            <p>{t(project.description)}</p>
          </div>
        </div>
      </div>
    </section>
    <div className="wrap pp-layout">
      <article className="pp-main">
        {project.id.startsWith('sample-') && <p className="notice">{t('Sample project for exploring the platform.')}</p>}
        {owner && <div className="pp-owner-bar"><span>{t('This is your project')}</span><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(!editing)}><Icon name="edit" size={16} />{t('Edit startup page')}</button></div>}
        {editing && submission && <StartupEditor row={submission} onClose={() => setEditing(false)} />}
        <section className="reveal-up"><p className="kicker">{t('About the project')}</p><div className="prose">{(project.about || t(project.description)).split('\n').filter(Boolean).map((text, i) => <p key={i}>{text}</p>)}</div></section>
        {connected.length > 0 && <section className="reveal-up"><p className="kicker">{t('CONNECTED EVENTS')}</p>{connected.map(event => <Link key={event.id} to="events" id={event.id} className="link-arrow">{event.title} · {event.date}<Icon name="arrowUpRight" size={16} /></Link>)}</section>}
      </article>
      <aside className="pp-side">
        {product && <a className="btn btn-accent btn-block" href={product} target="_blank" rel="noopener noreferrer">{t('Visit product')}<Icon name="arrowUpRight" size={18} /></a>}
        <section className="side-card reveal-up">
          <h2>{t('The team')}</h2>
          <ul className="role-list">{(project.team || '').split(',').map(role => role.trim()).filter(Boolean).map((role, i) => <li key={role + i}><span className="member-avatar" aria-hidden="true">{t(role).slice(0, 1)}</span>{t(role)}</li>)}</ul>
          {privateView && submission?.members && submission?.members.length > 0 && <div className="private-block"><p className="private-label"><Icon name="eye" size={14} />{t('Visible to the team and OFE only')}</p><ul className="member-list">{submission?.members.map(m => <li key={m.email}><strong>{m.email}</strong><small>{t(m.role === 'Other' ? 'Other role' : m.role)}</small></li>)}</ul></div>}
        </section>
        {(owner || isAdmin) && submission?.contact && <section className="side-card reveal-up">
          <h2>{t('Contacts for the OFE team')}</h2>
          <p className="private-label"><Icon name="eye" size={14} />{t('Visible to the team and OFE only')}</p>
          <a className="contact-line" href={`https://t.me/${submission.contact.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"><Icon name="telegram" size={18} />{submission.contact.telegram}</a>
          <a className="contact-line" href={`tel:${submission.contact.phone}`}><Icon name="phone" size={18} />{formatPhone(submission.contact.phone)}</a>
        </section>}
        <section className="side-card reveal-up"><h2>{t('COMPANY')}</h2><dl className="fact-list"><div><dt>{t('Stage')}</dt><dd>{t(project.stage)}</dd></div><div><dt>{t('Industry')}</dt><dd>{t(project.industry)}</dd></div></dl></section>
      </aside>
    </div>
    {related.length > 0 && <section className="pg-section pg-section-muted">
      <div className="wrap"><SectionHead title={t('Related startups')} action={<Link to="startups" className="link-arrow">{t('All startups')}<Icon name="arrow" size={16} /></Link>} />
        <div className="pcard-grid">{related.map((row, i) => <ProjectCard key={row.id} project={row} index={i} />)}</div></div>
    </section>}
  </main>
}
