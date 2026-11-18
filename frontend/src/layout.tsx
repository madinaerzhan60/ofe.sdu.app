import { useEffect, useRef, useState } from 'react'
import { policies, useModel, useT, type Lang } from './model'
import { Link, useRouter, type Page } from './router'
import { ThemeToggle } from './theme'
import { Icon, type IconName } from './ui'

type MenuLink = { label: string; to: Page; id?: string; hash?: string; icon: IconName; note?: string; href?: string }
type MenuGroup = { label: string; to: Page; intro: string; links: MenuLink[]; feature: { image: string; title: string; to: Page; id?: string } }

export const menu: MenuGroup[] = [
  {
    label: 'About us', to: 'about', intro: 'SDU Office for Entrepreneurship helps students turn ideas into projects.',
    links: [
      { label: 'Mission', to: 'about', hash: 'mission', icon: 'flag', note: 'Why OFE exists' },
      { label: 'What we do', to: 'about', hash: 'services', icon: 'bulb', note: 'Support for student founders' },
      { label: 'How it works', to: 'about', hash: 'how', icon: 'zap', note: 'From idea to Demo Day' },
      { label: 'Contacts', to: 'about', hash: 'contacts', icon: 'mail', note: 'Write to the OFE team' },
    ],
    feature: { image: '/demo-day/IMG_7500.webp', title: 'Demo Day 2026 in photos', to: 'events', id: 'champions' },
  },
  {
    label: 'Project catalog', to: 'startups', intro: 'Student startups and projects from every field at SDU.',
    links: [
      { label: 'All projects', to: 'startups', icon: 'grid', note: 'Search by field and stage' },
      { label: 'Teams', to: 'teams', icon: 'users', note: 'Build your project team' },
      { label: 'Share a project', to: 'apply', icon: 'send', note: 'Submit for OFE review' },
    ],
    feature: { image: '/demo-day/IMG_7247.webp', title: 'Add your project to the catalog', to: 'apply' },
  },
  {
    label: 'Events', to: 'events', intro: 'News, hackathons, championships and the winners of SDU competitions.',
    links: [
      { label: 'All news', to: 'events', icon: 'megaphone', note: 'Business and IT at the university' },
      { label: 'Hackathons', to: 'events', id: 'hackathons', icon: 'code', note: 'Build in a weekend' },
      { label: 'Championships', to: 'events', id: 'championships', icon: 'briefcase', note: 'Case and business competitions' },
      { label: 'Winners & champions', to: 'events', id: 'champions', icon: 'trophy', note: 'Students who won' },
      { label: 'SDU Founders Cup', to: 'demo', icon: 'sparkle', note: '23 November · Demo Day' },
      { label: 'Team registration', to: 'register', icon: 'flag', note: 'Register for Founders Cup' },
    ],
    feature: { image: '/demo-day/IMG_7414.webp', title: 'SDU Founders Cup', to: 'demo' },
  },
]

function LanguageSwitch({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  const t = useT()
  return <div className="lang-switch" role="group" aria-label={t('Language selector')}>
    {(['KK', 'RU', 'EN'] as Lang[]).map(item => <button key={item} type="button" aria-pressed={lang === item} className={lang === item ? 'is-active' : ''} onClick={() => setLang(item)}>{item}</button>)}
  </div>
}

function AccountMenu() {
  const t = useT()
  const { go } = useRouter()
  const { setAccount, setWorkspaceTab, userEmail, liveMode, isAdmin, isMediaEditor } = useModel()
  const menuRef = useRef<HTMLDetailsElement>(null)
  const close = () => { if (menuRef.current) menuRef.current.open = false }
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) close() }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  const open = (tab: string) => { close(); setWorkspaceTab(tab); go('apply') }
  const name = liveMode ? userEmail : t('Demo student · SDU account')
  return <details ref={menuRef} className="account" onKeyDown={event => { if (event.key === 'Escape') close() }}>
    <summary aria-label={t('My account')}><span className="account-avatar" aria-hidden="true">{(userEmail || 'S').slice(0, 1).toUpperCase()}</span><span className="account-label">{t('My account')}</span><Icon name="chevron" size={16} /></summary>
    <div className="account-panel">
      <p className="acct-name">{name}</p>
      {!isAdmin && <>
        <button type="button" onClick={() => open('My applications')}><Icon name="send" size={18} />{t('My applications')}</button>
        <button type="button" onClick={() => open('My startup')}><Icon name="bulb" size={18} />{t('My startup')}</button>
        <button type="button" onClick={() => open('My teams')}><Icon name="users" size={18} />{t('My teams')}</button>
        <button type="button" onClick={() => { close(); go('register') }}><Icon name="flag" size={18} />{t('Founders Cup registration')}</button>
      </>}
      {isMediaEditor && <button type="button" onClick={() => { close(); go('media') }}><Icon name="megaphone" size={18} />{t('Media desk')}</button>}
      {isAdmin && <button type="button" onClick={() => { close(); go('admin') }}><Icon name="grid" size={18} />{t('Workspace management')}</button>}
      <button type="button" className="account-signout" onClick={() => { close(); setAccount('signed-out'); go('home') }}>{t('Sign out')}</button>
    </div>
  </details>
}

