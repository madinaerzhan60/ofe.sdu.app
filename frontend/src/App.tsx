import { ThemeToggle } from "./theme"
import { AboutSection } from "./about"
import { Teams, TeamProvider } from "./teams"
import { backend, usePlatform } from "./backend"
import { AuthPanel, BackendNotice } from "./auth"
import { StartupEditor, ownsStartup } from "./media"
import { emptyDraft, Draft } from "./model"
import { useEffect, useRef, useState } from "react"

import {
  AppContext,
  useModel,
  useT,
  policies,
  Submission,
  EventData,
} from "./model"
import { Application, AdminDashboard, PolicyPage } from "./flows"
import "./translations"

type Page = "teams" | "home" | "startups" | "profile" | "demo" | "apply" | "admin" | "policy"
type Lang = "EN" | "RU" | "KK"

const startups = [
  {
    initials: "SP",
    name: "SkillPath AI",
    description: "AI learning paths that adapt to every student's goals.",
    industry: "EdTech",
    stage: "Seed",
    year: "2026",
    demo: true,
    photo:
      "https://images.unsplash.com/photo-1787647561899-71b3329cd270?auto=format&fit=crop&w=900&q=80",
  },
  {
    initials: "MA",
    name: "MedArchive",
    description: "Secure, patient-owned medical records for Central Asia.",
    industry: "HealthTech",
    stage: "MVP",
    year: "2026",
    demo: true,
    photo:
      "https://images.unsplash.com/photo-1787647561076-98d225ed3a6b?auto=format&fit=crop&w=900&q=80",
  },
  {
    initials: "RI",
    name: "Review Intelligence",
    description: "Customer feedback analytics for growing businesses.",
    industry: "SaaS",
    stage: "Seed",
    year: "2026",
    demo: false,
    photo:
      "https://images.unsplash.com/photo-1787647561719-05dafd6f7d71?auto=format&fit=crop&w=900&q=80",
  },
  {
    initials: "QS",
    name: "QazSolar",
    description: "Smarter energy monitoring for homes and small businesses.",
    industry: "Climate",
    stage: "Prototype",
    year: "2026",
    demo: true,
    photo:
      "https://images.unsplash.com/photo-1758873272809-7947b9a73fe5?auto=format&fit=crop&w=900&q=80",
  },
  {
    initials: "BA",
    name: "Bala AI",
    description: "Kazakh-language reading support for young learners.",
    industry: "EdTech",
    stage: "MVP",
    year: "2026",
    demo: true,
    photo:
      "https://images.unsplash.com/photo-1758876022088-2d46af5635c2?auto=format&fit=crop&w=900&q=80",
  },
  {
    initials: "FN",
    name: "FinNote",
    description: "Simple cash-flow planning for independent entrepreneurs.",
    industry: "FinTech",
    stage: "Seed",
    year: "2026",
    demo: false,
    photo:
      "https://images.unsplash.com/photo-1758873271902-a63ecd5b5235?auto=format&fit=crop&w=900&q=80",
  },
  {
    initials: "TL",
    name: "TazaLab",
    description: "Quality control software for local food producers.",
    industry: "FoodTech",
    stage: "MVP",
    year: "2026",
    demo: true,
  },
  {
    initials: "WR",
    name: "Workly Remote",
    description: "Talent matching for Central Asia's remote workforce.",
    industry: "HR Tech",
    stage: "Growth",
    year: "2026",
    demo: false,
  },
  {
    initials: "AG",
    name: "AgroGuard",
    description: "Crop monitoring and early risk alerts for small farms.",
    industry: "AgriTech",
    stage: "Prototype",
    year: "2026",
    demo: true,
  },
]

const copy = {
  EN: {
    nav: ["Projects", "Events", "About", "Share a project"],
    login: "Log in",
    kicker: "SDU FOUNDERS CUP",
    hero: "Your idea could be the next big thing.",
    sub: "Building something in education, art, business or any other field? Find guidance, meet collaborators and share your project with the OFE community.",
    explore: "Explore projects",
    submit: "Share your project",
    directions: "What we’re planning",
    featured: "Projects from our community",
    events: "Upcoming events",
    demoPill: "Demo Day · 26 Nov",
    caption: "From first idea to first customer. Built at SDU.",
  },
  RU: {
    nav: ["Проекты", "События", "О нас", "Представить проект"],
    login: "Войти",
    kicker: "SDU FOUNDERS CUP",
    hero: "Ваша идея может стать большим делом.",
    sub: "Создаёте что-то в образовании, искусстве, бизнесе или другой сфере? В OFE поможем сделать следующий шаг: найти поддержку, собрать команду и рассказать о проекте.",
    explore: "Посмотреть проекты",
    submit: "Представить свой проект",
    directions: "Что мы планируем",
    featured: "Проекты сообщества",
    events: "Ближайшие события",
    demoPill: "Демо-день · 26 ноября",
    caption: "От первой идеи до первого клиента. Создано в SDU.",
  },
  KK: {
    nav: ["Жобалар", "Іс-шаралар", "Біз туралы", "Жобаны таныстыру"],
    login: "Кіру",
    kicker: "SDU FOUNDERS CUP",
    hero: "Сіздің идеяңыз үлкен іске айналуы мүмкін.",
    sub: "Білім, өнер, бизнес немесе басқа салада жобаңыз бар ма? OFE қолдау табуға, команда жинауға және жобаңызды таныстыруға көмектеседі.",
    explore: "Жобаларды көру",
    submit: "Жобаны таныстыру",
    directions: "Біздің жоспарларымыз",
    featured: "Қауымдастық жобалары",
    events: "Алдағы іс-шаралар",
    demoPill: "Демо күн · 26 қараша",
    caption: "Алғашқы идеядан алғашқы клиентке дейін. SDU-да жасалған.",
  },
}

