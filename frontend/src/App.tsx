import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AuthPanel, BackendNotice } from './auth'
import { backend, usePlatform } from './backend'
import { sampleEvents, sampleNews, sampleSubmissions, localizeNews } from './data/samples'
import { AdminDashboard, Application, PolicyPage } from './flows'
import { Footer, Header } from './layout'
import { AppContext, emptyDraft, translations, useT, type Draft, type NewsPost } from './model'
import { About } from './pages/about'
import { Events, NewsArticle } from './pages/events'
import { FoundersCup } from './pages/founders-cup'
import { Home } from './pages/home'
import { MediaDesk } from './pages/media-desk'
import { ProjectProfile, Projects } from './pages/projects'
import { Register } from './pages/register'
import { RouterContext, parseLocation, pathFor, prefersReducedMotion, withTransition, type Page, type Route } from './router'
import { TeamProvider, Teams } from './teams'
import { useReveal } from './ui'
import { useLanguage } from './use-language'
import './translations'
import './translations-ofe'

const pageTitles: Record<Page, string> = {
  home: 'Office for Entrepreneurship', about: 'About us', startups: 'Project catalog', profile: 'Project', teams: 'Teams',
  events: 'Events and news', news: 'News', demo: 'SDU Founders Cup', register: 'Team registration', apply: 'My workspace', admin: 'Workspace management', media: 'Media desk', policy: 'Policies',
}

function DetailDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { node?.close(); document.body.style.overflow = overflow }
  }, [])
  return <dialog ref={dialog} className="detail-dialog" aria-labelledby="detail-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="detail-dialog-body">
      <button className="dialog-close" aria-label={t('Close details')} onClick={onClose} autoFocus>×</button>
      <p className="eyebrow">{t('OFFICE FOR ENTREPRENEURSHIP')}</p>
      <h2 id="detail-title">{t(title)}</h2>
      {children}
    </div>
  </dialog>
}

function scrollToTarget(hash?: string) {
  const behavior = prefersReducedMotion() ? 'instant' : 'smooth'
  if (hash) {
    // The target may render after a View Transition finishes; wait for it briefly.
    let tries = 0
    const attempt = () => {
      const target = document.getElementById(hash)
      if (target) target.scrollIntoView({ behavior, block: 'start' })
      else if (tries++ < 40) requestAnimationFrame(attempt)
    }
    requestAnimationFrame(attempt)
    return
  }
  window.scrollTo({ top: 0, behavior: 'instant' })
}

