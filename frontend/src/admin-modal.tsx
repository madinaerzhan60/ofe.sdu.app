import {useEffect,useRef,type ReactNode} from 'react'
import {useT} from './model'

export function AdminModal({ title, onClose, children, eyebrow = "Project details" }: { title: string; onClose: () => void; children: ReactNode; eyebrow?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const t = useT()
  useEffect(() => {
    const node = dialog.current
    const previousOverflow = document.body.style.overflow
    const opener = document.activeElement as HTMLElement | null
    node?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      node?.close()
      document.body.style.overflow = previousOverflow
      opener?.focus({preventScroll:true})
    }
  }, [])
  return <dialog ref={dialog} className="admin-modal" aria-labelledby="admin-modal-title" onCancel={e => {e.preventDefault();onClose()}} onClick={e => {
    if(e.target !== e.currentTarget)return
    const rect = e.currentTarget.getBoundingClientRect()
    if(e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)onClose()
  }}>
    <header className="admin-modal-header"><div><p>{t(eyebrow)}</p><h2 id="admin-modal-title">{title}</h2></div><button type="button" autoFocus aria-label={t('Close')} onClick={onClose}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    {children}
  </dialog>
}

