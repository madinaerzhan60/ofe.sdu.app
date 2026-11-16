import {useState} from 'react'
import {AdminModal} from './admin-modal'
import {useT} from './model'

export function ProjectRemovalDialog({name,onConfirm,onClose}:{name:string;onConfirm:()=>Promise<boolean>;onClose:()=>void}) {
  const t=useT()
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState(false)
  return <AdminModal title={name} eyebrow="Remove project" onClose={()=>{if(!busy)onClose()}}>
    <form onSubmit={async e=>{
      e.preventDefault();if(busy)return;setBusy(true);setError(false)
      try {if(await onConfirm())onClose();else setError(true)}
      catch {setError(true)} finally {setBusy(false)}
    }}>
      <div className="modal-form-body"><p>{t('Remove this project from the workspace and public catalog? Administrators can restore it from Removed. Its files and history will be kept.')}</p>
      {error&&<p className="form-error" role="alert">{t('Could not remove the project. Please try again.')}</p>}</div>
      <div className="modal-form-actions"><button type="button" autoFocus className="secondary" disabled={busy} onClick={onClose}>{t('Cancel')}</button><button type="submit" className="primary danger-button" disabled={busy}>{t(busy?'Please wait…':'Remove project')}</button></div>
    </form>
  </AdminModal>
}
