import { useEffect, useState } from 'react'
import { type Submission, useModel, useT } from './model'
import { demoOwnerId, ownsStartup } from './media'
import { withPublicationConsent } from './consent'

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
  const save = async (nextGranted: boolean) => {
    if (busy) return
    setGranted(nextGranted)
    setBusy(true); setSaved(false); setError('')
    try {
      const success = await setSubmissions(rows => {
        if (!rows.some(current => current.id === row.id && ownsStartup(current, userId, liveMode))) throw new Error('Project unavailable')
        return rows.map(current => current.id !== row.id ? current : liveMode
          ? withPublicationConsent(current, userId!, nextGranted)
          : withPublicationConsent({...current,ownerId:demoOwnerId}, demoOwnerId, nextGranted))
      })
      if (!success) throw new Error('Save failed')
      setSaved(true)
    } catch {
      setGranted(row.publication)
      setError('Could not save your publication consent. Check your connection and try again.')
    } finally { setBusy(false) }
  }
  return <section className="publication-consent" aria-label={t('Publication permission')}>
    <div className="publication-consent-heading"><h3>{t('Publication permission')}</h3><span>{t(row.publication ? 'Permission granted' : 'Permission not granted')}</span></div>
    <p>{t('You control whether your project may appear in the public directory. Approval by a reviewer is also required.')}</p>
    <button type="button" className="inline-link" onClick={() => openPolicy('Startup Publication Consent')}>{t('Read publication consent')}</button>
    <label className="publication-consent-switch"><input type="checkbox" checked={granted} disabled={busy} onChange={event => { void save(event.target.checked) }} /><span>{t('I allow my project to be published.')}</span></label>
    {!granted && <p className="publication-consent-hint">{t('Saving without permission removes your project from the public directory. Your application stays in your workspace.')}</p>}
    <div aria-live="polite">{busy && <p role="status">{t('Please wait…')}</p>}{saved && <p className="success-banner" role="status">{t(liveMode ? 'Publication consent saved.' : 'Consent updated for this demo session only.')}</p>}</div>
    {error && <p className="form-error" role="alert">{t(error)}</p>}
  </section>
}
