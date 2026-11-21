import { useRef, useState } from 'react'
import { useT, type Submission } from './model'
import { downloadCatalogPdf, uploadCatalogPdf, uploadTeamPdf, type EventTeam } from './registration'
import { Icon } from './ui'

export function AdminPdfUpload({ onUpload, disabled }: { onUpload: (file: File) => Promise<void>; disabled?: boolean }) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [problem, setProblem] = useState('')
  if (uploaded) return <p className="field-note" role="status">{t('Presentation uploaded')}</p>
  return <div className="admin-pdf-upload">
    <button type="button" className="btn btn-outline btn-sm" disabled={disabled || busy} onClick={() => input.current?.click()}>
      <Icon name="upload" size={16} />{t(busy ? 'Uploading…' : 'Upload PDF for participant')}
    </button>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept=".pdf,application/pdf" disabled={disabled || busy} onChange={async event => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (!file) return
        setBusy(true)
        setProblem('')
        try {
          await onUpload(file)
          setUploaded(true)
        } catch (error) {
          const message = String((error as {message?: string})?.message ?? '')
          setProblem(/25 MB/.test(message) ? 'Choose a PDF up to 25 MB.' : /already|duplicate|resource exists/i.test(message) ? 'This project already has a PDF.' : 'Could not upload the PDF. Please try again.')
        } finally {
          setBusy(false)
        }
    }} />
    {problem && <p className="form-error" role="alert">{t(problem)}</p>}
  </div>
}

export function AdminTeamPdfUpload({ team, disabled }: { team: EventTeam; disabled: boolean }) {
  return <AdminPdfUpload disabled={disabled} onUpload={file => uploadTeamPdf(team, file)} />
}

export function CatalogPresentation({ project, canUpload = false }: { project: Submission; canUpload?: boolean }) {
  const t = useT()
  const [problem, setProblem] = useState(false)
  const [busy, setBusy] = useState(false)
  if (project.presentationAvailable) return <div className="catalog-presentation">
    <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={async () => {
      setBusy(true)
      setProblem(false)
      try { await downloadCatalogPdf(project) } catch { setProblem(true) } finally { setBusy(false) }
    }}><Icon name="download" size={16} />{t('Download PDF')}</button>
    {problem && <p className="form-error" role="alert">{t('Could not download the presentation. Please try again.')}</p>}
  </div>
  if (!canUpload || project.removed || project.presentationAvailable !== false) return null
  return <AdminPdfUpload onUpload={file => uploadCatalogPdf(project, file)} />
}
