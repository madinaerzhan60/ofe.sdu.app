import { eventCoverBucket, uploadEventCover } from './event-cover-storage'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { backend, liveMode, notifyCatalogChanged, setWorkspaceProjectRemoved } from './backend'

export const PRESENTATION_BUCKET = 'event-presentations'
export const MAX_PRESENTATION_BYTES = 25 * 1024 * 1024
export const MAX_TEAM_SIZE = 6

export type TeamStatus = 'submitted' | 'confirmed' | 'rejected'
export type TeamMember = { email: string; role: string; isCaptain?: boolean }
export type EventTeam = {
  id: string
  eventId: string
  captainEmail: string
  teamName: string
  productName: string
  tagline: string
  description: string
  industry: string
  stage: string
  productUrl?: string
  telegram: string
  phone: string
  removed?: boolean
  coverPath?: string
  presentationPath?: string
  presentationName?: string
  status: TeamStatus
  adminNote: string
  createdAt: string
  updatedAt: string
  members: TeamMember[]
  /** Demo mode only: the uploaded file kept in memory. */
  demoFile?: File
}
export type TeamInput = Pick<EventTeam, 'teamName' | 'productName' | 'tagline' | 'description' | 'industry' | 'stage' | 'productUrl' | 'telegram' | 'phone'> & { members: TeamMember[] }

type Row = {
  id: string; event_id: string; captain_email: string; team_name: string; product_name: string; tagline: string; description: string
  industry: string; stage: string; product_url: string | null; telegram: string; phone: string; presentation_path: string | null
  presentation_name: string | null; cover_path: string | null; status: TeamStatus; admin_note: string; created_at: string; updated_at: string
  event_team_members?: { email: string; role: string; is_captain: boolean }[]
}
const fromRow = (row: Row): EventTeam => ({
  id: row.id, eventId: row.event_id, captainEmail: row.captain_email, teamName: row.team_name, productName: row.product_name,
  tagline: row.tagline, description: row.description, industry: row.industry, stage: row.stage, productUrl: row.product_url ?? undefined,
  telegram: row.telegram, phone: row.phone, coverPath: row.cover_path ?? undefined, presentationPath: row.presentation_path ?? undefined, presentationName: row.presentation_name ?? undefined,
  status: row.status, adminNote: row.admin_note, createdAt: row.created_at, updatedAt: row.updated_at,
  members: (row.event_team_members ?? []).map(m => ({ email: m.email, role: m.role, isCaptain: m.is_captain }))
    .sort((a, b) => Number(Boolean(b.isCaptain)) - Number(Boolean(a.isCaptain))),
})
const toColumns = (input: TeamInput) => ({
  team_name: input.teamName.trim(), product_name: input.productName.trim(), tagline: input.tagline.trim(), description: input.description.trim(),
  industry: input.industry, stage: input.stage, product_url: input.productUrl?.trim() || null, telegram: input.telegram, phone: input.phone,
})

/** Human-readable error keys for the UI (translated there). */
export function describeError(error: unknown): string {
  const text = String((error as { message?: string })?.message ?? error ?? '')
  if (/Registration is closed/i.test(text)) return 'Registration is closed.'
  if (/at most 6/i.test(text)) return 'A team can have up to 6 people including the captain.'
  if (/event_team_members_event_id_email_key|duplicate key.*email|unique.*email/i.test(text)) return 'One of these people is already registered in another team.'
  if (/event_teams_event_id_captain_id_key|duplicate key/i.test(text)) return 'You have already registered a team for this event.'
  if (/sdu\.edu\.kz/i.test(text)) return 'Use a corporate @sdu.edu.kz email.'
  if (/Cover upload failed|Choose an image/i.test(text)) return /Choose an image/i.test(text) ? 'Choose an image smaller than 5 MB.' : 'Cover upload failed. Please try again.'
  if (/presentation|mime|size|Payload too large/i.test(text)) return 'Upload a PDF or PPTX file up to 25 MB.'
  if (/JWT|not authenticated|permission|row-level security/i.test(text)) return 'Sign in with your SDU account and try again.'
  return 'Could not save the registration. Check your connection and try again.'
}

// ---------- File checks (type by content, not by name) -------------------------
export type PresentationKind = 'pdf' | 'pptx'
export async function checkPresentation(file: File): Promise<PresentationKind> {
  if (file.size === 0 || file.size > MAX_PRESENTATION_BYTES) throw new Error('Upload a PDF or PPTX file up to 25 MB.')
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d // %PDF-
  const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04 // PK..
  const name = file.name.toLowerCase()
  if (isPdf && name.endsWith('.pdf')) return 'pdf'
  if (isZip && name.endsWith('.pptx')) return 'pptx'
  throw new Error('Upload a PDF or PPTX file up to 25 MB.')
}
const contentType = (kind: PresentationKind) => kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const safeFileName = (name: string) => name.replace(/[^\p{L}\p{N}._ -]+/gu, '').slice(0, 120) || 'presentation'