export default function App() {
  const [workspaceTab, setWorkspaceTab] = useState('My applications')
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [resubmitId, setResubmitId] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [policy, setPolicy] = useState('Privacy Policy')
  const [demoAccount, setDemoAccount] = useState<'signed-out' | 'student' | 'denied'>('signed-out')
  const [demoMedia, setDemoMedia] = useState(false)
  const [route, setRoute] = useState<Route>(() => parseLocation(window.location))
  const selected = useRef(route.page === 'profile' ? route.id ?? '' : '')
  const [lang, setLang] = useLanguage()

  const platform = usePlatform(sampleSubmissions, sampleEvents, sampleNews)
  const { submissions, setSubmissions, events, setEvents } = platform
  const account = platform.liveMode ? (platform.userId ? 'student' : 'signed-out') : demoAccount
  const isMediaEditor = platform.liveMode ? platform.isMediaEditor || platform.isAdmin : account === 'student' && demoMedia
  const userEmail = platform.liveMode ? platform.userEmail : account === 'student' ? (demoMedia ? 'media.demo@sdu.edu.kz' : 'demo.student@sdu.edu.kz') : ''
  const news = useMemo<NewsPost[]>(() => platform.news.map(post => localizeNews(post, lang)), [platform.news, lang])

  const setAccount = (value: 'signed-out' | 'student' | 'denied') => {
    if (value !== 'student') setDemoMedia(false)
    if (!platform.liveMode) { setDemoAccount(value); return }
    if (value === 'signed-out') void backend!.auth.signOut().then(({ error }) => { if (error) window.alert(lang === 'RU' ? 'Не удалось выйти. Попробуйте ещё раз.' : lang === 'KK' ? 'Шығу мүмкін болмады. Қайталап көріңіз.' : 'Could not sign out. Please try again.') })
  }

  const go = (page: Page, id?: string, hash?: string) => {
    if (page === 'apply' && platform.isAdmin) page = 'admin'
    if (page === 'profile' && !id) id = selected.current
    if (page === 'profile' && id) selected.current = id
    const next: Route = { page, id, hash }
    const url = pathFor(page, id, hash)
    const same = window.location.pathname + window.location.hash === url
    if (!same) window.history.pushState({ page, id, hash }, '', url)
    if (route.page === page && route.id === id) { setRoute(next); scrollToTarget(hash); return }
    withTransition(() => setRoute(next))
    scrollToTarget(hash)
  }

  useEffect(() => {
    const onPop = () => withTransition(() => setRoute(parseLocation(window.location)))
    const onHash = () => { if (window.location.hash === '#admin') setRoute({ page: 'admin' }) }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onHash)
    if (route.hash) scrollToTarget(route.hash)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onHash) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { setDraft(emptyDraft); setResubmitId(null); setRegistered(false) }, [platform.userId])
  useEffect(() => {
    if (route.page === 'apply' && platform.isAdmin) { setRoute({ page: 'admin' }); window.history.replaceState(null, '', '/admin') }
  }, [route.page, platform.isAdmin])
  useEffect(() => { document.documentElement.lang = lang.toLowerCase() }, [lang])

  const t = (text: string) => lang === 'EN' ? text : (translations[text]?.[lang === 'RU' ? 0 : 1] ?? text)
  const profileName = route.page === 'profile' ? [...submissions, ...platform.eventProjects].find(row => row.id === route.id)?.name : route.page === 'news' ? news.find(post => post.id === route.id)?.title : undefined
  useEffect(() => {
    const base = profileName ?? t(pageTitles[route.page])
    document.title = route.page === 'home' ? 'Office for Entrepreneurship · SDU University' : `${base} — OFE · SDU University`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.page, route.id, lang, profileName])
  useReveal([route.page, route.id, lang, submissions.length, news.length])

  const page = route.page
  return <RouterContext.Provider value={{ route, go }}>
    <AppContext.Provider value={{
      liveMode: platform.liveMode, userId: platform.userId, userEmail, isAdmin: platform.isAdmin, authLoading: platform.authLoading, recovery: platform.recovery, finishRecovery: platform.finishRecovery,
      workspaceTab, setWorkspaceTab, draft, setDraft, resubmitId, setResubmitId, registered, setRegistered,
      account, setAccount, lang, selected: selected.current, select: (id: string) => { selected.current = id },
      submissions, setSubmissions, events, setEvents, policy,
      eventProjects: platform.eventProjects, setProjectEvents: platform.setProjectEvents,
      openPolicy: name => { setPolicy(name); setPolicyOpen(true) },
      news, setNews: platform.setNews, isMediaEditor, setDemoMedia,
    }}>
      <TeamProvider><div className={`app page-${page}`}>
        {policyOpen && <DetailDialog title={policy} onClose={() => setPolicyOpen(false)}><PolicyPage go={() => setPolicyOpen(false)} /></DetailDialog>}
        {page !== 'admin' && <Header lang={lang} setLang={setLang} />}
        {platform.error && <BackendNotice message={platform.error} onClose={platform.clearError} />}
        {platform.recovery && <DetailDialog title={lang === 'RU' ? 'Новый пароль' : lang === 'KK' ? 'Жаңа құпиясөз' : 'New password'} onClose={platform.finishRecovery}><AuthPanel recovery /></DetailDialog>}
        <div className="page-view" key={page + (route.id ?? '')}>
          {page === 'home' && <Home />}
          {page === 'about' && <About />}
          {page === 'startups' && <Projects />}
          {page === 'profile' && <ProjectProfile />}
          {page === 'teams' && <main id="main" className="wrap teams-page"><Teams go={go} /></main>}
          {page === 'events' && <Events />}
          {page === 'news' && <NewsArticle />}
          {page === 'demo' && <FoundersCup />}
          {page === 'register' && <Register />}
          {page === 'media' && <MediaDesk />}
          {page === 'apply' && (platform.isAdmin ? <AdminDashboard go={go} /> : <div id="main" className="workspace-shell"><Application go={go} /></div>)}
          {page === 'admin' && <AdminDashboard go={go} />}
          {page === 'policy' && <PolicyPage go={go} />}
        </div>
        {page !== 'admin' && <Footer />}
      </div></TeamProvider>
    </AppContext.Provider>
  </RouterContext.Provider>
}

