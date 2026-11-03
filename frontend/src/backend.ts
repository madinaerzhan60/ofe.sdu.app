import { createClient } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import type { EventData, Submission } from './model'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const liveMode = Boolean(url && key) && import.meta.env.VITE_DEMO_MODE !== 'true'
// Capture failures before the auth client processes the callback URL. Never show
// provider descriptions (or tokens) from the URL in the application's error UI.
const redirectHref = window.location.href
const redirectUrl = new URL(redirectHref)
const redirectHash = new URLSearchParams(redirectUrl.hash.slice(1))
const authErrorParams = ['error', 'error_code', 'error_description']
const hasHashError = authErrorParams.some(key => redirectHash.has(key))
const authRedirectError = liveMode && (hasHashError || authErrorParams.some(key => redirectUrl.searchParams.has(key)))
  ? 'Could not sign in. Use your @sdu.edu.kz account and try again. If you cancelled, you can restart sign-in.'
  : ''
function clearAuthRedirectParams() {
  if (!authRedirectError || window.location.href !== redirectHref) return
  // Let Supabase reject the original failed callback first. Remove any attached
  // credentials too, so reloading cannot turn that failure into a sign-in.
  const callbackParams = [...authErrorParams, 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token', 'type', 'code', 'state']
  const hasCallbackHash = callbackParams.some(key => redirectHash.has(key))
  for (const key of callbackParams) {
    redirectUrl.searchParams.delete(key)
    redirectHash.delete(key)
  }
  if (hasCallbackHash) redirectUrl.hash = redirectHash.toString()
  window.history.replaceState(window.history.state, '', redirectUrl.pathname + redirectUrl.search + redirectUrl.hash)
}
export const backend = liveMode ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null

type State = { submissions: Submission[]; events: EventData[]; userId: string | null; userEmail: string; isAdmin: boolean }
export function usePlatform(samples: Submission[], sampleEvents: EventData[]) {
  const [state, setState] = useState<State>({submissions: liveMode ? [] : samples, events: liveMode ? [] : sampleEvents, userId:null, userEmail:'', isAdmin:false})
  const current = useRef(state)
  current.current = state
  const [authLoading, setLoading] = useState(liveMode)
  const [error, setError] = useState('')
  const [authError, setAuthError] = useState(authRedirectError)
  const [recovery, setRecovery] = useState(false)
  const generation = useRef(0)
  const pending = useRef(Promise.resolve())
  useEffect(() => {
    if (!backend) return
    let active = true
    const refresh = async () => {
      const request = ++generation.current
      setLoading(true)
      try {
        const session = await backend!.auth.getSession()
        clearAuthRedirectParams()
        if (session.error) throw session.error
        const user = session.data.session?.user
        // Clear private records before changing account, even if the network fails.
        if (active && generation.current === request && current.current.userId !== (user?.id ?? null)) {
          const cleared: State = {submissions:[], events:[], userId:user?.id ?? null, userEmail:user?.email ?? '', isAdmin:false}
          current.current = cleared; setState(cleared)
        }
        const [projects, events, role] = await Promise.all([
          backend!.from('projects').select('id,owner_id,data'),
          backend!.from('events').select('id,data'),
          user ? backend!.rpc('is_admin') : Promise.resolve({data:false,error:null}),
        ])
        if (projects.error || events.error || role.error) throw projects.error || events.error || role.error
        if (!active || generation.current !== request) return
        const next: State = {userId:user?.id ?? null, userEmail:user?.email ?? '', isAdmin:role.data === true,
          submissions:(projects.data ?? []).map(r => ({...r.data,id:r.id,ownerId:r.owner_id})),
          events:(events.data ?? []).map(r => ({...r.data,id:r.id})),}
        current.current = next; setState(next); setError('')
      } catch { if (active && generation.current === request) setError('Could not load your data. Check your connection and try again.') }
      finally { if (active && generation.current === request) setLoading(false) }
    }
    void refresh()
    const { data } = backend.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_IN') setAuthError('')
      // Do not await Supabase queries inside its auth callback.
      setTimeout(() => { if(active) void refresh() }, 0)
    })
    return () => {active=false; generation.current++; data.subscription.unsubscribe()}
  }, [])

  function change<K extends 'submissions' | 'events'>(kind: K, update: (rows: State[K]) => State[K]): Promise<boolean> {
    let resolve!: (value: boolean) => void
    const result = new Promise<boolean>(r => {resolve=r})
    pending.current = pending.current.then(async () => {
      const before = current.current
      const version = generation.current
      try {
        const rows = update(before[kind])
        const changed = rows.filter(row => JSON.stringify(row) !== JSON.stringify(before[kind].find(old => old.id === row.id)))
        if (backend && changed.length) {
          if (!before.userId) throw new Error('Sign in required')
          const table = kind === 'submissions' ? 'projects' : 'events'
          for (const row of changed) {
            const payload: Record<string, unknown> = kind === 'submissions' ? {id:row.id,owner_id:(row as Submission).ownerId,data:row} : {id:row.id,data:row}
            const exists = before[kind].some(old => old.id === row.id)
            const response = exists ? await backend.from(table).update(payload).eq('id',row.id).select('id') : await backend.from(table).insert(payload).select('id')
            if (response.error || response.data?.length !== 1) throw response.error ?? new Error('Write denied')
          }
          if (version !== generation.current) { resolve(false); return }
        }
        const next = {...current.current,[kind]:rows}
        current.current=next; setState(next); setError(''); resolve(true)
      } catch { setError('Your changes were not saved. Check your connection and permissions, then try again.'); resolve(false) }
    })
    return result
  }
  return {...state, liveMode, authLoading, recovery, finishRecovery:() => setRecovery(false), error:authError || error, clearError:() => {setAuthError('');setError('')},
    setSubmissions:(update:(rows:Submission[])=>Submission[]) => change('submissions', update),
    setEvents:(update:(rows:EventData[])=>EventData[]) => change('events', update),
  }
}
