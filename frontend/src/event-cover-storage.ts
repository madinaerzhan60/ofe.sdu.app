import type { SupabaseClient } from '@supabase/supabase-js'

export const eventCoverBucket = 'event-covers'
export const eventCoverPrefix = 'event-cover://'
export const coverReference = (path?: string) => path ? (path.startsWith('blob:') ? path : eventCoverPrefix + path) : undefined
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export function eventCoverPath(eventId: string, teamId: string, fileId: string) {
  if (!/^[a-z0-9-]{1,64}$/.test(eventId) || !uuid.test(teamId) || !uuid.test(fileId)) throw new Error('Invalid event cover path.')
  return `${eventId}/${teamId}/${fileId}.webp`
}
export async function uploadEventCover(client: SupabaseClient, eventId: string, teamId: string, file: Blob) {
  const head = new Uint8Array(await file.slice(0,12).arrayBuffer())
  if (file.type !== 'image/webp' || file.size > 5 * 1024 * 1024 || head.length < 12 ||
    String.fromCharCode(...head.slice(0,4)) !== 'RIFF' || String.fromCharCode(...head.slice(8,12)) !== 'WEBP') {
    throw new Error('Choose a PNG, JPG or WebP smaller than 5 MB.')
  }
  const path = eventCoverPath(eventId,teamId,crypto.randomUUID())
  const result = await client.storage.from(eventCoverBucket).upload(path,file,{contentType:'image/webp',upsert:false,cacheControl:'0'})
  if (result.error) throw new Error('Cover upload failed. Please try again.')
  return path
}
