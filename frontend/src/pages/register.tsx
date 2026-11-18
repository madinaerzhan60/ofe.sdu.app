import { ImageUpload } from '../media'
import { StorageImage } from '../storage'
import { coverReference } from '../event-cover-storage'
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AuthPanel } from '../auth'
import { eventDate } from '../event-date'
import { AdminModal } from '../flows'
import { useModel, useT, type EventData } from '../model'
import { checkPresentation, createTeam, describeError, downloadPresentation, MAX_TEAM_SIZE, registrationOpen, removePresentation, saveTeamCover, updateTeam, uploadPresentation, useEventTeams, withdrawTeam, type EventTeam, type TeamInput } from '../registration'
import { Link } from '../router'
import { MemberEmailsField } from '../team-fields'
import { Icon, PageHero } from '../ui'
import { formatPhone, isPhone, isTelegram, normalizePhone, normalizeTelegram } from '../validation'

export const industries = ['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'Climate', 'Arts & culture', 'Food & hospitality', 'Social impact', 'Retail & services', 'Agriculture', 'Other']
const stages = ['Idea', 'Prototype', 'MVP', 'Seed', 'Growth']
const steps = ['Team', 'Product', 'Presentation', 'Review'] as const
const ALMATY = 5 * 3600000

export function useFoundersCup(): EventData {
  const { events } = useModel()
  return events.find(e => e.id === 'current' && e.published) ?? events.find(e => e.id !== 'archive' && e.published && e.date)
    ?? { id: 'current', title: 'SDU FOUNDERS CUP', date: '2026-11-23', place: 'Venue to be confirmed', published: false }
}
/** Deadline shown to people: the explicit one, or the start of the event day in Almaty. */
export function registrationDeadline(event: EventData) {
  const explicit = event.registrationDeadline ? Date.parse(event.registrationDeadline) : NaN
  if (!Number.isNaN(explicit)) return new Date(explicit)
  return new Date(Date.parse(`${event.date}T00:00:00Z`) - ALMATY)
}
export const registrationIsOpen = (event: EventData) => event.published && event.registration !== 'closed' && Date.now() < registrationDeadline(event).getTime()
const formatDeadline = (date: Date, lang: string) => new Intl.DateTimeFormat(lang === 'KK' ? 'kk-KZ' : lang === 'RU' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' }).format(new Date(date.getTime() - 60000))
const sizeLabel = (bytes: number) => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

type Draft = TeamInput & { consent: boolean }
const emptyDraft: Draft = { teamName: '', productName: '', tagline: '', description: '', industry: '', stage: '', productUrl: '', telegram: '', phone: '', members: [], consent: false }
const draftKey = (email: string) => `ofe:fc-draft:${email}`

function Field({ label, help, error, counter, children }: { label: string; help?: string; error?: string; counter?: string; children: React.ReactNode }) {
  const t = useT()
  return <label className={`field${error ? ' has-error' : ''}`}>
    <span className="field-label">{t(label)}{counter && <small className="field-counter">{counter}</small>}</span>
    {help && <small className="field-help">{t(help)}</small>}
    {children}
    {error && <span className="field-error" role="alert">{t(error)}</span>}
  </label>
}

function PresentationPicker({ file, onFile, existing, busy, compact }: { file?: File; onFile: (file?: File) => void; existing?: string; busy?: boolean; compact?: boolean }) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); const next = event.dataTransfer.files?.[0]; if (next) onFile(next) }
  return <div className={`dropzone${over ? ' is-over' : ''}${file || existing ? ' has-file' : ''}${compact && !file ? ' is-compact' : ''}`} onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={drop}>
    <input ref={input} type="file" className="sr-only" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} tabIndex={-1} aria-hidden="true" />
    {file || existing ? <div className="file-card">
      <span className="file-icon"><Icon name="file" size={24} /></span>
      <span className="file-meta"><strong>{file?.name ?? existing}</strong><small>{file ? sizeLabel(file.size) : t('Uploaded')}</small></span>
      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => input.current?.click()}>{t('Replace')}</button>
      {file && <button type="button" className="icon-button" aria-label={t('Remove file')} disabled={busy} onClick={() => onFile(undefined)}><Icon name="close" size={18} /></button>}
    </div> : compact ? <>
      <span>{t('Drop a new file here or')}</span>
      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => input.current?.click()}><Icon name="upload" size={16} />{t('Replace')}</button>
    </> : <>
      <span className="dropzone-icon"><Icon name="upload" size={28} /></span>
      <strong>{t('Drop your presentation here')}</strong>
      <span>{t('PDF or PPTX, up to 25 MB')}</span>
      <button type="button" className="btn btn-primary" onClick={() => input.current?.click()}>{t('Choose a file')}</button>
    </>}
  </div>
}

