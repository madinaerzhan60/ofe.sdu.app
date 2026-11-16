import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, prefersReducedMotion, type Page } from './router'
import { useT } from './model'

const paths = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c.6-3.6 3-5.6 6.5-5.6s5.9 2 6.5 5.6" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  send: <><path d="M21 3 10 14" /><path d="m21 3-7 18-4-7-7-4 18-7Z" /></>,
  megaphone: <><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" /><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a4 4 0 0 1-4 4M7 5H4v2a4 4 0 0 0 4 4" /></>,
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  flag: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  building: <><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6M9 11h.01M15 11h.01" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  telegram: <path d="m21 4-3 16-6-5-3 3v-5l9-7-11 6-4-2 18-6Z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5 9-10" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  upload: <><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
  sparkle: <path d="M12 2c.6 4.8 2.2 7.4 7 8-4.8.6-6.4 3.2-7 8-.6-4.8-2.2-7.4-7-8 4.8-.6 6.4-3.2 7-8Z" />,
}
export type IconName = keyof typeof paths
export function Icon({ name, size = 20, className, strokeWidth = 1.7 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>
}

let revealStarted = false
/** Adds `.is-visible` to `.reveal-up` elements as they scroll in, including ones rendered later. */
export function useReveal(_deps: unknown[] = []) {
  useEffect(() => {
    if (revealStarted) return
    revealStarted = true
    const reduced = prefersReducedMotion() || !('IntersectionObserver' in window)
    const io = reduced ? null : new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io?.unobserve(entry.target) }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    const scan = (root: ParentNode) => root.querySelectorAll<HTMLElement>('.reveal-up:not(.is-visible)').forEach(node => {
      if (node.dataset.revealing) return
      node.dataset.revealing = '1'
      if (io) io.observe(node); else node.classList.add('is-visible')
    })
    scan(document)
    let queued = false
    const mo = new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(document) }) })
    mo.observe(document.body, { childList: true, subtree: true })
  }, [])
}

/** Counts up to `value` once the number scrolls into view. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0)
  useEffect(() => {
    const node = ref.current
    if (!node || prefersReducedMotion()) { setShown(value); return }
    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1400)
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 4))))
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    observer.observe(node)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [value])
  return <span ref={ref} className="count-up">{shown.toLocaleString('ru-RU')}{suffix}</span>
}

export type Crumb = { label: string; to?: Page; id?: string }
export function PageHero({ eyebrow, title, lead, crumbs, image, children, tone = 'navy' }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; crumbs: Crumb[]; image?: string; children?: ReactNode; tone?: 'navy' | 'light' }) {
  const t = useT()
  return <section className={`page-hero page-hero-${tone}${image ? ' has-image' : ''}`}>
    {image && <div className="page-hero-media" aria-hidden="true"><img src={image} alt="" width={1600} height={898} fetchPriority="high" /></div>}
    <div className="wrap page-hero-inner">
      <nav className="breadcrumbs" aria-label={t('Breadcrumbs')}>
        <ol>{[{ label: 'Home', to: 'home' as Page }, ...crumbs].map((crumb, index, all) => <li key={crumb.label + index}>
          {index < all.length - 1 && crumb.to ? <Link to={crumb.to} id={crumb.id}>{t(crumb.label)}</Link> : <span aria-current="page">{t(crumb.label)}</span>}
        </li>)}</ol>
      </nav>
      {eyebrow && <p className="kicker page-hero-kicker">{t(eyebrow)}</p>}
      <h1 className="page-hero-title">{title}</h1>
      {lead && <p className="page-hero-lead">{lead}</p>}
      {children}
    </div>
  </section>
}

export function SectionHead({ eyebrow, title, action, lead }: { eyebrow?: string; title: ReactNode; action?: ReactNode; lead?: ReactNode }) {
  return <div className="section-heading reveal-up">
    <div>{eyebrow && <p className="kicker">{eyebrow}</p>}<h2>{title}</h2>{lead && <p className="section-lead">{lead}</p>}</div>
    {action && <div className="section-heading-action">{action}</div>}
  </div>
}

/** Compresses an uploaded image to WebP in the browser (max 1600px). */
export async function compressImage(file: File, max = 1600, quality = 0.82) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choose a PNG, JPG or WebP smaller than 5 MB.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image upload failed.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image upload failed.')), 'image/webp', quality))
}
export const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob) })
