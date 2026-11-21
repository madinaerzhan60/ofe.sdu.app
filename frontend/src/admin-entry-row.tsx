import { useId, type ReactNode } from 'react'
import { useT } from './model'
import { StorageImage } from './storage'
import { Icon } from './ui'

type EntryRowProps = {
  title: string
  subtitle: string
  image?: string
  status: string
  tone: 'review' | 'confirmed' | 'rejected' | 'removed'
  hasPresentation: boolean
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export function AdminEntryRow({ title, subtitle, image, status, tone, hasPresentation, open, onToggle, children }: EntryRowProps) {
  const t = useT()
  const detailsId = useId()
  return <li className={`reg-row${open ? ' is-open' : ''}`}>
    <button type="button" className="reg-row-head" aria-expanded={open} aria-controls={open ? detailsId : undefined} onClick={onToggle}>
      <span className="reg-logo" aria-hidden="true">{image ? <StorageImage src={image} alt="" /> : title.slice(0, 2).toUpperCase()}</span>
      <span className="reg-title"><strong>{title}</strong><small>{subtitle}</small></span>
      <span className={`status-badge is-${tone}`}><span className="status-dot" />{t(status)}</span>
      <span className={`reg-file${hasPresentation ? ' has-file' : ''}`} title={t(hasPresentation ? 'Presentation uploaded' : 'Not uploaded yet')}>
        <Icon name={hasPresentation ? 'check' : 'file'} size={16} />
      </span>
      <Icon name="chevron" size={18} className="reg-chevron" />
    </button>
    {open && <div className="reg-details" id={detailsId}>{children}</div>}
  </li>
}