function Wizard({ event, captainEmail, team, onDone, onCancel, onStart }: { onStart: () => void; event: EventData; captainEmail: string; team?: EventTeam; onDone: (message: string) => void; onCancel?: () => void }) {
  const t = useT()
  const { lang } = useModel()
  const formId = useId()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => {
    if (team) return { ...team, productUrl: team.productUrl ?? '', phone: formatPhone(team.phone), members: team.members.filter(m => !m.isCaptain), consent: true }
    try { const saved = JSON.parse(sessionStorage.getItem(draftKey(captainEmail)) ?? 'null'); if (saved && typeof saved === 'object') return { ...emptyDraft, ...saved, telegram: '', phone: '', consent: false } } catch { /* ignore */ }
    return emptyDraft
  })
  const [file, setFile] = useState<File>()
  const [coverFile, setCoverFile] = useState<Blob>()
  const [cover, setCover] = useState(coverReference(team?.coverPath) ?? '')
  const [imageBusy, setImageBusy] = useState(false)
  const savedTeam = useRef(team)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = (patch: Partial<Draft>) => {
    setDraft(d => ({ ...d, ...patch }))
    setErrors(current => { const keys = Object.keys(patch).filter(key => key in current); if (!keys.length) return current; const next = { ...current }; for (const key of keys) delete next[key]; return next })
  }
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failure, setFailure] = useState('')
  const top = useRef<HTMLDivElement>(null)

  // Keep long texts if the tab is closed. Contacts are never stored in the browser.
  useEffect(() => {
    if (team) return
    const { teamName, productName, tagline, description, industry, stage, productUrl, members } = draft
    try { sessionStorage.setItem(draftKey(captainEmail), JSON.stringify({ teamName, productName, tagline, description, industry, stage, productUrl, members })) } catch { /* storage unavailable */ }
  }, [draft, team, captainEmail])

  const validate = (index: number) => {
    const next: Record<string, string> = {}
    if (index === 0) {
      if (draft.teamName.trim().length < 2) next.teamName = 'Enter the team name.'
      if (!isTelegram(draft.telegram)) next.telegram = 'Enter a Telegram username: 5–32 letters, digits or _.'
      if (!isPhone(draft.phone)) next.phone = 'Enter a Kazakhstan number, for example +7 701 123 45 67.'
    }
    if (index === 1) {
      if (draft.productName.trim().length < 2) next.productName = 'Enter the product name.'
      if (draft.tagline.trim().length < 10) next.tagline = 'Describe the product in one sentence (at least 10 characters).'
      if (!draft.industry) next.industry = 'Choose a field.'
      if (!draft.stage) next.stage = 'Choose a stage.'
      if (draft.description.trim().length < 50) next.description = 'Tell more about the product: at least 50 characters.'
      if (draft.productUrl && !/^https:\/\/\S{3,500}$/i.test(draft.productUrl.trim())) next.productUrl = 'The link must start with https://'
    }
    if (index === 3 && !draft.consent) next.consent = 'Confirm the consent to continue.'
    setErrors(next)
    if (Object.keys(next).length) requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${CSS.escape(formId)} [aria-invalid="true"], #${CSS.escape(formId)} .has-error input, #${CSS.escape(formId)} .has-error select, #${CSS.escape(formId)} .has-error textarea`)?.focus())
    return !Object.keys(next).length
  }
  const go = (index: number) => { setStep(index); setFailure(''); requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
  const next = () => { if (validate(step)) go(step + 1) }
  const pick = async (picked?: File) => {
    setFileError('')
    if (!picked) { setFile(undefined); return }
    try { await checkPresentation(picked); setFile(picked) }
    catch (problem) { setFile(undefined); setFileError(problem instanceof Error ? problem.message : 'Upload a PDF or PPTX file up to 25 MB.') }
  }
  const submit = async (event_: FormEvent) => {
    event_.preventDefault()
    if (step < steps.length - 1) { next(); return }
    for (let i = 0; i < steps.length; i++) if (i !== 2 && !validate(i)) { go(i); return }
    if (imageBusy) return
    setBusy(true); setFailure(''); setProgress(0); onStart()
    const input: TeamInput = { ...draft, telegram: normalizeTelegram(draft.telegram), phone: normalizePhone(draft.phone), productUrl: draft.productUrl?.trim() || undefined }
    try {
      let saved = savedTeam.current ?? team
      if (saved) await updateTeam(saved, input)
      else saved = await createTeam(event.id, captainEmail, input)
      savedTeam.current = saved
      if (coverFile || (!cover && saved.coverPath)) {
        saved = await saveTeamCover(saved, coverFile)
        savedTeam.current = saved
        setCover(coverReference(saved.coverPath) ?? ''); setCoverFile(undefined)
      }
      if (file) { await uploadPresentation(saved, file, setProgress); setFile(undefined) }
      try { sessionStorage.removeItem(draftKey(captainEmail)) } catch { /* ignore */ }
      onDone(team ? 'Registration updated.' : 'Your team is registered!')
    } catch (problem) { setFailure(describeError(problem)) }
    finally { setBusy(false) }
  }
  const deadline = formatDeadline(registrationDeadline(event), lang)
  return <form id={formId} className="wizard" onSubmit={submit} noValidate>
    <div ref={top} className="wizard-head">
      <p className="wizard-count">{t('Step')} {step + 1} {t('of')} {steps.length}</p>
      <ol className="wizard-steps">{steps.map((name, i) => <li key={name} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
        <button type="button" disabled={i > step || busy} aria-current={i === step ? 'step' : undefined} onClick={() => go(i)}><span className="wizard-dot">{i < step ? <Icon name="check" size={14} strokeWidth={2.4} /> : i + 1}</span><span className="wizard-name">{t(name)}</span></button>
      </li>)}</ol>
      <div className="wizard-bar" aria-hidden="true"><span style={{ transform: `scaleX(${(step + 1) / steps.length})` }} /></div>
    </div>

    {step === 0 && <section className="wizard-panel" aria-labelledby={`${formId}-0`}>
      <h2 id={`${formId}-0`}>{t('Your team')}</h2>
      <Field label="Team name" error={errors.teamName}><input autoFocus maxLength={80} value={draft.teamName} aria-invalid={Boolean(errors.teamName)} onChange={e => update({ teamName: e.target.value })} /></Field>
      <div className="captain-card"><span className="member-avatar" aria-hidden="true"><Icon name="flag" size={16} /></span><span><small>{t('Captain')}</small><strong>{captainEmail}</strong></span></div>
      <div className="form-grid-2">
        <Field label="Captain’s Telegram" error={errors.telegram}><span className="input-with-icon"><Icon name="telegram" size={18} /><input autoComplete="off" placeholder="@username" value={draft.telegram} aria-invalid={Boolean(errors.telegram)} onChange={e => update({ telegram: e.target.value })} onBlur={() => draft.telegram && setDraft(d => ({ ...d, telegram: normalizeTelegram(d.telegram) }))} /></span></Field>
        <Field label="Captain’s phone" error={errors.phone}><span className="input-with-icon"><Icon name="phone" size={18} /><input type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 7__ ___ __ __" value={draft.phone} aria-invalid={Boolean(errors.phone)} onChange={e => update({ phone: e.target.value })} onBlur={() => isPhone(draft.phone) && setDraft(d => ({ ...d, phone: formatPhone(d.phone) }))} /></span></Field>
      </div>
      <MemberEmailsField members={draft.members} ownEmail={captainEmail} max={MAX_TEAM_SIZE - 1} onChange={members => update({ members })} />
      <p className="field-note">{t('Up to 6 people including the captain. You can captain one team and join one other team.')}</p>
    </section>}

    {step === 1 && <section className="wizard-panel" aria-labelledby={`${formId}-1`}>
      <h2 id={`${formId}-1`}>{t('Your product')}</h2>
      <Field label="Product name" error={errors.productName}><input autoFocus maxLength={100} value={draft.productName} aria-invalid={Boolean(errors.productName)} onChange={e => update({ productName: e.target.value })} /></Field>
      <Field label="One-sentence pitch" help="What the product does and for whom." error={errors.tagline} counter={`${draft.tagline.length}/160`}><input maxLength={160} value={draft.tagline} aria-invalid={Boolean(errors.tagline)} onChange={e => update({ tagline: e.target.value })} /></Field>
      <div className="form-grid-2">
        <Field label="Field" error={errors.industry}><select value={draft.industry} aria-invalid={Boolean(errors.industry)} onChange={e => update({ industry: e.target.value })}><option value="">{t('Select industry')}</option>{industries.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></Field>
        <Field label="Stage" error={errors.stage}><select value={draft.stage} aria-invalid={Boolean(errors.stage)} onChange={e => update({ stage: e.target.value })}><option value="">{t('Select stage')}</option>{stages.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></Field>
      </div>
      <Field label="Product description" help="The problem, your solution, who your users are and what you have already done." error={errors.description} counter={`${draft.description.length}/3000`}><textarea rows={8} maxLength={3000} value={draft.description} aria-invalid={Boolean(errors.description)} onChange={e => update({ description: e.target.value })} /></Field>
      <ImageUpload outputType="image/png" label="Project cover (optional)" value={cover} pendingFile={coverFile} onPrepared={setCoverFile} onChange={setCover} onBusyChange={setImageBusy} disabledReason={busy ? 'Please wait…' : ''} />
      <p className="field-note">{t('Optional. The photo appears after OFE confirmation. Without a photo, the project is shown with its name.')}</p>
      <Field label="Product link (optional)" error={errors.productUrl}><input type="url" inputMode="url" placeholder="https://" value={draft.productUrl ?? ''} aria-invalid={Boolean(errors.productUrl)} onChange={e => update({ productUrl: e.target.value })} /></Field>
    </section>}

    {step === 2 && <section className="wizard-panel" aria-labelledby={`${formId}-2`}>
      <h2 id={`${formId}-2`}>{t('Presentation')}</h2>
      <p className="wizard-lead">{t('Upload the pitch deck you will show on stage. You can also add or replace it later, until')} {deadline}.</p>
      <PresentationPicker file={file} existing={team?.presentationName} onFile={picked => void pick(picked)} busy={busy} />
      {fileError && <p className="field-error" role="alert">{t(fileError)}</p>}
      <ul className="tips"><li><Icon name="check" size={16} />{t('PDF keeps fonts and layout exactly as you made them.')}</li><li><Icon name="check" size={16} />{t('Only your team and the OFE organisers can open the file.')}</li></ul>
    </section>}

    {step === 3 && <section className="wizard-panel" aria-labelledby={`${formId}-3`}>
      <h2 id={`${formId}-3`}>{t('Check and send')}</h2>
      <dl className="review-list">
        <div><dt>{t('Team name')}</dt><dd>{draft.teamName}</dd><button type="button" className="link-arrow" onClick={() => go(0)}>{t('Edit')}</button></div>
        <div><dt>{t('Team members')}</dt><dd>{[captainEmail + ' · ' + t('Captain'), ...draft.members.map(m => `${m.email} · ${t(m.role === 'Other' ? 'Other role' : m.role)}`)].map(line => <span key={line}>{line}</span>)}</dd><button type="button" className="link-arrow" onClick={() => go(0)}>{t('Edit')}</button></div>
        <div><dt>{t('Contacts')}</dt><dd>{normalizeTelegram(draft.telegram)} · {formatPhone(draft.phone)}</dd><button type="button" className="link-arrow" onClick={() => go(0)}>{t('Edit')}</button></div>
        <div><dt>{t('Product')}</dt><dd><strong>{draft.productName}</strong><span>{draft.tagline}</span><span>{t(draft.industry)} · {t(draft.stage)}</span></dd><button type="button" className="link-arrow" onClick={() => go(1)}>{t('Edit')}</button></div>
        <div><dt>{t('Project cover (optional)')}</dt><dd>{t(coverFile || cover ? 'Photo added' : 'No photo')}</dd><button type="button" className="link-arrow" onClick={() => go(1)}>{t('Edit')}</button></div>
        <div><dt>{t('Presentation')}</dt><dd>{file?.name ?? team?.presentationName ?? t('Not uploaded yet')}</dd><button type="button" className="link-arrow" onClick={() => go(2)}>{t('Edit')}</button></div>
      </dl>
      <label className={`consent-check${errors.consent ? ' has-error' : ''}`}>
        <input type="checkbox" checked={draft.consent} aria-invalid={Boolean(errors.consent)} onChange={e => update({ consent: e.target.checked })} />
        <span>{t('I agree that OFE processes the team’s data to organise SDU Founders Cup, and I confirm that my teammates agreed to be added.')}</span>
      </label>
      {errors.consent && <p className="field-error" role="alert">{t(errors.consent)}</p>}
    </section>}

    {failure && <p className="form-failure" role="alert"><Icon name="close" size={18} />{t(failure)}</p>}
    {busy && progress > 0 && <div className="upload-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={t('Uploading presentation')}><span style={{ transform: `scaleX(${progress})` }} /></div>}
    <div className="wizard-actions">
      {step > 0 ? <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => go(step - 1)}>{t('Back')}</button> : onCancel ? <button type="button" className="btn btn-ghost" disabled={busy || imageBusy} onClick={onCancel}>{t('Cancel')}</button> : <span />}
      <button type="submit" className="btn btn-accent btn-lg" disabled={busy || imageBusy}>{busy ? t('Please wait…') : step < steps.length - 1 ? t('Continue') : t(team ? 'Save changes' : 'Register the team')}{!busy && <Icon name="arrow" size={18} />}</button>
    </div>
  </form>
}

const statusMeta = { submitted: ['Under review', 'is-review'], confirmed: ['Confirmed', 'is-confirmed'], rejected: ['Not accepted', 'is-rejected'] } as const

function TeamDashboard({ team, captain, open, event, onEdit }: { team: EventTeam; captain: boolean; open: boolean; event: EventData; onEdit?: () => void }) {
  const t = useT()
  const { lang } = useModel()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [file, setFile] = useState<File>()
  const [label, tone] = statusMeta[team.status]
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action() } catch (problem) { setError(describeError(problem)) } finally { setBusy(false) } }
  return <div className="team-dashboard">
    <div className="team-hero-card reveal-up">
      <div>
        <span className={`status-badge ${tone}`}><span className="status-dot" />{t(label)}</span>
        <h2>{team.teamName}</h2>
        <p>{team.productName} — {team.tagline}</p>
      </div>
      {captain && open && <button type="button" className="btn btn-outline" onClick={onEdit}><Icon name="edit" size={18} />{t('Edit registration')}</button>}
    </div>
    {team.adminNote && <p className="notice notice-strong"><strong>{t('Message from OFE')}:</strong> {team.adminNote}</p>}
    {!open && <p className="notice">{t('Registration is closed. Changes are no longer possible.')}</p>}
    <div className="team-grid">
      <section className="side-card reveal-up">
        <h3>{t('Checklist')}</h3>
        <ul className="checklist">
          <li className="is-done"><Icon name="check" size={18} />{t('Team registered')}</li>
          <li className={team.presentationPath ? 'is-done' : ''}><Icon name={team.presentationPath ? 'check' : 'image'} size={18} />{t(team.presentationPath ? 'Presentation uploaded' : 'Upload the presentation')}</li>
          <li className={team.status === 'confirmed' ? 'is-done' : ''}><Icon name={team.status === 'confirmed' ? 'check' : 'eye'} size={18} />{t(team.status === 'confirmed' ? 'Confirmed by OFE' : 'Waiting for OFE review')}</li>
        </ul>
        <p className="field-note">{t('Event date')}: {eventDate(event.date, lang).full}</p>
      </section>
      <section className="side-card reveal-up" style={{ '--i': 1 } as React.CSSProperties}>
        <h3>{t('Team members')}</h3>
        <ul className="member-list">{team.members.map(m => <li key={m.email}><strong>{m.email}</strong><small>{t(m.isCaptain ? 'Captain' : m.role === 'Other' ? 'Other role' : m.role)}</small></li>)}</ul>
      </section>
      <section className="side-card team-presentation reveal-up" style={{ '--i': 2 } as React.CSSProperties}>
        <h3>{t('Presentation')}</h3>
        {team.presentationPath ? <div className="file-card">
          <span className="file-icon"><Icon name="file" size={22} /></span>
          <span className="file-meta"><strong>{team.presentationName}</strong><small>{team.presentationPath.endsWith('.pptx') ? 'PPTX' : 'PDF'}</small></span>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(() => downloadPresentation(team))}><Icon name="download" size={16} />{t('Download')}</button>
        </div> : <p className="field-note">{t('Not uploaded yet')}</p>}
        {captain && open && <>
          <PresentationPicker compact={Boolean(team.presentationPath)} file={file} onFile={async picked => { setError(''); if (!picked) { setFile(undefined); return } try { await checkPresentation(picked); setFile(picked) } catch (problem) { setError(problem instanceof Error ? problem.message : '') } }} busy={busy} />
          {file && <button type="button" className="btn btn-accent" disabled={busy} onClick={() => run(async () => { await uploadPresentation(team, file); setFile(undefined) })}>{t(busy ? 'Uploading…' : 'Upload presentation')}</button>}
          {team.presentationPath && !file && <button type="button" className="link-arrow" disabled={busy} onClick={() => run(() => removePresentation(team))}>{t('Remove the presentation')}</button>}
        </>}
      </section>
    </div>
    <section className="side-card reveal-up"><h3>{t('Project cover (optional)')}</h3>{team.coverPath ? <div className="image-upload-preview"><StorageImage src={coverReference(team.coverPath)} alt={team.productName}/></div> : <p className="field-note">{t('No photo')}</p>}</section>
    <section className="side-card reveal-up"><h3>{t('Product description')}</h3><div className="prose">{team.description.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}</div>{team.productUrl && <a className="link-arrow" href={team.productUrl} target="_blank" rel="noopener noreferrer nofollow">{team.productUrl}<Icon name="arrowUpRight" size={16} /></a>}</section>
    {error && <p className="form-failure" role="alert">{t(error)}</p>}
    {captain && open && <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirmWithdraw(true)}>{t('Withdraw the team')}</button>}
    {!captain && <p className="field-note">{t('The captain manages the registration:')} {team.captainEmail}</p>}
    {confirmWithdraw && <AdminModal title={team.teamName} eyebrow="Withdraw the team" onClose={() => setConfirmWithdraw(false)}>
      <div className="modal-form-body"><p>{t('The registration, cover and presentation will be deleted. This cannot be undone.')}</p></div>
      <div className="modal-form-actions"><button type="button" className="secondary" onClick={() => setConfirmWithdraw(false)}>{t('Cancel')}</button><button type="button" className="primary danger-button" disabled={busy} onClick={() => run(async () => { await withdrawTeam(team); setConfirmWithdraw(false) })}>{t('Withdraw')}</button></div>
    </AdminModal>}
  </div>
}