export function Header({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  const t = useT()
  const { route, go } = useRouter()
  const { account, isAdmin } = useModel()
  const [scrolled, setScrolled] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [suppressed, setSuppressed] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    setDrawer(false); setSuppressed(true)
    const active = document.activeElement as HTMLElement | null
    if (active?.closest('.main-nav')) active.blur()
  }, [route.page, route.id, route.hash])
  useEffect(() => {
    if (!drawer) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawer(false) }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [drawer])
  const sectionActive = (group: MenuGroup) => group.to === route.page || group.links.some(link => link.to === route.page) || (group.to === 'events' && ['news', 'demo', 'register'].includes(route.page)) || (group.to === 'startups' && route.page === 'profile')
  const audience: { label: string; to: Page; id?: string }[] = [
    { label: 'For students', to: 'apply' }, { label: 'For teams', to: 'teams' }, { label: 'For media', to: 'media' }, { label: 'For partners', to: 'about' },
  ]
  return <>
    <a className="skip-link" href="#main">{t('Skip to content')}</a>
    <div className="utility-bar">
      <div className="wrap utility-inner">
        <nav className="utility-audience" aria-label={t('Information for')}>
          <span>{t('Information for')}:</span>
          {audience.map(item => <Link key={item.label} to={item.to} hash={item.label === 'For partners' ? 'partners' : undefined}>{t(item.label)}</Link>)}
        </nav>
        <div className="utility-tools">
          <a className="utility-link" href="https://www.instagram.com/ofe_sdu/" target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={15} />@ofe_sdu</a>
          <a className="utility-link utility-sdu" href="https://sdu.edu.kz/" target="_blank" rel="noopener noreferrer"><Icon name="globe" size={15} />sdu.edu.kz</a>
          <ThemeToggle />
          <LanguageSwitch lang={lang} setLang={setLang} />
        </div>
      </div>
    </div>
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap header-row">
        <Link to="home" className="site-logo" aria-label={t('OFE home')}>
          <img className="logo-light" src="/brand/ofe-logo.webp" alt="" width={54} height={52} />
          <img className="logo-dark" src="/brand/ofe-logo-white.webp" alt="" width={50} height={52} />
          <span className="site-logo-text"><strong>Office for Entrepreneurship</strong><small>SDU University</small></span>
        </Link>
        <nav className={`main-nav${suppressed ? ' is-suppressed' : ''}`} aria-label={t('Main navigation')} onMouseLeave={() => setSuppressed(false)} onFocus={() => setSuppressed(false)}>
          <ul>
            {menu.map(group => <li key={group.label} className={`nav-item${sectionActive(group) ? ' is-active' : ''}`}>
              <Link to={group.to} className="nav-link">{t(group.label)}<Icon name="chevron" size={15} className="nav-chevron" /></Link>
              <div className="mega" role="group" aria-label={t(group.label)}>
                <div className="mega-inner">
                  <div className="mega-intro"><p className="kicker">{t(group.label)}</p><p>{t(group.intro)}</p><Link to={group.to} className="link-arrow">{t('Open page')}<Icon name="arrow" size={16} /></Link></div>
                  <ul className="mega-links">{group.links.map(link => <li key={link.label}><Link to={link.to} id={link.id} hash={link.hash}><span className="mega-icon"><Icon name={link.icon} size={20} /></span><span><strong>{t(link.label)}</strong>{link.note && <small>{t(link.note)}</small>}</span></Link></li>)}</ul>
                  <Link to={group.feature.to} id={group.feature.id} className="mega-feature"><img src={group.feature.image} alt="" loading="lazy" width={320} height={180} /><span>{t(group.feature.title)}<Icon name="arrowUpRight" size={16} /></span></Link>
                </div>
              </div>
            </li>)}
          </ul>
        </nav>
        <div className="header-actions">
          {account !== 'student' && <Link to="apply" className="btn btn-accent btn-sm header-cta">{t('Share a project')}</Link>}
          {account === 'student' ? <AccountMenu /> : <button type="button" className="btn btn-ghost btn-sm header-login" onClick={() => go(isAdmin ? 'admin' : 'apply')}>{t('Log in')}</button>}
          <button type="button" className="menu-button" aria-label={t(drawer ? 'Close menu' : 'Open menu')} aria-expanded={drawer} aria-controls="mobile-drawer" onClick={() => setDrawer(!drawer)}><Icon name={drawer ? 'close' : 'menu'} size={24} /></button>
        </div>
      </div>
    </header>
    <div className={`drawer-backdrop${drawer ? ' is-open' : ''}`} onClick={() => setDrawer(false)} aria-hidden="true" />
    <aside id="mobile-drawer" className={`drawer${drawer ? ' is-open' : ''}`} aria-label={t('Main navigation')} aria-hidden={!drawer} inert={!drawer}>
      <div className="drawer-head"><span className="kicker">{t('Menu')}</span><button type="button" className="icon-button" aria-label={t('Close menu')} onClick={() => setDrawer(false)}><Icon name="close" size={22} /></button></div>
      <Link to="home" className="drawer-home">{t('Home')}</Link>
      {menu.map(group => <div key={group.label} className={`drawer-group${expanded === group.label ? ' is-expanded' : ''}`}>
        <div className="drawer-group-head">
          <Link to={group.to}>{t(group.label)}</Link>
          <button type="button" className="icon-button" aria-expanded={expanded === group.label} aria-label={t('Show section links')} onClick={() => setExpanded(expanded === group.label ? null : group.label)}><Icon name="chevron" size={20} /></button>
        </div>
        <ul>{group.links.map(link => <li key={link.label}><Link to={link.to} id={link.id} hash={link.hash}><Icon name={link.icon} size={18} />{t(link.label)}</Link></li>)}</ul>
      </div>)}
      <div className="drawer-actions">
        <Link to="apply" className="btn btn-accent">{t(account === 'student' ? 'My workspace' : 'Share a project')}</Link>
        <div className="drawer-tools"><ThemeToggle /><LanguageSwitch lang={lang} setLang={setLang} /></div>
      </div>
    </aside>
  </>
}

