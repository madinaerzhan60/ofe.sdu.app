import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { backend } from './backend'
import { uploadProjectImage, downloadProjectImage, type MediaTarget } from './media-storage'
import { eventCoverBucket, eventCoverPrefix } from './event-cover-storage'
export type { MediaTarget } from './media-storage'

export const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || 'startup-media'

const prefix = 'storage://'
export const uploadImage = (file: Blob, target: MediaTarget) => uploadProjectImage(backend, storageBucket, file, target)

// Private objects need an Authorization header. An <img> URL cannot supply it;
// download with the session-aware SDK and display a temporary browser Blob URL.
export function StorageImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [resolved, setResolved] = useState<{ source: string; url: string; actor: number } | null>(null)
  const [actor, setActor] = useState(0)
  const eventCover = Boolean(src?.startsWith(eventCoverPrefix))
  const stored = Boolean(src?.startsWith(prefix) || eventCover)
  useEffect(() => {
    const subscription = backend?.auth.onAuthStateChange(() => { setResolved(null); setActor(n => n + 1) })
    return () => subscription?.data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    let active = true
    let objectUrl: string | undefined
    setResolved(null)
    if (stored && src && backend) {
      const source = src
      const client = backend
      void (async () => {
        try {
          const blob = await downloadProjectImage(client, eventCover ? eventCoverBucket : storageBucket, eventCover ? prefix + source.slice(eventCoverPrefix.length) : source)
          if (!active) return
          objectUrl = URL.createObjectURL(blob)
          setResolved({ source, url: objectUrl, actor })
        } catch { /* Keep the accessible fallback on denied or failed downloads. */ }
      })()
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src, stored, eventCover, actor])
  const url = stored ? (resolved && resolved.source === src && resolved.actor === actor ? resolved.url : undefined) : src
  // Do not pass legacy embedded data or Storage reference strings to the browser.
  if (!url || url.startsWith('data:')) return <span className={props.className} role="img" aria-label={props.alt || 'Image unavailable'} />
  return <img {...props} src={url} />
}

