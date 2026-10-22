import { useState, type FormEvent } from 'react'
import { backend } from './backend'
import { useModel, useT } from './model'

export function AuthPanel({ recovery = false }: { recovery?: boolean }) {
  const t = useT()
  const {finishRecovery} = useModel()
  const [mode,setMode] = useState<'signup'|'signin'|'reset'>( 'signup')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [name,setName] = useState('')
  const [show,setShow] = useState(false)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  const googleEnabled = Boolean(backend && import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true')
  const [confirmation,setConfirmation] = useState('')
  const submit = async (event:FormEvent) => {
    event.preventDefault()
    if(!backend || busy)return
    setError('');setMessage('');setBusy(true)
    try {
      if(recovery) {
        if(password !== confirmation) {setError('Passwords do not match.');return}
        const result = await backend.auth.updateUser({password})
        if(result.error)throw result.error
        finishRecovery();return
      }
      if(mode === 'signup') {
        const result = await backend.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()},emailRedirectTo:window.location.origin + window.location.pathname}})
        if(result.error)throw result.error
        if(!result.data.session) {setMessage('Check your email and follow the confirmation link. Then return here to sign in.');setMode('signin')}
      } else if(mode === 'signin') {
        const result = await backend.auth.signInWithPassword({email:email.trim(),password})
        if(result.error)throw result.error
      } else {
        const result = await backend.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin + window.location.pathname})
        if(result.error)throw result.error
        setMessage('If an account exists for this email, a password reset link will be sent.');
      }
      setPassword('')
    } catch(error) {
      const code=(error as {code?:string}).code
      setError(code === 'invalid_credentials' ? 'Email or password is incorrect.' : code === 'email_not_confirmed' ? 'Confirm your email before signing in.' : code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' ? 'Too many attempts. Please wait and try again.' : code === 'weak_password' ? 'Choose a stronger password with at least 10 characters.' : 'Could not complete this request. Check your connection and try again.')
    } finally {setBusy(false)}
  }
  return <section className="auth-panel"><p className="eyebrow auth-eyebrow">SDU FOUNDERS COMMUNITY</p><h2>{t(recovery ? 'Choose a new password' : mode === 'signup' ? 'Create your account' : mode === 'signin' ? 'Welcome back' : 'Reset your password')}</h2>
    {!recovery && <div className="auth-tabs"><button type="button" className={mode==='signup'?'active':''} onClick={() => {setMode('signup');setError('');setMessage('')}}>{t('Create account')}</button><button type="button" className={mode==='signin'?'active':''} onClick={() => {setMode('signin');setError('');setMessage('')}}>{t('Sign in')}</button></div>}
    {!recovery && mode !== 'reset' && <><button type="button" className="google-signin" disabled={busy || !googleEnabled} onClick={async () => {
      if(!backend || !googleEnabled || busy)return
      setBusy(true);setError('')
      try {const result = await backend.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin + window.location.pathname}});if(result.error)throw result.error}
      catch {setError('Could not complete this request. Check your connection and try again.');setBusy(false)}
    }}><svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5a12.3 12.3 0 0 1-18.2-6.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8l6.8-5.2Z"/><path fill="#EA4335" d="M24 12a11 11 0 0 1 7.8 3l5.8-5.7A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.1l6.8 5.2A12 12 0 0 1 24 12Z"/></svg><span>{t('Continue with Google')}</span></button>{!googleEnabled && <p className="auth-provider-note">{t('Google sign-in is not connected yet.')}</p>}<div className="auth-divider"><span>{t('or use your email')}</span></div></>}
    {!backend && <p className="prototype-note auth-service-note">{t('Account registration will be available after the service is connected.')}</p>}<form onSubmit={submit}>
      {!recovery && mode === 'signup' && <label>{t('Your name')}<input required maxLength={100} autoComplete="name" placeholder={t("How should we call you?")} value={name} onChange={e=>setName(e.target.value)} /></label>}
      {!recovery && <label>Email<input type="email" required placeholder="you@example.com" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></label>}
      {(recovery || mode !== 'reset') && <><label>{t('Password')}<div className="password-input"><input placeholder={t(mode === "signin" ? "Enter your password" : "Create a password")} type={show?'text':'password'} required minLength={mode==='signup'||recovery?10:1} maxLength={128} autoComplete={recovery||mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} /><button type="button" aria-label={t(show?'Hide password':'Show password')} onClick={()=>setShow(!show)}>{t(show?'Hide':'Show')}</button></div>{(mode==='signup'||recovery) && <small>{t('At least 10 characters. Use a unique password.')}</small>}</label>{recovery && <label>{t('Confirm password')}<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label>}</>}
      {error && <p role="alert" className="form-error">{t(error)}</p>}{message && <p role="status" className="success-banner">{t(message)}</p>}
      <button className="primary" disabled={busy || !backend}><span>{t(busy?'Please wait…':recovery?'Save new password':mode==='signup'?'Create account':mode==='signin'?'Sign in':'Send reset link')}</span><span aria-hidden="true">↗</span></button>
      {!recovery && mode==='signin' && <button type="button" className="inline-link" onClick={()=>{setMode('reset');setError('');setMessage('')}}>{t('Forgot your password?')}</button>}
    </form>
  </section>
}

export function BackendNotice({message,onClose}:{message:string;onClose:()=>void}) {
 const t=useT()
 return <div className="shell form-error" role="alert">{t(message)} <button type="button" className="inline-link" aria-label={t('Close')} onClick={onClose}>×</button></div>
}