const pageLabels: Record<Page, string> = {
  home: "Home",
  teams: "Teams",
  startups: "Startups",
  profile: "Startup profile",
  demo: "Demo Day",
  apply: "Application",
  admin: "Admin",
  policy: "Policies",
}

function PrototypeBanner({go,page}: {go:(p:Page)=>void,page:Page}) {
 const t=useT();const {account,setAccount}=useModel();
 return <div className="prototype-toolbar"><span>{t('Interactive prototype')}</span><div role="group" aria-label={t('Preview role')}><button className={account!=="student"&&page!=="admin"?'active':''} onClick={()=>{setAccount('signed-out');go('home');}}>{t('Visitor')}</button><button className={account==='student'&&page!=="admin"?'active':''} onClick={()=>{setAccount('student');go('apply');}}>{t('Student account')}</button><button className={page==='admin'?'active':''} onClick={()=>go('admin')}>{t('Admin preview')} ↗</button></div></div>;
}

function Logo({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <button className="brand" onClick={onClick} aria-label={t("OFE home")}>
      <img src="/ofe-logo.png" alt="SDU Office for Entrepreneurship" />
    </button>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  const t = useT()
  return <span className="tag">{children}</span>
}

function AccountMenu({go}: {go: (page: Page)=>void}) {
 const t=useT(); const {setAccount,setWorkspaceTab,userEmail,liveMode,isAdmin}=useModel();
 const menu=useRef<HTMLDetailsElement>(null);

 const close=()=>{if(menu.current)menu.current.open=false;};
 useEffect(()=>{const dismiss=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))close();};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);},[]);
 return <details ref={menu} className="account-menu" onKeyDown={e=>{if(e.key==='Escape')close();}}><summary aria-label={t('My account')}><span className="account-name">{t('My account')}</span><span className="account-chevron" aria-hidden="true">⌄</span></summary><div className="account-popover"><span>{liveMode ? userEmail : t('Demo student · SDU account')}</span><button onClick={()=>{close();setWorkspaceTab('My applications');go('apply');}}>{t('My applications')}</button><button onClick={()=>{close();setWorkspaceTab('My startup');go('apply');}}>{t('My startup')}</button><button onClick={()=>{close();setWorkspaceTab('My teams');go('apply');}}>{t('My teams')}</button>{isAdmin && <button onClick={()=>{close();go('admin')}}>{t('Workspace management')}</button>}<button onClick={()=>{close();setAccount('signed-out');go('home');}}>{t('Sign out')}</button></div></details>;
}

