import type { SupabaseClient } from '@supabase/supabase-js'

export type MediaTarget = { projectId: string; ownerId: string; kind: 'logo' | 'cover' }
export function mediaPath(target: MediaTarget): string {
  if (!target.ownerId || !target.projectId || /[\\/#?]/.test(target.ownerId + target.projectId)) throw new Error('Invalid project media path.')
  if (target.kind !== 'logo' && target.kind !== 'cover') throw new Error('Invalid project media kind.')
  return `${target.ownerId}/${target.projectId}/${target.kind}.webp`
}
export function mediaObjectPath(reference: string): string {
  return reference.slice('storage://'.length).split('#')[0]
}
export async function uploadProjectImage(client: SupabaseClient | null, bucket: string, file: Blob, target: MediaTarget): Promise<string> {
  if (!client) throw new Error('Configure Supabase to upload images.')
  const path = mediaPath(target)
  const { data: { session }, error: sessionError } = await client.auth.getSession()
  if (sessionError || !session) throw new Error('Sign in to upload images.')
  if (session.user.id !== target.ownerId) throw new Error('Only the project owner can upload its images.')
  const { error } = await client.storage.from(bucket).upload(path, file, { contentType: 'image/webp', upsert: true, cacheControl: '0' })
  if (error) throw new Error('Image upload failed. Check your connection and Storage permissions.')
  // Version the reference so replacing a fixed object path refreshes its preview.
  return `storage://${path}#${crypto.randomUUID()}`
}

// The SDK supplies the current access token, or the publishable key for guests.
// Storage RLS decides whether this project image is public or private.
export async function downloadProjectImage(client: SupabaseClient | null, bucket: string, reference: string): Promise<Blob> {
  if (!client) throw new Error('Configure Supabase to download images.')
  const { error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  const { data, error } = await client.storage.from(bucket).download(mediaObjectPath(reference))
  if (error || !data) throw error ?? new Error('Image unavailable.')
  return data
}
