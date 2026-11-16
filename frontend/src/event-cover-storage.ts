import type { SupabaseClient } from '@supabase/supabase-js'

export const eventCoverBucket = 'event-covers'
export const eventCoverPrefix = 'event-cover://'
export const coverReference = (path?: string) => path ? (path.startsWith('blob:') ? path : eventCoverPrefix + path) : undefined
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export function eventCoverPath(eventId: string, teamId: string, fileId: string) {
  if (!/^[a-z0-9-]{1,64}$/.test(eventId) || !uuid.test(teamId) || !uuid.test(fileId)) throw new Error('Invalid event cover path.')
  return `${eventId}/${teamId}/${fileId}.png`
}
export async function uploadEventCover(client: SupabaseClient, eventId: string, teamId: string, file: Blob) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.')
  const path = eventCoverPath(eventId,teamId,crypto.randomUUID())
  const result = await client.storage.from(eventCoverBucket).upload(path,file,{contentType:'image/png',upsert:false,cacheControl:'0'})
  if (result.error) throw new Error('Cover upload failed. Please try again.')
  return path
}
