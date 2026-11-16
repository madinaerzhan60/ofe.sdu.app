import { StorageImage } from './storage'
import { coverReference } from './event-cover-storage'
import { useMemo, useState } from 'react'
import { useModel, useT } from './model'
import { describeError, downloadPresentation, setTeamStatus, teamsToCsv, useEventTeams, type EventTeam, type TeamStatus } from './registration'
import { Icon } from './ui'
import { formatPhone } from './validation'

const labels: Record<TeamStatus, string> = { submitted: 'Under review', confirmed: 'Confirmed', rejected: 'Not accepted' }

export function AdminRegistrations() {
  const t = useT()
  const { events, userEmail } = useModel()
  const event = events.find(e => e.id === 'current') ?? { id: 'current', title: 'SDU FOUNDERS CUP', date: '2026-11-21' }
  const { teams, loading, error, reload } = useEventTeams(event.id, `admin:${userEmail}`)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | TeamStatus>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [problem, setProblem] = useState('')
  const counts = useMemo(() => ({ all: teams.length, submitted: teams.filter(x => x.status === 'submitted').length, confirmed: teams.filter(x => x.status === 'confirmed').length, rejected: teams.filter(x => x.status === 'rejected').length }), [teams])
  const q = query.trim().toLowerCase()
  const visible = teams.filter(team => (filter === 'all' || team.status === filter)
    && [team.teamName, team.productName, team.captainEmail, team.telegram, ...team.members.map(m => m.email)].join(' ').toLowerCase().includes(q))
  const act = async (team: EventTeam, action: () => Promise<void>) => { setBusy(team.id); setProblem(''); try { await action() } catch (error) { setProblem(describeError(error)) } finally { setBusy('') } }
  const exportCsv = () => {
    const blob = new Blob([teamsToCsv(visible)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `founders-cup-teams-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
  return <div className="admin-registrations">
    <div className="reg-stats">{(['all', 'submitted', 'confirmed', 'rejected'] as const).map(key => <button key={key} type="button" className={`reg-stat${filter === key ? ' is-active' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
      <strong>{counts[key]}</strong><span>{t(key === 'all' ? 'All teams' : labels[key])}</span>
    </button>)}</div>
    <div className="reg-toolbar">
      <label className="reg-search"><Icon name="search" size={18} /><span className="sr-only">{t('Search teams')}</span><input placeholder={t('Search by team, product or email')} value={query} onChange={e => setQuery(e.target.value)} /></label>
      <button type="button" className="btn btn-outline" onClick={() => void reload()}>{t('Refresh')}</button>
      <button type="button" className="btn btn-primary" disabled={!visible.length} onClick={exportCsv}><Icon name="download" size={16} />{t('Export CSV')}</button>
    </div>
    {problem && <p className="form-error" role="alert">{t(problem)}</p>}
    {error && <p className="form-error" role="alert">{t(error)}</p>}
    {loading && !teams.length && <p className="field-note">{t('Please wait…')}</p>}
    {!loading && !visible.length && <div className="admin-empty"><h3>{t(teams.length ? 'No teams match the filters.' : 'No teams have registered yet.')}</h3></div>}
    <ul className="reg-list">{visible.map(team => <li key={team.id} className={`reg-row${open === team.id ? ' is-open' : ''}`}>
      <button type="button" className="reg-row-head" aria-expanded={open === team.id} onClick={() => setOpen(open === team.id ? null : team.id)}>
        <span className="reg-logo">{team.teamName.slice(0, 2).toUpperCase()}</span>
        <span className="reg-title"><strong>{team.teamName}</strong><small>{team.productName} · {team.members.length} {t('people')} · {team.captainEmail}</small></span>
        <span className={`status-badge is-${team.status === 'submitted' ? 'review' : team.status}`}><span className="status-dot" />{t(labels[team.status])}</span>
        <span className={`reg-file${team.presentationPath ? ' has-file' : ''}`} title={t(team.presentationPath ? 'Presentation uploaded' : 'Not uploaded yet')}><Icon name={team.presentationPath ? 'check' : 'image'} size={16} /></span>
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
            {team.presentationPath ? <button type="button" className="btn btn-outline btn-sm reg-download" disabled={busy === team.id} onClick={() => act(team, () => downloadPresentation(team))}><Icon name="download" size={16} /><span>{team.presentationName}</span></button> : <p className="field-note">{t('Not uploaded yet')}</p>}
          </div>
        </div>
        <label className="reg-note">{t('Message to the team (optional)')}<textarea rows={2} maxLength={1000} value={notes[team.id] ?? team.adminNote} onChange={e => setNotes({ ...notes, [team.id]: e.target.value })} /></label>
        <p className="field-note">{t('Confirmed product information appears in the project catalog with this event’s tag. Contacts and presentations remain private.')}</p>
        <div className="reg-actions">
          {team.status !== 'confirmed' && <button type="button" className="btn btn-primary btn-sm" disabled={busy === team.id} onClick={() => act(team, () => setTeamStatus(team, 'confirmed', notes[team.id] ?? team.adminNote))}><Icon name="check" size={16} />{t('Confirm the team')}</button>}
          {team.status !== 'submitted' && <button type="button" className="btn btn-outline btn-sm" disabled={busy === team.id} onClick={() => act(team, () => setTeamStatus(team, 'submitted', notes[team.id] ?? team.adminNote))}>{t('Back to review')}</button>}
          {team.status !== 'rejected' && <button type="button" className="btn btn-ghost btn-sm danger-text" disabled={busy === team.id} onClick={() => act(team, () => setTeamStatus(team, 'rejected', notes[team.id] ?? team.adminNote))}>{t('Decline')}</button>}
        </div>
        <p className="field-note">{t('Registered')}: {team.createdAt.slice(0, 16).replace('T', ' ')} · {t('Updated')}: {team.updatedAt.slice(0, 16).replace('T', ' ')}</p>
      </div>}
    </li>)}</ul>
  </div>
}
