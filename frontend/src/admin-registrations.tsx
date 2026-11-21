import {ProjectRemovalDialog} from './project-removal-dialog'
import { StorageImage } from './storage'
import { coverReference } from './event-cover-storage'
import { useState, type ReactNode } from 'react'
import { useModel, useT, type Submission } from './model'
import { AdminTeamPdfUpload } from './admin-presentation'
import { describeError, downloadPresentation, downloadTeamPdf, setTeamStatus, setTeamRemoved, teamsToCsv, useEventTeams, type EventTeam, type TeamStatus } from './registration'
import { Icon } from './ui'
import { formatPhone } from './validation'

const labels: Record<TeamStatus, string> = { submitted: 'Under review', confirmed: 'Confirmed', rejected: 'Not accepted' }

type Source = 'event' | 'catalog'
type Filter = 'all' | 'removed' | TeamStatus
const projectStatuses: Record<Submission['status'], TeamStatus> = { Pending: 'submitted', Approved: 'confirmed', Rejected: 'rejected' }
const teamFilters: Record<Filter, string> = { all: 'All teams', ...labels, removed: 'Removed' }
const catalogFilters: Record<Filter, string> = {
  all: 'All submissions', submitted: 'Pending', confirmed: 'Approved',
  rejected: 'Rejected', removed: 'Removed',
}
const sources: Record<Source, string> = { event: 'Team registrations', catalog: 'Catalog submissions' }