function Header({
  lang,
  setLang,
  page,
  go,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  page: Page
  go: (p: Page) => void
}) {
  const t = useT()
  const {account} = useModel()
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", dismiss)
    return () => window.removeEventListener("keydown", dismiss)
  }, [])
  const c = copy[lang]
  const nav = [
    { label: c.nav[0], page: "startups" as Page },
    { label: c.nav[1], page: "demo" as Page },
    { label: c.nav[2], page: "home" as Page, anchor: true },
    { label: account === "student" ? t("My workspace") : c.nav[3], page: "apply" as Page },
  ]
  const navigate = (p: Page) => {
    go(p)
    setOpen(false)
  }
  return (
    <>
      <div className="top-stripe" />
      <header className={compact ? "header compact" : "header"}>
        <Logo onClick={() => navigate("home")} />
        <nav
          id="main-navigation"
          aria-label={t("Main navigation")}
          className={open ? "nav open" : "nav"}
        >
          {nav.map((item) => (
            <button
              key={item.label}
              className={(page === item.page || (page === "teams" && item.page === "startups")) && !item.anchor ? "active" : ""}
              onClick={() => {
                navigate(item.page)
                if (item.anchor)
                  requestAnimationFrame(() =>
                    document
                      .getElementById("about")
                      ?.scrollIntoView({
                        behavior: window.matchMedia(
                          "(prefers-reduced-motion: reduce)",
                        ).matches
                          ? "instant"
                          : "smooth",
                      }),
                  )
              }}
            >
              {item.label}
            </button>
          ))}
          <div className="mobile-actions">
            <button className="login" onClick={() => navigate("apply")}>
              {account === "student" ? t("My workspace") : c.login}
            </button>
          </div>
        </nav>
        <div className="header-right"><ThemeToggle />
          <div
            className={`language ${lang.toLowerCase()}`}
            aria-label={t("Language selector")}
          >
            {(["KK", "RU", "EN"] as Lang[]).map((item) => (
              <button
                className={lang === item ? "active" : ""}
                aria-pressed={lang === item}
                onClick={() => setLang(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          {account === "student" ? <AccountMenu go={go}/> : <button className="login desktop-login" onClick={() => go("apply")}>{c.login}</button>}
          <button
            className="hamburger"
            aria-label={t(open ? "Close menu" : "Open menu")}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
    </>
  )
}

function Footer({ go, page }: { go: (p: Page) => void; page: Page }) {
  const t = useT()
  const { openPolicy,account } = useModel()
  return (
    <>
      {account !== "student" && page !== "apply" && <section className="footer-cta shell reveal">
        <div>
          <p className="eyebrow">{t("READY TO START?")}</p>
          <h2>{t("Have a startup idea?")}</h2>
          <p>{t("Turn it into something people need with OFE.")}</p>
        </div>
        <button className="primary" onClick={() => go("apply")}>
          {t("Apply now")}
        </button>
      </section>}
      <footer>
        <div className="footer-lead">
          <Logo onClick={() => go("home")} />
          <p>{t("Building the next generation of founders at SDU.")}</p>
        </div>
        <div>
          <strong>{t("Platform")}</strong>
          <button onClick={() => go("startups")}>{t("Startups")}</button>
          <button onClick={() => go("demo")}>{t("Demo Day")}</button>
          <button onClick={() => go("apply")}>{t(account === "student" ? "My workspace" : "Apply")}</button>
        </div>
        <div>
          <strong>{t("Office")}</strong>
          <button
            onClick={() => {
              go("home")
              requestAnimationFrame(() =>
                document.getElementById("about")?.scrollIntoView(),
              )
            }}
          >
            {t("About OFE")}
          </button>
          <button onClick={() => go("admin")}>{t("Admin preview")}</button>
        </div>
        <div>
          <strong>{t("Policies")}</strong>
          {policies.map((name) => (
            <button key={t(name)} onClick={() => openPolicy(name)}>
              {t(name)}
            </button>
          ))}
        </div>
        <div className="footer-bottom">
          <span>{t("© 2026 SDU Office for Entrepreneurship")}</span>
          <span>{t("Almaty, Kazakhstan")}</span>
        </div>
      </footer>
    </>
  )
}

function Countdown({ date = "2026-11-26" }: { date?: string }) {
  const t = useT()
  const calculate = () => {
    const diff = Math.max(
      0,
      new Date(`${date}T15:00:00+05:00`).getTime() - Date.now(),
    )
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      min: Math.floor((diff / 60000) % 60),
      sec: Math.floor((diff / 1000) % 60),
    }
  }
  const [time, setTime] = useState(calculate)
  useEffect(() => {
    const timer = window.setInterval(() => setTime(calculate()), 1000)
    return () => window.clearInterval(timer)
  }, [date])
  return (
    <div className="countdown">
      {Object.entries(time).map(([k, v]) => (
        <div key={t(k)}>
          <strong key={`${t(k)}-${v}`}>{String(v).padStart(2, "0")}</strong>
          <span>{t(k)}</span>
        </div>
      ))}
    </div>
  )
}

function StartupCard({
  startup,
  go,
  showArt = false,
  artIndex = 0,
}: {
  startup: Pick<typeof startups[number], "initials" | "name" | "description" | "industry" | "stage"> & { image?: string; cover?: string }
  go: (p: Page) => void
  showArt?: boolean
  artIndex?: number
}) {
  const t = useT()
  const { select } = useModel()
  return (
    <button
      className={`startup-card${showArt ? " art-card" : ""}`}
      onClick={() => {
        select(startup.name)
        go("profile")
      }}
    >
      {showArt ? (
        <span className={`startup-art art-${artIndex % 6}`} aria-hidden="true">
          {startup.cover || startup.image ? <img src={startup.cover || startup.image} alt="" /> : <><i /><b>{startup.initials}</b></>}
        </span>
      ) : (
        <span className="startup-logo">{startup.image ? <img src={startup.image} alt="" /> : startup.initials}</span>
      )}
      <span className="startup-content">
        <strong>{startup.name}</strong>
        <span>{t(startup.description)}</span>
        <span className="tags">
          <Tag>{t(startup.industry)}</Tag>
          <Tag>{t(startup.stage)}</Tag>
        </span>
      </span>
    </button>
  )
}

function HeroVisual() {
  const t = useT()
  return (
    <figure className="hero-photo">
      <img
        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=85"
        alt={t(
          "A group of young people collaborating around a table with laptops",
        )}
        fetchPriority="high"
        width={1000}
        height={1200}
      />
      <figcaption>
        <span>{t("BIG IDEAS START TOGETHER")}</span>
        <strong>
          {t("Find your people.")}
          <br />
          {t("Build your next big thing.")}
        </strong>
      </figcaption>
    </figure>
  )
}

function DirectionIcon({ index }: { index: number }) {
  const t = useT()
  const paths = [
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="m9 12 2 2 4-5" />
    </>,
    <>
      <path d="M4 18V8l8-4 8 4v10" />
      <path d="M8 18v-5h8v5" />
    </>,
    <>
      <circle cx="8" cy="10" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c.5-4 2-6 5-6s5 2 5.5 6M14 14c3 0 5 2 5.5 6" />
    </>,
    <>
      <path d="M5 19 19 5M8 5h11v11" />
      <path d="M5 9v10h10" />
    </>,
  ]
  return (
    <span className="direction-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {paths[index]}
      </svg>
    </span>
  )
}

function DetailDialog({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  const t = useT()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      node?.close()
      document.body.style.overflow = overflow
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      aria-labelledby="detail-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="detail-dialog-body">
        <button
          className="dialog-close"
          aria-label={t("Close details")}
          onClick={onClose}
          autoFocus
        >
          {t("×")}
        </button>
        <p className="eyebrow">{t("OFFICE FOR ENTREPRENEURSHIP")}</p>
        <h2 id="detail-title">{t(title)}</h2>
        {children}
      </div>
    </dialog>
  )
}

function Home({ lang, go }: { lang: Lang, go: (p: Page) => void }) {
  const t = useT()
  const { submissions, events } = useModel()
  const current = events.find(e=>e.id==="current"&&e.published) ?? events.find(e=>e.id!=="archive"&&e.published&&e.date)
  const publicStartups = submissions
    .filter((r) => r.status === "Approved" && r.publication && r.visible !== false)
    .map((r) => ({ ...r, initials: r.name.slice(0, 2).toUpperCase() }))
  const c = copy[lang]
  const upcomingEvents = events.filter(e => e.id !== "archive" && e.published && e.date).map(current => ({image:current.image,date:new Date(`${current.date}T15:00:00+05:00`),day:current.date.slice(8),month:current.date.slice(5,7),title:current.title,meta:t('Planned')+' · '+t(current.place)}));
  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          {current && <button className="hero-pill" onClick={() => go("demo")}>
            <span />
            {t(current.title)} · {new Intl.DateTimeFormat(lang === "RU" ? "ru-RU" : lang === "KK" ? "kk-KZ" : "en-GB", {day:"numeric",month:"long"}).format(new Date(current.date + "T12:00:00+05:00"))}
          </button>}
          <p className="eyebrow founders-edition">SDU · 2026</p>
          <h1 className="founders-title">SDU<br />FOUNDERS CUP</h1>
          <p className="founders-tagline">{c.hero}</p>
          <p className="hero-sub">{c.sub}</p>
          <div className="button-row">
            <button className="primary" onClick={() => go("startups")}>
              {c.explore}
            </button>
            <button className="secondary" onClick={() => go("apply")}>
              {c.submit}
            </button>
          </div>
          <p className="hero-caption">{c.caption}</p>
        </div>
        <HeroVisual />
      </section>

      <AboutSection go={go} />

      {current && <section className="section shell reveal">
        <div className="demo-banner">
          <div>
            <p className="eyebrow light">{t("NEXT DEMO DAY")}</p>
            <h2>SDU FOUNDERS CUP</h2>
            <p className="demo-date">{current.date} · {t(current.place)}</p>
          </div>
          <div>
            <Countdown date={current.date} />
            <button className="white-button" onClick={() => go("demo")}>
              {t("View Demo Day")}
            </button>
          </div>
        </div>
      </section>}

      <section className="section shell reveal">
        <div className="section-head row">
          <div>
            <p className="eyebrow">{t("02 — PORTFOLIO")}</p>
            <h2>{c.featured}</h2>
          </div>
          <button className="text-link" onClick={() => go("startups")}>
            {t("View all startups")}
          </button>
        </div>
        <div className="startup-grid art-grid">
          {publicStartups.slice(0, 6).map((s, i) => (
            <StartupCard
              startup={s}
              go={go}
              showArt
              artIndex={i}
              key={s.name}
            />
          ))}
        </div>
      </section>

      <section className="section shell two-col reveal">
        <div className="section-head">
          <p className="eyebrow">{t("03 — CALENDAR")}</p>
          <h2>{c.events}</h2>
        </div>
        <div className="event-list">
          {upcomingEvents.map((event) => (
            <div className="event-row" key={event.title + event.date.toISOString()}>
              <button onClick={() => go("demo")}>
                {event.image && <img className="event-thumbnail" src={event.image} alt="" />}
                <span className="event-date">
                  <strong>{event.day}</strong>
                  {event.month}
                </span>
                <span>
                  <strong>{t(event.title)}</strong>
                  <small>{event.meta}</small>
                </span>
              </button>
              <button
                className="calendar-button"
                onClick={() => go("demo")}
                aria-label={`${t("View event")} · ${t(event.title)}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 17 17 7M7 7h10v10" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </section>


    </main>
  )
}

function Directory({ go }: { go: (p: Page) => void }) {
  const t = useT()
  const { submissions, select } = useModel()
  const [search,setSearch] = useState('')
  const [industry,setIndustry] = useState('All')
  const [stage,setStage] = useState('All')
  const [sort,setSort] = useState('newest')
  const [shown,setShown] = useState(6)
  const projects=submissions.filter(p=>p.status==='Approved'&&p.publication&&p.visible!==false)
  const industries=[...new Set(projects.map(p=>p.industry))]
  const filtered=projects.filter(project=>(industry==='All'||project.industry===industry)&&(stage==='All'||project.stage===stage)&&[project.name,project.description,t(project.description),project.industry,t(project.industry)].join(' ').toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>sort==='az'?a.name.localeCompare(b.name):(b.createdAt??'').localeCompare(a.createdAt??''))
  const reset=()=>{setSearch('');setIndustry('All');setStage('All');setShown(6)}
  useEffect(()=>setShown(6),[search,industry,stage,sort])
  return <main className="shell page projects-page">
    <div className="community-page-head"><h1>{t('Projects')}</h1><button className="primary" onClick={()=>go('apply')}>{t('Add project')} ＋</button></div>
    <div className="community-search project-search"><span aria-hidden="true">⌕</span><input aria-label={t('Search projects')} placeholder={t('Search by name, idea or field…')} value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label={t('Sort startups')} value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">{t('Newest first')}</option><option value="az">{t('A–Z')}</option></select></div>
    <div className="project-category-tabs" aria-label={t('Industry')}>{['All',...industries].map(field=><button key={field} aria-pressed={industry===field} className={industry===field?'active':''} onClick={()=>setIndustry(field)}>{t(field==='All'?'All projects':field)}<span>{field==='All'?projects.length:projects.filter(p=>p.industry===field).length}</span></button>)}</div>
    <div className="project-results-toolbar"><p role="status">{filtered.length} {t('projects found')}</p><div><label className="project-stage-filter"><span>{t('Stage')}</span><select aria-label={t('Stage')} value={stage} onChange={e=>setStage(e.target.value)}><option value="All">{t('All stages')}</option>{['Idea','Prototype','MVP','Seed','Growth'].map(value=><option key={value} value={value}>{t(value)}</option>)}</select></label>{(search||industry!=='All'||stage!=='All')&&<button className="inline-link" onClick={reset}>{t('Clear filters')}</button>}</div></div>
    <div className="project-card-grid">{filtered.slice(0,shown).map((project,index)=>{
      return <button className={`project-discovery-card project-color-${index%4}`} key={project.id} onClick={()=>{select(project.name);go('profile')}}>
        <span className="project-card-visual">{project.cover?<img src={project.cover} alt=""/>:<><i className="project-visual-ring"/><i className="project-visual-square"/><span className="project-visual-word">{project.name}</span></>}<span className="project-card-category">{t(project.industry)}</span></span>
        <span className="project-card-details"><span className="project-card-identity"><span className="project-card-logo">{project.image?<img src={project.image} alt=""/>:project.name.slice(0,2).toUpperCase()}</span><strong>{project.name}</strong><span className="project-card-arrow" aria-hidden="true">↗</span></span><span className="project-card-description">{t(project.description)}</span><span className="project-card-footer"><span>{t(project.stage)}</span><span>{t('View project')}</span></span></span>
      </button>
    })}</div>
    {!filtered.length&&<div className="community-empty"><h2>{t('No projects found')}</h2><button className="secondary" onClick={reset}>{t('Clear filters')}</button></div>}
    {filtered.length>shown&&<div className="project-load-more"><p>{t('Showing')} {Math.min(shown,filtered.length)} {t('of')} {filtered.length}</p><button className="secondary" onClick={()=>setShown(shown+6)}>{t('Explore more projects')} ↓</button></div>}

  </main>
}

function Profile({ go }: { go: (p: Page) => void }) {
  const t = useT()
  const { selected, submissions, events, account, userId, liveMode } = useModel()
  const [editing, setEditing] = useState(false)
  const startup = submissions.find(
    (row) =>
      row.name === selected && ((row.status === "Approved" && row.publication && row.visible !== false) || (account === "student" && ownsStartup(row, userId, liveMode))),
  )
  if (!startup)
    return (
      <main className="shell page">
        <h1>{t("Startup unavailable")}</h1>
        <button className="secondary" onClick={() => go("startups")}>
          {t("All startups")}
        </button>
      </main>
    )
  const connectedEvents = events.filter(event => event.published && startup.eventYears?.includes(event.date.slice(0,4)))
  return (
    <main className="shell page profile">
      <button className="back" onClick={() => go("startups")}>
        {t("All startups")}
      </button>
      {startup.id.startsWith('sample-') && <p className="project-sample-note">{t('Sample project for exploring the platform.')}</p>}
      {account === 'student' && ownsStartup(startup, userId, liveMode) && <div className="profile-edit-action"><button className="secondary" onClick={() => setEditing(!editing)}>{t('Edit startup page')}</button></div>}
      {editing && <StartupEditor row={startup} onClose={() => setEditing(false)} />}
      {startup.cover && <img className="startup-cover profile-cover" src={startup.cover} alt="" />}
      <section className="profile-hero">
        <span className="profile-logo">
          {startup.image ? <img src={startup.image} alt="" /> : startup.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <div className="tags">
            <Tag>{t(startup.industry)}</Tag>
            <Tag>{t(startup.stage)}</Tag>
          </div>
          <h1>{startup.name}</h1>
          <p>{t(startup.description)}</p>
        </div>
        {startup.product && (
          <a
            className="primary"
            href={
              /^https?:\/\//i.test(startup.product)
                ? startup.product
                : undefined
            }
            target="_blank"
            rel="noreferrer"
          >
            {t("Visit product")}
          </a>
        )}
      </section>
      <div className="profile-body">
        <div className="profile-main">
          <section>
            <p className="eyebrow">{t("ABOUT")}</p>
            <h2>{startup.name}</h2>
            <p className="startup-about">{startup.about || t(startup.description)}</p>
          </section>

          {connectedEvents.length > 0 && <section><p className="eyebrow">{t('CONNECTED EVENTS')}</p>{connectedEvents.map(event => <button key={event.id} className="event-profile-link" onClick={()=>go('demo')}>{event.title} · {event.date} ↗</button>)}</section>}
        </div>
        <aside className="profile-side">
          <section>
            <p className="eyebrow">{t("TEAM")}</p>
            <p style={{ whiteSpace: "pre-line" }}>{startup.id.startsWith("sample-") ? t("Team details will be shared by the project author.") : startup.team}</p>
          </section>
          <section className="facts">
            <p className="eyebrow">{t("COMPANY")}</p>
            <div>
              <span>{t("Stage")}</span>
              <strong>{t(startup.stage)}</strong>
            </div>
            <div>
              <span>{t("Industry")}</span>
              <strong>{t(startup.industry)}</strong>
            </div>
          </section>
        </aside>
      </div>
      <section className="related">
        <h2>{t("Related startups")}</h2>
        <div className="startup-grid">
          {submissions
            .filter(
              (r) =>
                r.status === "Approved" && r.publication && r.visible !== false && r.id !== startup.id,
            )
            .slice(0, 3)
            .map((row) => (
              <StartupCard
                key={row.id}
                startup={{
                  ...row,
                  initials: row.name.slice(0, 2).toUpperCase(),
                }}
                go={go}
              />
            ))}
        </div>
      </section>
    </main>
  )
}

function DemoDay({ go }: { go: (p: Page) => void }) {
  const t = useT()
  const { events, submissions, select,registered,setRegistered, lang, liveMode, userId } = useModel()
  const current = events.find((e) => e.id === "current" && e.published) ?? events.find(e => e.id !== "archive" && e.published && e.date)
  const past = events.find((e) => e.id === "archive" && e.published)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [registrationBusy,setRegistrationBusy] = useState(false)
  const [registrationError,setRegistrationError] = useState('')
  useEffect(() => {
    if(!backend || !userId || !current) {if(liveMode)setRegistered(false);return}
    let active=true
    backend.from('event_registrations').select('event_id').eq('event_id',current.id).eq('user_id',userId).maybeSingle().then(({data,error})=>{if(active){setRegistered(Boolean(data));if(error)setRegistrationError('Could not load your data. Check your connection and try again.')}})
    return () => {active=false}
  },[userId,current?.id])
  const [archive, setArchive] = useState<string[] | null>(null)
  return (
    <main>
      {registrationOpen && (
        <DetailDialog
          title={t(liveMode ? "You are registered" : "Demo registration recorded")}
          onClose={() => setRegistrationOpen(false)}
        >
          <p>
            {t(liveMode ? "Your registration is saved to your account." : "This is a preview confirmation. No registration was sent.")}
          </p>
          <button className="secondary" onClick={() => setRegistrationOpen(false)}>
            {t("Close")}
          </button>
        </DetailDialog>
      )}
      {archive && (
        <DetailDialog
          title={t("Our first Demo Day")}
          onClose={() => setArchive(null)}
        >
          <p className="detail-intro">
            {t("The start of our Demo Day journey.")}
          </p>
          {past?.image && <img className="archive-photo" src={past.image} alt={past.title} />}<p className="detail-intro">{t('We have held one Demo Day. Verified dates, participating teams and event materials will be added after OFE review.')}</p><div className="archive-placeholder"><span aria-hidden="true">01</span><h3>{t('Our first Demo Day')}</h3><p>{t('Event details to be confirmed')}</p></div>
          <button className="secondary" onClick={() => setArchive(null)}>
            {t("Back to Demo Day")}
          </button>
        </DetailDialog>
      )}

      {!current ? <section className="shell page"><h1>{t('No upcoming Demo Day')}</h1><p>{t('Check the archive for previous editions.')}</p></section> : <>      <section className="demo-hero">
        {current.image && <img className="demo-event-image" src={current.image} alt={current.title} />}
        {!current && (
          <p className="shell">{t("Event unpublished in this preview.")}</p>
        )}
        <div className="shell event-hero-layout">
          <div className="event-hero-copy">
            <button className="event-back" onClick={() => go('home')}>← {t('Back to website')}</button>
            <p className="event-kicker"><span />{t(current.title)}</p>
            <h1>SDU FOUNDERS CUP</h1>
            <p className="event-hero-description">{t('Meet student founders, discover fresh ideas and connect with the OFE community.')}</p>
            <div className="event-countdown"><span className="event-countdown-label">{t('Until we meet')}</span><Countdown date={current.date} /></div>
          </div>
          <aside className="event-ticket" aria-label={t('Event details')}>
            <div className="event-ticket-top"><span>{t('YOU’RE INVITED')}</span><span className="event-ticket-badge">{t('Demo Day')}</span></div>
            <div className="event-date-display">
              <div className="event-day"><span>{new Intl.DateTimeFormat(lang === 'RU' ? 'ru-RU' : lang === 'KK' ? 'kk-KZ' : 'en-GB', {month:'short', timeZone:'Asia/Qyzylorda'}).format(new Date(current.date + 'T12:00:00+05:00')).replace('.', '')}</span><strong>{current.date.slice(8)}</strong></div>
              <div><span className="event-field-label">{t('DATE')}</span><time dateTime={current.date}>{new Intl.DateTimeFormat(lang === 'RU' ? 'ru-RU' : lang === 'KK' ? 'kk-KZ' : 'en-GB', {day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Qyzylorda'}).format(new Date(current.date + 'T12:00:00+05:00'))}</time><small>{new Intl.DateTimeFormat(lang === 'RU' ? 'ru-RU' : lang === 'KK' ? 'kk-KZ' : 'en-GB', {weekday:'long', timeZone:'Asia/Qyzylorda'}).format(new Date(current.date + 'T12:00:00+05:00'))}</small></div>
            </div>
            <div className="event-location"><span className="event-location-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><div><span className="event-field-label">{t('PLACE')}</span><strong>{t(current.place)}</strong><small>{t('Follow this page for event updates.')}</small></div></div>
            <div className="ticket-perforation" aria-hidden="true" />
            {registrationError && <p className="form-error" role="alert">{t(registrationError)}</p>}
            <button className="event-register" disabled={registered || registrationBusy} onClick={async () => {
              if(liveMode && !userId){go('apply');return}
              setRegistrationBusy(true);setRegistrationError('')
              try {
                if(backend){const result=await backend.from('event_registrations').insert({event_id:current.id,user_id:userId});if(result.error && result.error.code !== '23505')throw result.error}
                setRegistered(true);setRegistrationOpen(true)
              }catch{setRegistrationError('Your changes were not saved. Check your connection and permissions, then try again.')}
              finally{setRegistrationBusy(false)}
            }}>{t(registrationBusy ? 'Please wait…' : registered ? (liveMode ? 'You are registered' : 'Demo registration recorded') : 'Register to attend')}<span aria-hidden="true">{registered ? '✓' : '↗'}</span></button>
            <button className="event-calendar" onClick={() => {
              const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
              const date = current.date.replace(/-/g, '')
              const next = new Date(current.date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1)
              const calendar = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OFE//Events//EN','BEGIN:VEVENT',`UID:${current.id}-${date}@ofe.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z')}`,`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replace(/-/g,'')}`,`SUMMARY:${escape(current.title)}`,`LOCATION:${escape(current.place)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n')
              const url = URL.createObjectURL(new Blob([calendar], {type:'text/calendar;charset=utf-8'})); const link = document.createElement('a'); link.href=url; link.download='ofe-demo-day.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}>{t('Add to calendar')}<span aria-hidden="true">＋</span></button>
            <p className="event-ticket-note">{t(liveMode ? 'Sign in to save your event registration.' : 'Registration is a demo preview.')}</p>
          </aside>
        </div>
      </section>
      <section className="section shell program">
        <div className="section-head">
          <p className="eyebrow">{t("PROPOSED PROGRAM")}</p>
          <h2>
            {t("One afternoon.")}
            <br />
            {t("Ideas for what comes next.")}
          </h2>
        </div>
        <div>
          {[
            ["15:00", "Doors open & registration"],
            ["15:30", "Welcome from OFE"],
            ["15:45", "Startup pitches · Batch 1"],
            ["16:30", "Break & product showcase"],
            ["17:00", "Startup pitches · Batch 2"],
            ["18:00", "Awards & networking"],
          ].map(([time, title]) => (
            <div className="program-row" key={time}>
              <span>{time}</span>
              <strong>{t(title)}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="section shell">
        <div className="section-head row">
          <div>
            <p className="eyebrow">{t("SAMPLE PROJECTS")}</p>
            <h2>{t("Meet the startups")}</h2>
          </div>
          <span className="count-large">{String(submissions.filter(s=>s.status==="Approved"&&s.visible!==false&&s.publication&&startups.find(x=>x.name===s.name)?.demo).length).padStart(2,"0")}</span>
        </div>
        <div className="startup-grid">
          {submissions
            .filter(
              (s) =>
                s.status === "Approved" && s.visible !== false &&
                s.publication &&
                Boolean(startups.find(x=>x.name===s.name)?.demo),
            )
            .map((s) => ({ ...s, initials: s.name.slice(0, 2).toUpperCase() }))
            .slice(0, 6)
            .map((s) => (
              <StartupCard key={s.name} startup={s} go={go} />
            ))}
        </div>
      </section>
</>}
      <section className="section shell archive">
        <div className="section-head">
          <p className="eyebrow">{t("ARCHIVE")}</p>
          <h2>{t("Our first Demo Day")}</h2>
        </div>
        <div className="archive-grid">
          {(past ? [["01", "Our first Demo Day", "Event details to be confirmed"]] : []).map((a, i) => (
            <button
              key={a[0]}
              onClick={() => setArchive(a)}
              aria-label={`${t("View archive")} · ${a[0]}`}
            >
              <span className={`archive-visual v${i}`}>
                <b>{t("OFE")}</b>
                <small>{t("DEMO DAY")}</small>
              </span>
              <strong>
                {t("Our first Demo Day")}
              </strong>
              <span>
                {t(a[2])}
              </span>
              <i>{t("View archive")}</i>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [workspaceTab,setWorkspaceTab] = useState("My applications")
  const [draft,setDraft] = useState<Draft>(emptyDraft)
  const [resubmitId,setResubmitId] = useState<string|null>(null)
  const [registered,setRegistered] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [demoAccount, setDemoAccount] = useState<"signed-out" | "student" | "denied">(
    "signed-out",
  )
  const [selected, select] = useState("SkillPath AI")
  const [policy, setPolicy] = useState("Privacy Policy")
  const [sampleSubmissions] = useState<Submission[]>(() =>
    startups.map((s, i) => ({
      id: `sample-${i}`,createdAt:`${s.year}-01-${String(i+1).padStart(2,"0")}`,visible:true,
      year: s.year,
      eventYears: [],
      name: s.name,
      description: s.description,
      industry: s.industry,
      stage: s.stage,
      team: `${s.name} · Sample team`,
      product: "",
      status: "Approved",
      publication: true,
      consentVersion: "sample",
      consentAt: "2026-10-18",
      feedback: "",
    })),
  )
  const [sampleEvents] = useState<EventData[]>([
    {
      id: "current",
      title: "SDU FOUNDERS CUP",
      date: "2026-11-26",
      place: "Venue to be confirmed",
      published: true,
    },
    {
      id: "archive",
      title: "Our first Demo Day",
      date: "",
      place: "Details to be added",
      published: true,
    },
  ])
  const platform = usePlatform(sampleSubmissions, sampleEvents)
  const { submissions, setSubmissions, events, setEvents } = platform
  const account = platform.liveMode ? (platform.userId ? 'student' : 'signed-out') : demoAccount
  const setAccount = (value: 'signed-out' | 'student' | 'denied') => {
    if (!platform.liveMode) {setDemoAccount(value);return}
    if (value === 'signed-out') void backend!.auth.signOut().then(({error}) => {if(error)window.alert('Could not sign out. Please try again.')})
  }
  const [page, setPage] = useState<Page>("home")
  const [lang, setLang] = useState<Lang>("EN")
  useEffect(() => {setDraft(emptyDraft);setResubmitId(null);setRegistered(false)}, [platform.userId])
  const go = (p: Page) => {
    setPage(p)
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    })
  }
  useEffect(() => {
    document.documentElement.lang = lang.toLowerCase()
  }, [lang])
  useEffect(() => {
    document.title = `${pageLabels[page]} — OFE Platform`
  }, [page])
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [page])
  return (
    <AppContext.Provider
      value={{
        liveMode:platform.liveMode,userId:platform.userId,userEmail:platform.userEmail,isAdmin:platform.isAdmin,authLoading:platform.authLoading,recovery:platform.recovery,finishRecovery:platform.finishRecovery,
        workspaceTab,setWorkspaceTab,draft,setDraft,resubmitId,setResubmitId,registered,setRegistered,
        account,
        setAccount,
        lang,
        selected,
        select,
        submissions,
        setSubmissions,
        events,
        setEvents,
        policy,
        openPolicy: (name) => {
          setPolicy(name)
          setPolicyOpen(true)
        },
      }}
    >
      <TeamProvider><div className="app">
        {policyOpen && (
          <DetailDialog title={policy} onClose={() => setPolicyOpen(false)}>
            <PolicyPage go={() => setPolicyOpen(false)} />
          </DetailDialog>
        )}
        <Header lang={lang} setLang={setLang} page={page} go={go} />
        {!platform.liveMode && <PrototypeBanner go={go} page={page} />}
        {platform.error && <BackendNotice message={platform.error} onClose={platform.clearError} />}
        {platform.recovery && <DetailDialog title={lang === 'RU' ? 'Новый пароль' : 'New password'} onClose={platform.finishRecovery}><AuthPanel recovery /></DetailDialog>}
        {page === "home" && <Home lang={lang} go={go} />}
        {page === "startups" && <Directory go={go} />}
        {page === "teams" && <Teams go={go} />}
        {page === "profile" && <Profile go={go} />}
        {page === "demo" && <DemoDay go={go} />}
        {page === "apply" && <Application go={go} />}
        {page === "admin" && <AdminDashboard go={go} />}
        {page === "policy" && <PolicyPage go={go} />}
        {page !== "admin" && <Footer go={go} page={page} />}
      </div></TeamProvider>
    </AppContext.Provider>
  )
}