// ---------- Store shared by the registration page and the admin screen ---------
type State = { teams: EventTeam[]; loading: boolean; error: string; loadedFor: string }
let state: State = { teams: [], loading: false, error: '', loadedFor: '' }
const listeners = new Set<() => void>()
const emit = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach(fn => fn()) }
const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn) }

async function fetchTeams(eventId: string) {
  if (!backend) return state.teams
  const [{data,error},removals] = await Promise.all([backend.from('event_teams')
    .select('id,event_id,captain_email,team_name,product_name,tagline,description,industry,stage,product_url,telegram,phone,presentation_path,presentation_name,cover_path,status,admin_note,created_at,updated_at,event_team_members(email,role,is_captain)')
    .eq('event_id', eventId).order('created_at', { ascending: true }), backend.rpc('list_removed_workspace_projects')])
  if (error || removals.error) throw error || removals.error
  return (data as Row[]).map(row => ({...fromRow(row),removed:(removals.data ?? []).some((item: {kind:string;target_id:string}) => item.kind === 'event-team' && item.target_id === row.id)}))
}

export function useEventTeams(eventId: string, identity: string, includeRemoved = false) {
  const snapshot = useSyncExternalStore(subscribe, () => state)
  const key = `${eventId}|${identity}`
  const reload = useCallback(async () => {
    if (!liveMode) { emit({ loadedFor: key }); return }
    emit({ loading: true, error: '' })
    try { emit({ teams: await fetchTeams(eventId), loading: false, loadedFor: key }) }
    catch (error) { emit({ loading: false, error: describeError(error), loadedFor: key }) }
  }, [eventId, key])
  useEffect(() => { if (state.loadedFor !== key) void reload() }, [key, reload])
  return { ...snapshot, teams: snapshot.teams.filter(team => team.eventId === eventId && (includeRemoved || !team.removed)), reload }
}

export async function registrationOpen(eventId: string, fallback: boolean) {
  if (!backend) return fallback
  const { data, error } = await backend.rpc('event_registration_open', { target_event_id: eventId })
  return error ? fallback : data === true
}

async function syncMembers(teamId: string, before: TeamMember[], after: TeamMember[]) {
  if (!backend) return
  const plain = (list: TeamMember[]) => list.filter(m => !m.isCaptain)
  const removed = plain(before).filter(m => !plain(after).some(n => n.email === m.email && n.role === m.role))
  const added = plain(after).filter(m => !plain(before).some(n => n.email === m.email && n.role === m.role))
  if (removed.length) {
    const { error } = await backend.from('event_team_members').delete().eq('team_id', teamId).in('email', removed.map(m => m.email))
    if (error) throw error
  }
  if (added.length) {
    const { error } = await backend.from('event_team_members').insert(added.map(m => ({ team_id: teamId, email: m.email, role: m.role })))
    if (error) throw error
  }
}

export async function createTeam(eventId: string, captainEmail: string, input: TeamInput): Promise<EventTeam> {
  if (!backend) {
    const now = new Date().toISOString()
    const team: EventTeam = { ...input, id: crypto.randomUUID(), eventId, captainEmail, status: 'submitted', adminNote: '', createdAt: now, updatedAt: now,
      members: [{ email: captainEmail, role: 'Captain', isCaptain: true }, ...input.members.filter(m => !m.isCaptain)] }
    emit({ teams: [...state.teams, team] })
    return team
  }
  const { data, error } = await backend.from('event_teams').insert({ event_id: eventId, consent: true, ...toColumns(input) }).select('id').single()
  if (error) throw error
  try { await syncMembers(data.id, [], input.members) }
  catch (problem) { await backend.from('event_teams').delete().eq('id', data.id); throw problem }
  const teams = await fetchTeams(eventId)
  emit({ teams })
  return teams.find(team => team.id === data.id)!
}

export async function updateTeam(team: EventTeam, input: TeamInput) {
  if (!backend) {
    emit({ teams: state.teams.map(row => row.id === team.id ? { ...row, ...input, status: row.status === 'confirmed' ? 'submitted' : row.status,
      members: [row.members.find(m => m.isCaptain)!, ...input.members.filter(m => !m.isCaptain)], updatedAt: new Date().toISOString() } : row) })
    return
  }
  const { error } = await backend.from('event_teams').update(toColumns(input)).eq('id', team.id)
  if (error) throw error
  await syncMembers(team.id, team.members, input.members)
  notifyCatalogChanged()
  emit({ teams: await fetchTeams(team.eventId) })
}

/** Save a new immutable file before changing the reviewed reference. */
export async function saveTeamCover(team: EventTeam, file?: Blob) {
  if (!backend) {
    if (team.coverPath?.startsWith('blob:')) URL.revokeObjectURL(team.coverPath)
    const updated: EventTeam = {...team,coverPath:file ? URL.createObjectURL(file) : undefined,status:team.status === 'confirmed' ? 'submitted' : team.status}
    emit({teams:state.teams.map(row => row.id === team.id ? updated : row)})
    return updated
  }
  const path = file ? await uploadEventCover(backend,team.eventId,team.id,file) : null
  const result = await backend.from('event_teams').update({cover_path:path}).eq('id',team.id).select('id').single()
  if (result.error) {
    if (path) await backend.storage.from(eventCoverBucket).remove([path])
    throw result.error
  }
  notifyCatalogChanged()
  if (team.coverPath) await backend.storage.from(eventCoverBucket).remove([team.coverPath])
  const teams = await fetchTeams(team.eventId)
  emit({teams})
  return teams.find(row => row.id === team.id)!
}

