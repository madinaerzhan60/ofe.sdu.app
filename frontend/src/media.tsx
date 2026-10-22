import { useRef, useState } from 'react'
import { EventData, Submission, useModel, useT } from './model'

export const demoOwnerId = 'demo-student'
export const ownsStartup = (row: Submission, userId: string | null = null, liveMode = false) => liveMode ? Boolean(userId && row.ownerId === userId) : row.ownerId === demoOwnerId || (!row.ownerId && row.id.startsWith('student-'))

export function ImageUpload({ label, value, onChange, square = false }: { label: string; value?: string; onChange: (value: string) => void; square?: boolean }) {
  const t = useT()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const revision = useRef(0)
  const change = useRef(onChange)
  change.current = onChange
  return <div className="image-upload">
    <label><span>{t(label)}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPG or WebP smaller than 5 MB.'); return }
      const request = ++revision.current
      setBusy(true); setError('')
      try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
        if (request === revision.current) change.current(canvas.toDataURL('image/webp', .85))
      } catch { setError('This image could not be opened. Choose another file.') }
      finally { setBusy(false) }
    }} /><small>{t(busy ? 'Loading image…' : 'PNG, JPG or WebP · up to 5 MB')}</small></label>
    {value && <div className={`image-upload-preview${square ? ' square' : ''}`}><img src={value} alt={t(label)} /><button type="button" className="secondary" onClick={() => { revision.current++; onChange('') }}>{t('Remove image')}</button></div>}
    {error && <p className="form-error" role="alert">{t(error)}</p>}
  </div>
}

export function StartupEditor({ row, onClose, onSaved }: { row: Submission; onClose: () => void; onSaved?: () => void }) {
  const { account, setSubmissions, select, userId, liveMode } = useModel()
  const t = useT()
  const [draft, setDraft] = useState(row)
  const [preview, setPreview] = useState(false)
  if (account !== 'student' || !ownsStartup(row, userId, liveMode)) return null
  return <form className="startup-editor" onSubmit={async e => {
    e.preventDefault()
    const saved = await setSubmissions(rows => rows.map(current => current.id === row.id && ownsStartup(current, userId, liveMode) ? { ...current, name: draft.name.trim(), description: draft.description.trim(), about: draft.about?.trim(), image: draft.image, cover: draft.cover, team: draft.team.trim(), product: draft.product.trim() } : current))
    if (!saved)return
    select(draft.name.trim()); onSaved?.(); onClose()
  }}>
    <div className="workspace-head"><h3>{t('Edit startup page')}</h3><button type="button" className="inline-link" onClick={onClose}>{t('Cancel')}</button></div>
    <ImageUpload label="Startup logo (optional)" value={draft.image} onChange={image => setDraft(d => ({ ...d, image }))} square />
    <ImageUpload label="Startup cover" value={draft.cover} onChange={cover => setDraft(d => ({ ...d, cover }))} />
    <label>{t('Startup name')}<input required maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
    <label>{t('One-line description')}<textarea required maxLength={300} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
    <label>{t('About your startup')}<textarea rows={5} maxLength={5000} value={draft.about ?? ''} onChange={e => setDraft({ ...draft, about: e.target.value })} /></label>
    <label>{t('Team members')}<textarea required value={draft.team} onChange={e => setDraft({ ...draft, team: e.target.value })} /></label>
    <label>{t('Product link (optional)')}<input type="url" pattern="https?://.+" value={draft.product} onChange={e => setDraft({ ...draft, product: e.target.value })} /></label>
    <button type="button" className="secondary" aria-expanded={preview} onClick={() => setPreview(!preview)}>{t(preview ? 'Hide preview' : 'Preview startup page')}</button>
    {preview && <article className="startup-live-preview">{draft.cover && <img className="startup-cover" src={draft.cover} alt="" />}<div>{draft.image && <img className="startup-preview-logo" src={draft.image} alt="" />}<h2>{draft.name}</h2><p>{draft.description}</p><p className="startup-about">{draft.about}</p><small>{draft.team}</small></div></article>}
    <div className="button-row editor-actions"><button className="primary" disabled={!draft.name.trim() || !draft.description.trim() || !draft.team.trim()}>{t('Save changes')}</button><button type="button" className="secondary" onClick={onClose}>{t('Cancel')}</button></div>
  </form>
}

export function EventEditor({ event }: { event: EventData }) {
  const { setEvents } = useModel()
  const t = useT()
  const [draft, setDraft] = useState(event)
  const [saved, setSaved] = useState(false)
  return <form onChange={() => setSaved(false)} onSubmit={async e => { e.preventDefault(); const saved = await setEvents(rows => rows.map(row => row.id === event.id ? { ...draft, title: draft.title.trim(), place: draft.place.trim() } : row)); setSaved(saved) }}>
    <label>{t('Event title')}<input required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
    <div className="form-row"><label>{t('Date')}<input type="date" required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label><label>{t('Place')}<input required value={draft.place} onChange={e => setDraft({ ...draft, place: e.target.value })} /></label></div>
    <ImageUpload label="Event image" value={draft.image} onChange={image => { setDraft(d => ({ ...d, image })); setSaved(false) }} />
    <label className="consent-toggle"><input type="checkbox" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />{t('Published')}</label>
    <button className="primary" disabled={!draft.title.trim() || !draft.place.trim()}>{t('Save event')}</button>
    {saved && <p role="status" className="success-banner">{t('Changes saved')}</p>}
  </form>
}
