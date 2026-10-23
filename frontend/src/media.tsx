import { useEffect, useRef, useState } from 'react'
import { StorageImage, uploadImage, type MediaTarget } from './storage'
import { EventData, Submission, useModel, useT } from './model'

export const demoOwnerId = 'demo-student'
export const ownsStartup = (row: Submission, userId: string | null = null, liveMode = false) => liveMode ? Boolean(userId && row.ownerId === userId) : row.ownerId === demoOwnerId || (!row.ownerId && row.id.startsWith('student-'))

export function ImageUpload({ label, value, onChange, square = false, target, disabledReason = '', pendingFile, onPrepared, onBusyChange }: { onBusyChange?: (busy: boolean) => void; pendingFile?: Blob; onPrepared?: (file: Blob | undefined) => void; target?: MediaTarget; disabledReason?: string; label: string; value?: string; onChange: (value: string) => void; square?: boolean }) {
  const t = useT()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [localPreview, setLocalPreview] = useState('')
  useEffect(() => {
    if (!pendingFile) { setLocalPreview(''); return }
    const url = URL.createObjectURL(pendingFile); setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])
  const revision = useRef(0)
  const change = useRef(onChange)
  change.current = onChange
  const prepared = useRef(onPrepared)
  prepared.current = onPrepared
  useEffect(() => () => { revision.current++ }, [])
  return <div className="image-upload">
    <label><span>{t(label)}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || (!target && !onPrepared) || Boolean(disabledReason)} onChange={async e => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || (!target && !onPrepared) || disabledReason) return
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPG or WebP smaller than 5 MB.'); return }
      const request = ++revision.current
      setBusy(true); onBusyChange?.(true); setError('')
      try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image conversion failed.')), 'image/webp', .85))
        if (onPrepared) { if (request === revision.current) prepared.current?.(blob); return }
        const reference = await uploadImage(blob, target!)
        if (request === revision.current) change.current(reference)
      } catch (error) { if (request === revision.current) setError(error instanceof Error ? error.message : 'Image upload failed.') }
      finally { setBusy(false); onBusyChange?.(false) }
    }} /><small>{t(disabledReason || (busy ? 'Loading image…' : 'PNG, JPG or WebP · up to 5 MB'))}</small></label>
    {(localPreview || value) && <div className={`image-upload-preview${square ? ' square' : ''}`}><StorageImage src={localPreview || value} alt={t(label)} /><button type="button" className="secondary" disabled={busy || Boolean(disabledReason)} onClick={() => { revision.current++; if (pendingFile && onPrepared) onPrepared(undefined); else onChange('') }}>{t('Remove image')}</button></div>}
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
    <ImageUpload label="Startup logo (optional)" value={draft.image} target={row.ownerId ? {projectId:row.id,ownerId:row.ownerId,kind:'logo'} : undefined} disabledReason={row.status === 'Approved' && row.visible === true && row.publication ? 'Published project images are locked. Contact the reviewer to request changes.' : ''} onChange={image => setDraft(d => ({ ...d, image }))} square />
    <ImageUpload label="Startup cover" value={draft.cover} target={row.ownerId ? {projectId:row.id,ownerId:row.ownerId,kind:'cover'} : undefined} disabledReason={row.status === 'Approved' && row.visible === true && row.publication ? 'Published project images are locked. Contact the reviewer to request changes.' : ''} onChange={cover => setDraft(d => ({ ...d, cover }))} />
    <label>{t('Startup name')}<input required maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
    <label>{t('One-line description')}<textarea required maxLength={300} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
    <label>{t('About your startup')}<textarea rows={5} maxLength={5000} value={draft.about ?? ''} onChange={e => setDraft({ ...draft, about: e.target.value })} /></label>
    <label>{t('Team members')}<textarea required value={draft.team} onChange={e => setDraft({ ...draft, team: e.target.value })} /></label>
    <label>{t('Product link (optional)')}<input type="url" pattern="https?://.+" value={draft.product} onChange={e => setDraft({ ...draft, product: e.target.value })} /></label>
    <button type="button" className="secondary" aria-expanded={preview} onClick={() => setPreview(!preview)}>{t(preview ? 'Hide preview' : 'Preview startup page')}</button>
    {preview && <article className="startup-live-preview"><div className="preview-cover">{draft.cover ? <StorageImage src={draft.cover} alt="" /> : <span aria-hidden="true">{draft.name.slice(0, 1).toUpperCase()}</span>}<span className="preview-label">{t('Project preview')}</span></div><div className="preview-body"><div className="preview-identity"><span className="preview-logo">{draft.image ? <StorageImage src={draft.image} alt="" /> : draft.name.slice(0,2).toUpperCase()}</span><div><span className="preview-category">{t(draft.industry)} · {t(draft.stage)}</span><h2>{draft.name || t('Startup name')}</h2></div></div><p className="preview-description">{draft.description}</p>{draft.about && <p className="startup-about">{draft.about}</p>}<div className="preview-team"><span>{t('Team members')}</span><p>{draft.team}</p></div></div></article>}
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
    <ImageUpload label="Event image" disabledReason="Event image uploads require a separate Storage policy from the backend team." value={draft.image} onChange={image => { setDraft(d => ({ ...d, image })); setSaved(false) }} />
    <label className="consent-toggle"><input type="checkbox" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />{t('Published')}</label>
    <button className="primary" disabled={!draft.title.trim() || !draft.place.trim()}>{t('Save event')}</button>
    {saved && <p role="status" className="success-banner">{t('Changes saved')}</p>}
  </form>
}
