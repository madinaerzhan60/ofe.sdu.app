import { createContext, useContext, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

export type Page = 'home' | 'about' | 'startups' | 'profile' | 'teams' | 'events' | 'news' | 'demo' | 'register' | 'apply' | 'admin' | 'media' | 'policy'
export type Route = { page: Page; id?: string; hash?: string }
export type Go = (page: Page, id?: string, hash?: string) => void

const reserved = new Set(['news', 'founders-cup'])

export function parseLocation(location: Pick<Location, 'pathname' | 'hash'>): Route {
  if (location.hash === '#admin') return { page: 'admin' }
  const parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const hash = location.hash ? location.hash.slice(1) : undefined
  const [first, second, third] = parts
  switch (first) {
    case undefined: return { page: 'home', hash }
    case 'about': return { page: 'about', hash }
    case 'projects': return second ? { page: 'profile', id: second } : { page: 'startups', hash }
    case 'teams': return { page: 'teams' }
    case 'events':
      if (second === 'founders-cup' && third === 'register') return { page: 'register' }
      if (second === 'founders-cup') return { page: 'demo', hash }
      if (second === 'news' && third) return { page: 'news', id: third }
      return { page: 'events', id: second && !reserved.has(second) ? second : undefined, hash }
    case 'workspace': return { page: 'apply', hash }
    case 'admin': return { page: 'admin' }
    case 'media': return { page: 'media' }
    case 'policies': return { page: 'policy' }
    default: return { page: 'home' }
  }
}

export function pathFor(page: Page, id?: string, hash?: string) {
  const encoded = id ? encodeURIComponent(id) : ''
  const base = {
    home: '/', about: '/about', startups: '/projects', profile: `/projects/${encoded}`, teams: '/teams',
    events: id ? `/events/${encoded}` : '/events', news: `/events/news/${encoded}`, demo: '/events/founders-cup', register: '/events/founders-cup/register',
    apply: '/workspace', admin: '/admin', media: '/media', policy: '/policies',
  }[page]
  return hash ? `${base}#${hash}` : base
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Runs a DOM-changing state update inside a View Transition when the browser supports it. */
export function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown }
  if (!doc.startViewTransition || prefersReducedMotion()) { update(); return }
  doc.startViewTransition(() => flushSync(update))
}

export const RouterContext = createContext<{ route: Route; go: Go }>({ route: { page: 'home' }, go: () => {} })
export const useRouter = () => useContext(RouterContext)

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: Page; id?: string; hash?: string; children: ReactNode }
/** A real link (works with middle-click, copy link, crawlers) that navigates in-app on a plain click. */
export function Link({ to, id, hash, onClick, children, ...props }: LinkProps) {
  const { go, route } = useRouter()
  const current = route.page === to && (id === undefined || route.id === id)
  return <a {...props} href={pathFor(to, id, hash)} aria-current={current && !hash ? 'page' : undefined} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    go(to, id, hash)
  }}>{children}</a>
}
