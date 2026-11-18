import { createClient } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import type { EventData, Member, NewsPost, ProjectContact, Submission } from './model'
import type { EventProject } from './catalog'

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
export const backend = liveMode ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null

const catalogListeners = new Set<() => void>()
export const notifyCatalogChanged = () => catalogListeners.forEach(refresh => refresh())

type State = { submissions: Submission[]; eventProjects: EventProject[]; events: EventData[]; news: NewsPost[]; userId: string | null; userEmail: string; isAdmin: boolean; isMediaEditor: boolean }
type Kind = 'submissions' | 'events' | 'news'
// Tables added by 20261113120000_media_news_members_contacts.sql. Until that migration
// is applied, reads fall back to empty data instead of breaking the whole site.
const missing = (error: {code?: string} | null) => Boolean(error && ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(error.code ?? ''))
const privateKeys = ['members', 'contact', 'eventIds', 'removed'] as const
const publicData = (row: Submission) => { const copy: Record<string, unknown> = {...row}; for (const key of privateKeys) delete copy[key]; return copy }
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export const newsMediaBucket = 'news-media'
export async function uploadNewsCover(file: Blob, newsId: string) {
  if (!backend) throw new Error('Uploads need the platform connection.')
  const path = `${newsId}/${Date.now()}.webp`
  const result = await backend.storage.from(newsMediaBucket).upload(path, file, {contentType: 'image/webp', upsert: false})
  if (result.error) throw new Error('Image upload failed.')
  return backend.storage.from(newsMediaBucket).getPublicUrl(path).data.publicUrl
}
export async function listMediaEditors(): Promise<{email: string; added_at: string}[]> {
  if (!backend) return []
  const result = await backend.rpc('list_media_editors')
  if (result.error) throw result.error
  return result.data ?? []
}
export async function setMediaEditor(email: string, enabled: boolean) {
  if (!backend) return
  const result = await backend.rpc('set_media_editor', {target_email: email, enabled})
  if (result.error) throw new Error(/No confirmed account/.test(result.error.message) ? 'No confirmed account uses this email.' : /sdu\.edu\.kz/.test(result.error.message) ? 'Use an @sdu.edu.kz email.' : 'Could not update the media team.')
}
export async function setWorkspaceProjectRemoved(targetId: string, kind: 'project' | 'event-team', removed: boolean) {
  if (!backend) return
  const result = await backend.rpc('set_workspace_project_removed',{target_id:targetId,kind,removed})
  if (result.error) throw result.error
}
export function usePlatform(samples: Submission[], sampleEvents: EventData[], sampleNews: NewsPost[] = []) {
  const [state, setState] = useState<State>({submissions: liveMode ? [] : samples, eventProjects: [], events: liveMode ? [] : sampleEvents, news: liveMode ? [] : sampleNews, userId:null, userEmail:'', isAdmin:false, isMediaEditor:false})
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
    const refresh = async (background = false) => {
      const request = ++generation.current
      if (!background) setLoading(true)
      try {
        const session = await backend!.auth.getSession()
        clearAuthRedirectParams()
        if (session.error) throw session.error
        const user = session.data.session?.user
        // Clear private records before changing account, even if the network fails.
        if (active && generation.current === request && current.current.userId !== (user?.id ?? null)) {
          const cleared: State = {submissions:[], eventProjects:[], events:[], news:[], userId:user?.id ?? null, userEmail:user?.email ?? '', isAdmin:false, isMediaEditor:false}
          current.current = cleared; setState(cleared)
        }
        const none = Promise.resolve({data:null,error:null})
        const [projects, events, role, news, media, contacts, members, eventProducts, assignments, removals] = await Promise.all([
          backend!.from('projects').select('id,owner_id,data'),
          backend!.from('events').select('id,data'),
          user ? backend!.rpc('is_admin') : Promise.resolve({data:false,error:null}),
          backend!.from('news').select('id,data'),
          user ? backend!.rpc('is_media_editor') : Promise.resolve({data:false,error:null}),
          user ? backend!.from('project_contacts').select('project_id,telegram,phone') : none,
          user ? backend!.from('project_members').select('project_id,email,role') : none,
          backend!.rpc('list_confirmed_event_projects'),
          backend!.from('project_events').select('project_id,event_id'),
          user ? backend!.rpc('list_removed_workspace_projects') : none,
        ])
        if (projects.error || events.error || role.error || eventProducts.error || assignments.error || removals.error) throw projects.error || events.error || role.error || eventProducts.error || assignments.error || removals.error
        for (const optional of [news, media, contacts, members]) if (optional.error && !missing(optional.error)) throw optional.error
        if (!active || generation.current !== request) return
        const contactRows = (contacts.data ?? []) as {project_id:string; telegram:string; phone:string}[]
        const memberRows = (members.data ?? []) as {project_id:string; email:string; role:string}[]
        const next: State = {userId:user?.id ?? null, userEmail:user?.email ?? '', isAdmin:role.data === true, isMediaEditor:media.data === true,
          submissions:(projects.data ?? []).map(r => {
            const contact = contactRows.find(c => c.project_id === r.id)
            return {...r.data,id:r.id,ownerId:r.owner_id,
              removed: (removals.data ?? []).some((item: {kind:string;target_id:string}) => item.kind === 'project' && item.target_id === r.id),
              eventIds: (assignments.data ?? []).filter(a => a.project_id === r.id).map(a => a.event_id),
              contact: contact ? {telegram:contact.telegram, phone:contact.phone} : undefined,
              members: memberRows.filter(m => m.project_id === r.id).map(m => ({email:m.email, role:m.role}))}
          }),
          eventProjects: (eventProducts.data ?? []).map((r: {id:string;event_id:string;data:Omit<EventProject,'id'|'source'|'eventIds'>}) => ({...r.data, id:r.id, source:'event', eventIds:[r.event_id]})),
          events:(events.data ?? []).map(r => ({...r.data,id:r.id})),
          news:((news.data ?? []) as {id:string; data:NewsPost}[]).map(r => ({...r.data,id:r.id})).sort((a,b) => (b.date ?? '').localeCompare(a.date ?? '')),}
        current.current = next; setState(next); setError('')
      } catch { if (active && generation.current === request) setError('Could not load your data. Check your connection and try again.') }
      finally { if (active && generation.current === request) setLoading(false) }
    }
    const refreshCatalog = () => { void refresh(true) }
    catalogListeners.add(refreshCatalog)
    void refresh()
    const { data } = backend.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_IN') setAuthError('')
      // Returning from a phone's file picker can re-confirm the same session.
      // Keep forms mounted during that refresh so their step, contacts and Files
      // survive. A different account still uses the blocking loading state.
      const sameIdentity = (session?.user.id ?? null) === current.current.userId
      // Do not await Supabase queries inside its auth callback.
      setTimeout(() => { if(active) void refresh(sameIdentity) }, 0)
    })
    return () => {catalogListeners.delete(refreshCatalog);active=false; generation.current++; data.subscription.unsubscribe()}
  }, [])

  async function syncPrivate(row: Submission, old: Submission | undefined) {
    if (!backend) return
    if (row.contact && !same(row.contact, old?.contact)) {
      const contact: ProjectContact = row.contact
      const result = await backend.from('project_contacts').upsert({project_id:row.id, telegram:contact.telegram, phone:contact.phone})
      if (result.error) throw result.error
    }
    if (row.members && !same(row.members, old?.members)) {
      const previous: Member[] = old?.members ?? []
      const removed = previous.filter(m => !row.members!.some(n => n.email === m.email && n.role === m.role))
      const added = row.members.filter(m => !previous.some(n => n.email === m.email && n.role === m.role))
      if (removed.length) {
        const result = await backend.from('project_members').delete().eq('project_id', row.id).in('email', removed.map(m => m.email))
        if (result.error) throw result.error
      }
      if (added.length) {
        const result = await backend.from('project_members').insert(added.map(m => ({project_id:row.id, email:m.email, role:m.role})))
        if (result.error) throw result.error
      }
    }
  }

  function change<K extends Kind>(kind: K, update: (rows: State[K]) => State[K]): Promise<boolean> {
    let resolve!: (value: boolean) => void
    const result = new Promise<boolean>(r => {resolve=r})
    pending.current = pending.current.then(async () => {
      const before = current.current
      const version = generation.current
      try {
        const rows = update(before[kind])
        const previous = before[kind] as {id:string}[]
        const changed = (rows as {id:string}[]).filter(row => JSON.stringify(row) !== JSON.stringify(previous.find(old => old.id === row.id)))
        const removed = previous.filter(old => !(rows as {id:string}[]).some(row => row.id === old.id))
        if (backend && (changed.length || removed.length)) {
          if (!before.userId) throw new Error('Sign in required')
          const table = kind === 'submissions' ? 'projects' : kind
          for (const row of changed) {
            const old = previous.find(item => item.id === row.id)
            const data = kind === 'submissions' ? publicData(row as Submission) : row
            const oldData = kind === 'submissions' && old ? publicData(old as Submission) : old
            if (old && same(data, oldData)) { await syncPrivate(row as Submission, old as Submission); continue }
            const payload: Record<string, unknown> = kind === 'submissions' ? {id:row.id,owner_id:(row as Submission).ownerId,data} : {id:row.id,data}
            const response = old ? await backend.from(table).update(kind === 'news' ? {data} : payload).eq('id',row.id).select('id') : await backend.from(table).insert(payload).select('id')
            if (response.error || response.data?.length !== 1) throw response.error ?? new Error('Write denied')
            if (kind === 'submissions') await syncPrivate(row as Submission, old as Submission | undefined)
          }
          if (kind === 'news') for (const row of removed) {
            const response = await backend.from('news').delete().eq('id', row.id).select('id')
            if (response.error || response.data?.length !== 1) throw response.error ?? new Error('Write denied')
          }
          if (version !== generation.current) { resolve(false); return }
        }
        const next = {...current.current,[kind]:rows}
        current.current=next; setState(next); setError(''); resolve(true)
        if (backend && kind === 'events') notifyCatalogChanged()
      } catch { setError('Your changes were not saved. Check your connection and permissions, then try again.'); resolve(false) }
    })
    return result
  }
  async function setProjectRemoved(projectId: string, removed: boolean) {
    const version = generation.current
    try {
      await setWorkspaceProjectRemoved(projectId,'project',removed)
      if (version !== generation.current) return false
      const next = {...current.current,submissions:current.current.submissions.map(row => row.id === projectId ? {...row,removed} : row)}
      current.current=next;setState(next);notifyCatalogChanged();return true
    } catch {setError('Could not remove or restore the project. Please try again.');return false}
  }
  async function setProjectEvents(projectId: string, eventIds: string[]) {
    const version = generation.current
    try {
      if (backend) {
        const result = await backend.rpc('set_project_events', {target_project_id:projectId, event_ids:eventIds})
        if (result.error) throw result.error
      }
      if (generation.current !== version) return false
      const next = {...current.current, submissions:current.current.submissions.map(row => row.id === projectId ? {...row,eventIds} : row)}
      current.current = next; setState(next); return true
    } catch { setError('Could not save the project’s events. Please try again.'); return false }
  }
  return {...state, liveMode, authLoading, recovery, finishRecovery:() => setRecovery(false), error:authError || error, clearError:() => {setAuthError('');setError('')},
    setProjectEvents, setProjectRemoved,
    setSubmissions:(update:(rows:Submission[])=>Submission[]) => change('submissions', update),
    setEvents:(update:(rows:EventData[])=>EventData[]) => change('events', update),
    setNews:(update:(rows:NewsPost[])=>NewsPost[]) => change('news', update),
  }
}