export function Footer() {
  const t = useT()
  const { route } = useRouter()
  const { openPolicy, account, isAdmin, isMediaEditor } = useModel()
  return <>
    {account !== 'student' && route.page !== 'apply' && route.page !== 'media' && <section className="cta-band">
      <div className="wrap cta-band-inner reveal-up">
        <div><p className="kicker kicker-on-dark">{t('READY TO START?')}</p><h2>{t('Have an idea? Bring it to OFE.')}</h2><p>{t('Submit your project, gather a team and get ready for Demo Day.')}</p></div>
        <div className="cta-band-actions"><Link to="apply" className="btn btn-accent btn-lg">{t('Share a project')}<Icon name="arrow" size={18} /></Link><Link to="startups" className="btn btn-on-dark btn-lg">{t('Project catalog')}</Link></div>
      </div>
    </section>}
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link to="home" className="footer-logo"><img src="/brand/ofe-logo-white.webp" alt="" width={62} height={64} /><span><strong>Office for Entrepreneurship</strong><small>SDU University</small></span></Link>
          <p>{t('Building the next generation of founders at SDU.')}</p>
          <div className="footer-social">
            <a href="https://www.instagram.com/ofe_sdu/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @ofe_sdu"><Icon name="instagram" size={20} /></a>
            <a href="https://sdu.edu.kz/" target="_blank" rel="noopener noreferrer" aria-label="SDU University"><Icon name="globe" size={20} /></a>
          </div>
        </div>
        {menu.map(group => <nav key={group.label} aria-label={t(group.label)}><h3>{t(group.label)}</h3><ul>
          <li><Link to={group.to}>{t('Overview')}</Link></li>
          {group.links.map(link => <li key={link.label}><Link to={link.to} id={link.id} hash={link.hash}>{t(link.label)}</Link></li>)}
          {group.to === 'events' && <li><a href="/archive.html">{t('Demo Day archive')}</a></li>}
          {group.to === 'events' && isMediaEditor && <li><Link to="media">{t('Media desk')}</Link></li>}
          {group.to === 'about' && isAdmin && <li><Link to="admin">{t('Workspace management')}</Link></li>}
        </ul></nav>)}
        <nav aria-label={t('Policies')}><h3>{t('Policies')}</h3><ul>{policies.map(name => <li key={name}><button type="button" onClick={() => openPolicy(name)}>{t(name)}</button></li>)}</ul></nav>
      </div>
      <div className="wrap footer-legal">
        <span>{t('© 2026 SDU Office for Entrepreneurship')}</span>
        <a className="footer-sdu" href="https://sdu.edu.kz/" target="_blank" rel="noopener noreferrer"><img src="/brand/sdu-30-lockup-white.webp" alt="SDU University · Happy 30th anniversary" width={240} height={39} loading="lazy" /></a>
        <span>{t('Almaty, Kazakhstan')}</span>
      </div>
    </footer>
  </>
}
