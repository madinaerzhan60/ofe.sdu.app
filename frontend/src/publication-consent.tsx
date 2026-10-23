import { useEffect, useState, type FormEvent } from 'react'
import { type Submission, useModel, useT } from './model'
import { demoOwnerId, ownsStartup } from './media'
import { publicationConsentVersion, withPublicationConsent } from './consent'

export function PublicationConsent({ row }: { row: Submission }) {
  const t = useT()
  const { userId, account, liveMode, setSubmissions, openPolicy } = useModel()
  const [granted, setGranted] = useState(row.publication)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setGranted(row.publication)
  }, [row.id, row.publication, row.consentVersion, userId])
  if (account !== 'student' || !ownsStartup(row, userId, liveMode)) return null
  const changed = granted !== row.publication || row.consentVersion !== publicationConsentVersion
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !changed) return
    setBusy(true); setSaved(false); setError('')
    try {
      const success = await setSubmissions(rows => {
        if (!rows.some(current => current.id === row.id && ownsStartup(current, userId, liveMode))) throw new Error('Project unavailable')
        return rows.map(current => current.id !== row.id ? current : liveMode
          ? withPublicationConsent(current, userId!, granted)
          : withPublicationConsent({...current,ownerId:demoOwnerId}, demoOwnerId, granted))
      })
      if (!success) throw new Error('Save failed')
      setSaved(true)
    } catch {
      setError('Could not save your publication consent. Check your connection and try again.')
    } finally { setBusy(false) }
  }
  return <form className="publication-consent" onSubmit={submit} aria-label={t('Publication permission')}>
    <div className="publication-consent-heading"><h3>{t('Publication permission')}</h3><span>{t(row.publication ? 'Permission granted' : 'Permission not granted')}</span></div>
    <p>{t('You control whether your project may appear in the public directory. Approval by a reviewer is also required.')}</p>
    <button type="button" className="inline-link" onClick={() => openPolicy('Startup Publication Consent')}>{t('Read publication consent')}</button>
    <label className="publication-consent-switch"><input type="checkbox" role="switch" checked={granted} disabled={busy} onChange={event => {setGranted(event.target.checked);setSaved(false);setError('')}} /><span>{t('I allow my project to be published.')}</span></label>
    {!granted && <p className="publication-consent-hint">{t('Saving without permission removes your project from the public directory. Your application stays in your workspace.')}</p>}
    <button type="submit" className="secondary" disabled={busy || !changed}>{t(busy ? 'Please wait…' : 'Save consent')}</button>
    <div aria-live="polite">{saved && <p className="success-banner" role="status">{t(liveMode ? 'Publication consent saved.' : 'Consent updated for this demo session only.')}</p>}</div>
    {error && <p className="form-error" role="alert">{t(error)}</p>}
  </form>
}