export async function uploadPresentation(team: EventTeam, file: File, onProgress?: (value: number) => void) {
  const kind = await checkPresentation(file)
  const name = safeFileName(file.name)
  if (!backend) {
    onProgress?.(1)
    emit({ teams: state.teams.map(row => row.id === team.id ? { ...row, demoFile: file, presentationName: name, presentationPath: `${team.eventId}/${team.id}/demo.${kind}` } : row) })
    return
  }
  const path = `${team.eventId}/${team.id}/${crypto.randomUUID()}.${kind}`
  onProgress?.(0.15)
  const upload = await backend.storage.from(PRESENTATION_BUCKET).upload(path, file, { contentType: contentType(kind), upsert: false, cacheControl: '0' })
  if (upload.error) throw upload.error
  onProgress?.(0.85)
  const { error } = await backend.from('event_teams').update({ presentation_path: path, presentation_name: name }).eq('id', team.id)
  if (error) { await backend.storage.from(PRESENTATION_BUCKET).remove([path]); throw error }
  if (team.presentationPath) await backend.storage.from(PRESENTATION_BUCKET).remove([team.presentationPath])
  onProgress?.(1)
  notifyCatalogChanged()
  emit({ teams: await fetchTeams(team.eventId) })
}

export async function removePresentation(team: EventTeam) {
  if (!backend) { emit({ teams: state.teams.map(row => row.id === team.id ? { ...row, demoFile: undefined, presentationName: undefined, presentationPath: undefined } : row) }); return }
  const { error } = await backend.from('event_teams').update({ presentation_path: null, presentation_name: null }).eq('id', team.id)
  if (error) throw error
  if (team.presentationPath) await backend.storage.from(PRESENTATION_BUCKET).remove([team.presentationPath])
  notifyCatalogChanged()
  emit({ teams: await fetchTeams(team.eventId) })
}

/** Downloads with the signed-in user's token; files are never public or signed URLs. */
export async function downloadPresentation(team: EventTeam) {
  let blob: Blob | undefined = team.demoFile
  if (backend && team.presentationPath) {
    const { data, error } = await backend.storage.from(PRESENTATION_BUCKET).download(team.presentationPath)
    if (error) throw error
    blob = data
  }
  if (!blob) return
  // Always save as an attachment: the bytes are never rendered inside this origin.
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = url
  link.download = team.presentationName || `${team.teamName}.${team.presentationPath?.endsWith('.pptx') ? 'pptx' : 'pdf'}`
  link.rel = 'noopener'
  document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export async function withdrawTeam(team: EventTeam) {
  if (!backend) { emit({ teams: state.teams.filter(row => row.id !== team.id) }); return }
  if (team.coverPath) await saveTeamCover(team)
  if (team.presentationPath) await backend.storage.from(PRESENTATION_BUCKET).remove([team.presentationPath])
  const { error } = await backend.from('event_teams').delete().eq('id', team.id)
  if (error) throw error
  notifyCatalogChanged()
  emit({ teams: state.teams.filter(row => row.id !== team.id) })
}

export async function setTeamStatus(team: EventTeam, status: TeamStatus, adminNote: string) {
  if (!backend) { emit({ teams: state.teams.map(row => row.id === team.id ? { ...row, status, adminNote } : row) }); return }
  const { error } = await backend.from('event_teams').update({ status, admin_note: adminNote.trim().slice(0, 1000) }).eq('id', team.id)
  if (error) throw error
  notifyCatalogChanged()
  emit({ teams: await fetchTeams(team.eventId) })
}

/** CSV for administrators. Cells are quoted and formula-like values are neutralised. */
export function teamsToCsv(teams: EventTeam[]) {
  const cell = (value: string) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
    return `"${safe.replace(/"/g, '""')}"`
  }
  const header = ['Team', 'Product', 'Tagline', 'Industry', 'Stage', 'Captain', 'Telegram', 'Phone', 'Members', 'Presentation', 'Status', 'Registered']
  const rows = teams.map(team => [team.teamName, team.productName, team.tagline, team.industry, team.stage, team.captainEmail, team.telegram, team.phone,
    team.members.filter(m => !m.isCaptain).map(m => `${m.email} (${m.role})`).join('; '), team.presentationPath ? 'yes' : 'no', team.status, team.createdAt.slice(0, 16).replace('T', ' ')])
  return '﻿' + [header, ...rows].map(row => row.map(value => cell(String(value))).join(',')).join('\r\n')
}

export async function setTeamRemoved(team: EventTeam, removed: boolean) {
  await setWorkspaceProjectRemoved(team.id,'event-team',removed)
  emit({teams:backend ? await fetchTeams(team.eventId) : state.teams.map(row => row.id === team.id ? {...row,removed} : row)})
  notifyCatalogChanged()
}