export function AdminRegistrations({ projects, renderProject, directory }: {
  projects: Submission[]
  renderProject: (project: Submission) => ReactNode
  directory: boolean
}) {
  const t = useT()
  const { events, userEmail } = useModel()
  const event = events.find(e => e.id === 'current') ?? { id: 'current', title: 'SDU FOUNDERS CUP', date: '2026-11-23' }
  const { teams, loading, error, reload } = useEventTeams(event.id, `admin:${userEmail}`, true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [source, setSource] = useState<Source>('event')
  const [removing,setRemoving] = useState<EventTeam|null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [problem, setProblem] = useState('')
  const q = query.trim().toLowerCase()
  const entries = (source === 'event'
    ? teams.map(team => ({
      kind: 'event' as const, team, status: team.status, removed: team.removed,
      searchText: [team.teamName, team.productName, team.captainEmail, team.telegram, ...team.members.map(member => member.email)].join(' '),
    }))
    : projects.map(project => ({
      kind: 'catalog' as const, project, status: projectStatuses[project.status], removed: project.removed,
      searchText: [project.name, project.team, project.description, project.industry, t(project.industry), ...(project.members ?? []).map(member => member.email)].join(' '),
    }))).filter(entry => !directory || (!entry.removed && entry.status === 'confirmed'))
  const filterLabels = source === 'event' ? teamFilters : catalogFilters
  const matchesStatus = (entry: typeof entries[number], key: Filter) =>
    key === 'removed' ? Boolean(entry.removed) : !entry.removed && (key === 'all' || key === entry.status)
  const visible = entries.filter(entry => matchesStatus(entry, filter) && entry.searchText.toLowerCase().includes(q))
    .sort((a, b) => Number(b.status === 'submitted') - Number(a.status === 'submitted'))
  const visibleTeams = visible.flatMap(entry => entry.kind === 'event' ? [entry.team] : [])
  const act = async (team: EventTeam, action: () => Promise<void>) => { setBusy(team.id); setProblem(''); try { await action() } catch (error) { setProblem(describeError(error)) } finally { setBusy('') } }
  const exportCsv = () => {
    const blob = new Blob([teamsToCsv(visibleTeams)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `founders-cup-teams-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
  return <div className="admin-registrations">
    <div className="table-toolbar reg-source-tabs" role="group" aria-label={t('Submission source')}>
      <div>{(Object.keys(sources) as Source[]).map(key => <button
        key={key} type="button" className={source === key ? 'active' : ''} aria-pressed={source === key}
        onClick={() => { setSource(key); setFilter('all'); setQuery(''); setOpen(null); setProblem('') }}
      >{t(sources[key])}</button>)}</div>
    </div>
    {!directory && <div className="reg-stats">{(['all', 'submitted', 'confirmed', 'rejected', 'removed'] as const).map(key => <button key={key} type="button" className={`reg-stat${filter === key ? ' is-active' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
      <strong>{entries.filter(entry => matchesStatus(entry, key)).length}</strong><span>{t(filterLabels[key])}</span>
    </button>)}</div>}
    <div className="reg-toolbar">
      <label className="reg-search"><Icon name="search" size={18} /><span className="sr-only">{t('Search submissions')}</span><input placeholder={t('Search by team, product or email')} value={query} onChange={e => setQuery(e.target.value)} /></label>
      {source === 'event' && <button type="button" className="btn btn-outline" onClick={() => void reload()}>{t('Refresh teams')}</button>}
      {source === 'event' && <button type="button" className="btn btn-primary" disabled={!visibleTeams.length} onClick={exportCsv}><Icon name="download" size={16} />{t('Export teams CSV')}</button>}
    </div>
    <div className="admin-list-heading"><h2>{t(directory ? 'Project directory' : 'Project applications')}</h2><span>{visible.length} {t('results')}</span></div>
    {problem && <p className="form-error" role="alert">{t(problem)}</p>}
    {source === 'event' && error && <p className="form-error" role="alert">{t(error)}</p>}
    {source === 'event' && loading && !entries.length && <p className="field-note">{t('Please wait…')}</p>}
    {(source === 'catalog' || !loading) && !visible.length && <div className="admin-empty"><h3>{t('No projects found')}</h3></div>}
    <ul className="reg-list">{visible.map(entry => {
      if (entry.kind === 'catalog') return <li key={`project:${entry.project.id}`}>{renderProject(entry.project)}</li>
      const { team } = entry
      const hasPresentation = Boolean(team.presentationPath || team.supplementalPdf)
      const canSupplyPdf = !team.removed && !team.supplementalPdf
        && (!team.presentationPath || (team.presentationPath.endsWith('.pptx') && team.supplementalPdf === false))
      return <li key={`team:${team.id}`} className={`reg-row${open === team.id ? ' is-open' : ''}`}>
      <button type="button" className="reg-row-head" aria-expanded={open === team.id} onClick={() => setOpen(open === team.id ? null : team.id)}>
        <span className="reg-logo">{team.teamName.slice(0, 2).toUpperCase()}</span>
        <span className="reg-title"><strong>{team.teamName}</strong><small>{t('Founders Cup')} · {team.productName} · {team.members.length} {t('people')} · {team.captainEmail}</small></span>
        <span className={`status-badge is-${team.status === 'submitted' ? 'review' : team.status}`}><span className="status-dot" />{t(team.removed ? 'Removed' : labels[team.status])}</span>
        <span className={`reg-file${hasPresentation ? ' has-file' : ''}`} title={t(hasPresentation ? 'Presentation uploaded' : 'Not uploaded yet')}><Icon name={hasPresentation ? 'check' : 'image'} size={16} /></span>
        <Icon name="chevron" size={18} className="reg-chevron" />
      </button>
      {open === team.id && <div className="reg-details">
        <div className="reg-columns">
          <div>
            <h4>{t('Product')}</h4>
            {team.coverPath && <div className="image-upload-preview"><StorageImage src={coverReference(team.coverPath)} alt={team.productName}/></div>}
            <p><strong>{team.productName}</strong> — {team.tagline}</p>
            <p className="field-note">{t(team.industry)} · {t(team.stage)}</p>
            <div className="prose reg-description">{team.description.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}</div>
            {team.productUrl && <a href={team.productUrl} target="_blank" rel="noopener noreferrer nofollow">{team.productUrl} ↗</a>}
          </div>
          <div>
            <h4>{t('Contacts')}</h4>
            <p><a href={`https://t.me/${team.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">{team.telegram}</a><br /><a href={`tel:${team.phone}`}>{formatPhone(team.phone)}</a></p>
            <h4>{t('Team members')}</h4>
            <ul className="member-list">{team.members.map(m => <li key={m.email}><strong>{m.email}</strong><small>{t(m.isCaptain ? 'Captain' : m.role === 'Other' ? 'Other role' : m.role)}</small></li>)}</ul>
            <h4>{t('Presentation')}</h4>
            <div className="reg-presentation-files">
              {team.presentationPath && <button type="button" className="btn btn-outline btn-sm reg-download" disabled={busy === team.id} onClick={() => act(team, () => downloadPresentation(team))}><Icon name="download" size={16} /><span>{team.presentationName}</span></button>}
              {team.supplementalPdf && <button type="button" className="btn btn-outline btn-sm" disabled={busy === team.id} onClick={() => act(team, () => downloadTeamPdf(team))}><Icon name="download" size={16} />{t('Download PDF')}</button>}
              {!hasPresentation && <p className="field-note">{t('Not uploaded yet')}</p>}
              {canSupplyPdf && <AdminTeamPdfUpload key={team.id} team={team} disabled={Boolean(busy)} />}
            </div>
          </div>
        </div>
        <label className="reg-note">{t('Message to the team (optional)')}<textarea rows={2} maxLength={1000} value={notes[team.id] ?? team.adminNote} onChange={e => setNotes({ ...notes, [team.id]: e.target.value })} /></label>
        <p className="field-note">{t('Confirmed product information appears in the project catalog with this event’s tag. Contacts and presentations remain private.')}</p>
        <div className="reg-actions">{team.removed ? <button type="button" className="btn btn-outline btn-sm" disabled={Boolean(busy)} onClick={() => act(team,()=>setTeamRemoved(team,false))}>{t('Restore project')}</button> : <>
          {team.status !== 'confirmed' && <button type="button" className="btn btn-ghost btn-sm danger-text" disabled={Boolean(busy)} onClick={() => setRemoving(team)}>{t('Remove project')}</button>}
          {team.status !== 'confirmed' && <button type="button" className="btn btn-primary btn-sm" disabled={busy === team.id} onClick={() => act(team, () => setTeamStatus(team, 'confirmed', notes[team.id] ?? team.adminNote))}><Icon name="check" size={16} />{t('Confirm the team')}</button>}
          {team.status !== 'submitted' && <button type="button" className="btn btn-outline btn-sm" disabled={busy === team.id} onClick={() => act(team, () => setTeamStatus(team, 'submitted', notes[team.id] ?? team.adminNote))}>{t('Back to review')}</button>}
          {team.status !== 'rejected' && <button type="button" className="btn btn-ghost btn-sm danger-text" disabled={busy === team.id} onClick={() => act(team, () => setTeamStatus(team, 'rejected', notes[team.id] ?? team.adminNote))}>{t('Decline')}</button>}</> }
        </div>
        <p className="field-note">{t('Registered')}: {team.createdAt.slice(0, 16).replace('T', ' ')} · {t('Updated')}: {team.updatedAt.slice(0, 16).replace('T', ' ')}</p>
      </div>}
    </li>
    })}</ul>
    {removing && <ProjectRemovalDialog name={`${removing.productName} · ${removing.teamName}`} onClose={()=>setRemoving(null)} onConfirm={async()=>{await setTeamRemoved(removing,true);setOpen(null);return true}}/>}
  </div>
}