export function Register() {
  const t = useT()
  const event = useFoundersCup()
  const { account, userEmail, liveMode, authLoading, lang, isAdmin } = useModel()
  const email = userEmail.toLowerCase()
  const { teams, loading, error, reload } = useEventTeams(event.id, account === 'student' ? email : '')
  const [open, setOpen] = useState(registrationIsOpen(event))
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => { let alive = true; void registrationOpen(event.id, registrationIsOpen(event)).then(value => { if (alive) setOpen(value) }); return () => { alive = false } }, [event])
  const mine = teams.find(team => team.captainEmail === email)
  const memberships = teams.filter(team => team.captainEmail !== email && team.members.some(member => member.email === email))
  const hasRegistration = Boolean(mine || memberships.length)
  const deadline = formatDeadline(registrationDeadline(event), lang)
  return <main id="main" className="register-page">
    <PageHero eyebrow="SDU Founders Cup" crumbs={[{ label: 'Events', to: 'events' }, { label: 'SDU Founders Cup', to: 'demo' }, { label: 'Team registration' }]} image="/demo-day/IMG_7414.webp"
      title={t('Register your team')} lead={<>{eventDate(event.date, lang).full} · {t(event.place)}<br />{t(open ? 'Registration is open until' : 'Registration closed on')} {deadline}</>}>
      <ul className="hero-facts"><li><Icon name="users" size={18} />{t('1–6 people with @sdu.edu.kz emails')}</li><li><Icon name="bulb" size={18} />{t('Product description')}</li><li><Icon name="image" size={18} />{t('Presentation: PDF or PPTX')}</li></ul>
    </PageHero>
    <section className="pg-section pg-section-tight"><div className="wrap register-layout">
      <div className="register-main">
        {notice && <p className="success-banner" role="status"><Icon name="check" size={18} />{t(notice)}</p>}
        {account !== 'student' ? <div className="register-auth">
          <h2>{t('Sign in to register')}</h2>
          <p>{t('Only corporate @sdu.edu.kz accounts can register. Use your SDU Google account or your SDU email and a password.')}</p>
          <AuthPanel />
        </div>
        : authLoading || (liveMode && loading && !teams.length) ? <div className="skeleton-card" aria-busy="true"><span /><span /><span /></div>
        : error ? <div className="empty-state"><h3>{t(error)}</h3><button type="button" className="btn btn-outline" onClick={() => void reload()}>{t('Try again')}</button></div>
        : isAdmin && !hasRegistration ? <div className="empty-state"><Icon name="grid" size={32} /><h3>{t('Administrators manage registrations in the admin panel.')}</h3><Link to="admin" className="btn btn-primary">{t('Workspace management')}</Link></div>
        : hasRegistration && (!editing || !open) ? <>
          {mine && <TeamDashboard key={mine.id} team={mine} captain open={open} event={event} onEdit={() => { setEditing(true); setNotice('') }} />}
          {!mine && open && !isAdmin && <div className="side-card">
            <button type="button" className="btn btn-accent" onClick={() => { setEditing(true); setNotice('') }}>{t('Register your own project')}<Icon name="arrow" size={18} /></button>
          </div>}
          {memberships.length > 0 && <h2>{t('Teams you joined')}</h2>}
          {memberships.map(team => <TeamDashboard key={team.id} team={team} captain={false} open={open} event={event} />)}
        </>
        : !open ? <div className="empty-state"><Icon name="calendar" size={32} /><h3>{t('Registration is closed.')}</h3><Link to="demo" className="btn btn-outline">{t('About the event')}</Link></div>
        : <Wizard key={`${event.id}:${email}`} event={event} captainEmail={email} team={editing ? mine : undefined} onCancel={editing ? () => setEditing(false) : undefined} onStart={() => setEditing(true)} onDone={message => { setEditing(false); setNotice(message); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
      </div>
      <aside className="register-aside">
        <div className="side-card">
          <h3>{t('How it works')}</h3>
          <ol className="mini-steps"><li>{t('Sign in with your SDU account')}</li><li>{t('Add your teammates by their SDU emails')}</li><li>{t('Describe the product and upload the deck')}</li><li>{t('OFE confirms the team before the event')}</li></ol>
        </div>
        <div className="side-card"><h3>{t('Your data is protected')}</h3><p className="field-note">{t('Contacts, member emails and presentations stay private. Confirmed product information and an optional cover appear in the project catalog.')}</p></div>
      </aside>
    </div></section>
  </main>
}
