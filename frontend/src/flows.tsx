import { PublicationConsent } from './publication-consent'
import { StorageImage, uploadImage } from './storage'
import { Teams } from "./teams"
import { AuthPanel } from "./auth"
import { ImageUpload, StartupEditor, EventEditor, demoOwnerId, ownsStartup } from "./media"
import { emptyDraft } from "./model"
import { FormEvent, useEffect, useState, useRef, type ReactNode } from "react"
import { policies, Submission, useModel, useT } from "./model"
import type { Go } from "./router"
import { ContactFields, MemberEmailsField, cleanContact, contactIsValid } from "./team-fields"
import { formatPhone, teamSummary } from "./validation"
import { listMediaEditors, setMediaEditor } from "./backend"
import { categoryMeta } from "./cards"
import { eventDate } from "./event-date"
import { AdminRegistrations } from "./admin-registrations"
export function PolicyPage({ go }: { go: Go }) {
  const { policy } = useModel()
  const t = useT()
  const sections: Record<string, string[]> = {
    "Privacy Policy": [
      "Information collected: account details, application content and publication preferences.",
      "The final policy must define purposes, retention periods, user rights and the responsible contact.",
    ],
    "Terms of Use": [
      "Submit accurate information and only materials you have permission to share.",
      "The final terms must explain acceptable use, moderation and account restrictions.",
    ],
    "Personal Data Processing Consent": [
      "This consent covers reviewing the personal information included in your application.",
      "The approved text must explain withdrawal, retention and how to contact OFE.",
    ],
    "Startup Publication Consent": [
      "Publication permission is separate from application review.",
      "Only approved startup information and materials with publication permission appear publicly.",
    ],
    "Copyright & IP Policy": [
      "Startup materials and website assets need separate ownership and permission records.",
      "The approved policy must explain permitted use and how to report a rights concern.",
    ],
    "Cookie Notice": [
      "This mockup keeps workflow data in memory for the current session.",
      "The release notice must list the cookies and tracking actually used by the deployed service.",
    ],
  }
  return (
    <main className="shell page policy-page">
      <button className="back" onClick={() => go("apply")}>
        {t("Back to application")}
      </button>
      <p className="eyebrow">{t("DRAFT · FOR REVIEW")}</p>
      <h1>{t(policy)}</h1>
      <p className="prototype-note">
        {t(
          "Placeholder policy content. OFE and SDU approval is required before release.",
        )}
      </p>
      {sections[policy]?.map((text) => <p key={text}>{t(text)}</p>)}
      <p>{t("Draft version: 18 October 2026")}</p>
      <div className="policy-nav">
        {policies.map((name) => (
          <PolicyLink key={name} name={name} />
        ))}
      </div>
    </main>
  )
}
export function PolicyLink({ name }: { name: string }) {
  const { openPolicy } = useModel()
  const t = useT()
  return (
    <button
      type="button"
      className="inline-link"
      onClick={() => openPolicy(name)}
    >
      {t(name)}
    </button>
  )
}

export function Application({go}: {go:Go}) {
  const t = useT()
  const { submissions, setSubmissions, account, setAccount,workspaceTab:tab,setWorkspaceTab:setTab,draft,setDraft,resubmitId,setResubmitId, userId, userEmail, liveMode, authLoading, isAdmin, setDemoMedia } = useModel()
  const [preparing,setPreparing] = useState({logo:false,cover:false})
  const [submitting,setSubmitting] = useState(false)
  const [formOpen,setFormOpen] = useState(false)
  const [confirmation,setConfirmation] = useState(false)
  const [saved,setSaved] = useState(false)
  const [discard,setDiscard] = useState(false)
  const [error, setError] = useState("")
  const [editingStartup, setEditingStartup] = useState<string | null>(null)
  const [startupSaved, setStartupSaved] = useState(false)
  const hasDraft=Boolean(draft.name||draft.description||draft.members.length||draft.telegram||draft.phone||draft.industry||draft.stage||draft.product);
  useEffect(()=>{ if(!hasDraft)return; const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[hasDraft]);
  const mine = submissions.filter((row) => ownsStartup(row, userId, liveMode))
  const memberOf = submissions.filter((row) => !ownsStartup(row, userId, liveMode) && Boolean(userEmail) && row.members?.some(m => m.email === userEmail.toLowerCase()))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || preparing.logo || preparing.cover) return
    if (!draft.name.trim() || !draft.description.trim() || !draft.industry || !draft.stage) {
      setError("Complete all required fields.")
      return
    }
    if (!contactIsValid(draft.telegram, draft.phone)) {
      setError("Add a valid Telegram username and phone number.")
      return
    }
    const row: Submission = {
      ...submissions.find(row => row.id === resubmitId),
      id: resubmitId ?? (liveMode ? crypto.randomUUID() : `student-${Date.now()}`),
      ownerId: liveMode ? userId! : demoOwnerId, image: draft.image, cover: draft.cover, about: draft.about,
      name: draft.name.trim(),
      description: draft.description.trim(),
      industry: draft.industry,
      stage: draft.stage,
      team: teamSummary(draft.members),
      members: draft.members,
      contact: cleanContact(draft.telegram, draft.phone),
      product: draft.product,
      status: "Pending",
      createdAt: submissions.find(row => row.id === resubmitId)?.createdAt ?? new Date().toISOString(),visible:false,
      publication: draft.publication,
      consentAt: new Date().toISOString(),
      consentVersion: liveMode ? "2026-10-22" : "draft-2026-10-18",
      feedback: "",
    }
    setSubmitting(true)
    const stored = await setSubmissions((rows) =>
      resubmitId
        ? rows.map((r) => (r.id === resubmitId ? row : r))
        : [...rows, row],
    )
    if(!stored){setSubmitting(false);return}
    // RLS needs the project to exist before its objects can be uploaded.
    setResubmitId(row.id)
    let mediaRow = {...row}
    try {
      for (const [kind, file] of [['logo', draft.imageFile], ['cover', draft.coverFile]] as const) {
        if (!file) continue
        const reference = await uploadImage(file, {projectId:row.id, ownerId:row.ownerId!, kind})
        const snapshot = {...mediaRow, [kind === 'logo' ? 'image' : 'cover']:reference}
        mediaRow = snapshot
        const attached = await setSubmissions(rows => rows.map(current => current.id === row.id ? snapshot : current))
        if (!attached) throw new Error('The application was saved, but its images could not be attached. Try submitting again.')
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setResubmitId(null)
    setError("")
    setDraft(emptyDraft)
    setFormOpen(false)
    setConfirmation(true)
    window.scrollTo({top:0,behavior:"instant"})


  }
  return (
    <main className={account==="student"?"shell page apply-page student-page":"shell page apply-page auth-page"}>
      <div className="apply-intro">
        
        <h1>{t(account === "student" ? "My workspace" : "Account")}</h1>
        
      </div>
      {!liveMode && account === "student" && <p className="prototype-note">{t('Demo workspace · Changes are not saved to the server.')}</p>}
      {authLoading && <p role="status">{t('Please wait…')}</p>}
      <div className={account === 'student' ? 'application-panel' : 'application-panel auth-layout'}>

        {account !== 'student' && <div className="auth-content">{liveMode ? <AuthPanel /> : <><AuthPanel /><details className="demo-auth-options"><summary>{t("Try the demo workspace")}</summary><div className="signin-block">

          <h2>{t('Start your application')}</h2><p>{t('Preview the approved and restricted account states.')}</p>
            <div className="preview-actions">
              <button
                onClick={() => {
                  setAccount("student")
                  setError("")
                }}
              >
                <span className="demo-account-icon" aria-hidden="true">S</span>
                {t("Continue as demo student")}
              </button>
              <button onClick={() => setAccount("denied")}>
                {t("Preview restricted account")}
              </button>
              <button onClick={() => {setAccount("student");setDemoMedia(true);go("media")}}>
                <span className="demo-account-icon" aria-hidden="true">M</span>
                {t("Continue as demo media editor")}
              </button>
            </div>
          {account === "denied" && (
            <p role="alert" className="form-error">
              {t(
                "Access denied. Use an eligible SDU account. Administrator access is assigned separately.",
              )}
            </p>
          )}
        </div></details></>}</div>}
        {account === "student" && (
          <div className="student-layout"><aside className="student-sidebar"><div className="student-identity"><span className="student-avatar">S</span><div><strong>{liveMode ? userEmail : t('Student account')}</strong><small>{t(liveMode ? 'Your personal workspace' : 'Demo account · Student role')}</small></div></div><nav aria-label={t('Student navigation')}>{(isAdmin ? ['My workspace','Account'] : ['My applications','My startup','My teams','Account']).map(item=><button key={item} className={tab===item?'active':''} onClick={()=>{if(item==='My workspace' && isAdmin){go('admin');return}setTab(item);setFormOpen(false);}}>{t(item)}<span aria-hidden="true">›</span></button>)}</nav><button className="inline-link" onClick={()=>{setAccount('signed-out');go('home');}}>{t('Sign out')}</button></aside><div className="student-content"><div className="workspace-overview" aria-label={t('Project overview')}>{[['My applications',mine.length],['Pending',mine.filter(p=>p.status==='Pending').length],['Published',mine.filter(p=>p.status==='Approved'&&p.publication&&p.visible!==false).length]].map(([label,count])=><div key={label}><strong>{count}</strong><span>{t(String(label))}</span></div>)}</div>
            {tab==='My workspace' && <section className="workspace-section"><div className="workspace-head"><h2>{t('My workspace')}</h2></div><div className="button-row">{['My applications','My startup','My teams'].map(item => <button key={item} className="secondary" onClick={() => {setTab(item);setFormOpen(false)}}>{t(item)} ↗</button>)}</div></section>}
            {tab==='My applications' && <><section className="my-applications">
              {confirmation && <div className="success-banner" role="status"><strong>{t('Application submitted')}</strong><p>{t('Your application is pending review. You can follow its status below.')}</p></div>}
              <div className="workspace-head"><h2>{t("My applications")}</h2><button className="primary" onClick={()=>{setFormOpen(true);setConfirmation(false);setSaved(false);requestAnimationFrame(()=>document.getElementById("application-form")?.scrollIntoView({block:"start"}));}}>{t(hasDraft ? 'Continue draft' : 'New application')}</button></div>
              {saved && <p role="status" className="draft-notice">{t('Draft saved for this session. You can return to it from your workspace.')}</p>}
              {!mine.length && <div className="workspace-empty"><h3>{t("No applications yet")}</h3><p>{t("Add your project to get started.")}</p></div>}
              {mine.map((row) => (
                <article className="submission-summary" key={row.id}>
                  <div>
                    <strong>{row.name}</strong>
                    <span className={`status ${row.status.toLowerCase()}`}>
                      {t(row.status)}
                    </span>
                  </div>
                  <p>
                    {t(
                      row.status === "Pending"
                        ? "Your application is waiting for review."
                        : row.status === "Approved"
                          ? row.publication && row.visible !== false
                            ? "Approved and published in the directory."
                            : row.publication ? "Approved. Your project is currently hidden from the directory." : "Approved. Publication permission has not been given."
                          : "Your application needs changes before resubmission.",
                    )}
                  </p>
                  {row.feedback && (
                    <p>
                      {t("Reviewer feedback")}: {row.feedback}
                    </p>
                  )}
                  {row.status === "Rejected" && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setDraft({ ...row, members: row.members ?? [], telegram: row.contact?.telegram ?? '', phone: row.contact?.phone ? formatPhone(row.contact.phone) : '', processing: false })
                        setResubmitId(row.id);setFormOpen(true);setSaved(false);requestAnimationFrame(()=>document.getElementById("application-form")?.scrollIntoView({block:"start"}));
                      }}
                    >
                      {t("Edit and resubmit")}
                    </button>
                  )}
                </article>
              ))}
            </section>
            {formOpen && <form id="application-form" onSubmit={submit}><fieldset className="application-fields" disabled={submitting}>
              <h2>{t(resubmitId ? "Edit and resubmit" : "New application")}</h2>
              <label>
                {t("Startup name")}
                <input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                {t("One-line description")}
                <small className="field-help">{t('What do you offer, and who is it for? A couple of simple sentences is enough.')}</small>
                <textarea
                  placeholder={t('For example: We make reusable packaging for local cafes.')}
                  required
                  maxLength={300}
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  {t("Industry")}
                  <select
                    required
                    value={draft.industry}
                    onChange={(e) =>
                      setDraft({ ...draft, industry: e.target.value })
                    }
                  >
                    <option value="">{t("Select industry")}</option>
                    {[
                      "EdTech",
                      "HealthTech",
                      "FinTech",
                      "SaaS",
                      "Climate",
                      "Arts & culture",
                      "Food & hospitality",
                      "Social impact",
                      "Retail & services",
                      "Agriculture",
                      "Other",
                    ].map((x) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Current stage")}
                  <select
                    required
                    value={draft.stage}
                    onChange={(e) =>
                      setDraft({ ...draft, stage: e.target.value })
                    }
                  >
                    <option value="">{t("Select stage")}</option>
                    {["Idea", "Prototype", "MVP", "Seed", "Growth"].map((x) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <MemberEmailsField members={draft.members} ownEmail={userEmail} onChange={members => setDraft({ ...draft, members })} />
              <ContactFields telegram={draft.telegram} phone={draft.phone} onChange={value => setDraft({ ...draft, ...value })} />
              <label>
                {t("Product link (optional)")}
                <input
                  type="url"
                  pattern="https?://.+"
                  value={draft.product}
                  onChange={(e) =>
                    setDraft({ ...draft, product: e.target.value })
                  }
                  placeholder="https://"
                />
              </label>
              <ImageUpload label="Startup logo (optional)" value={draft.image} onBusyChange={busy => setPreparing(previous => previous.logo === busy ? previous : {...previous,logo:busy})} pendingFile={draft.imageFile} onPrepared={imageFile => setDraft({...draft,imageFile})} onChange={image => setDraft({...draft,image})} square />
              <ImageUpload label="Startup cover" value={draft.cover} onBusyChange={busy => setPreparing(previous => previous.cover === busy ? previous : {...previous,cover:busy})} pendingFile={draft.coverFile} onPrepared={coverFile => setDraft({...draft,coverFile})} onChange={cover => setDraft({...draft,cover})} />
              <div className="consent-box">
                <label>
                  <input
                    type="checkbox"
                    required
                    checked={draft.processing}
                    onChange={(e) =>
                      setDraft({ ...draft, processing: e.target.checked })
                    }
                  />
                  <span>
                    {t("I agree to processing my application data.")}{" "}
                    <PolicyLink name="Personal Data Processing Consent" />
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.publication}
                    onChange={(e) =>
                      setDraft({ ...draft, publication: e.target.checked })
                    }
                  />
                  <span>
                    {t(
                      "I allow approved startup information and materials to be published.",
                    )}{" "}
                    <PolicyLink name="Startup Publication Consent" />
                  </span>
                </label>
                <p>
                  {t(
                    "Publication consent is optional and separate from application review.",
                  )}
                </p>
                <PolicyLink name="Privacy Policy" /> ·{" "}
                <PolicyLink name="Terms of Use" />
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {t(error)}
                </p>
              )}
              <p className="draft-notice">{t(liveMode ? 'Save and submit your application when you are ready.' : 'Draft stays available when you navigate within this preview. Reloading clears session data.')}</p>
              <div className="draft-actions"><button type="button" className="secondary" onClick={()=>{setSaved(true);setFormOpen(false);}}>{t('Save draft')}</button><button type="button" className="inline-link" onClick={()=>setDiscard(true)}>{t('Discard draft')}</button></div>
              {discard && <div className="discard-confirm"><p>{t('Discard this draft? This cannot be undone.')}</p><button type="button" className="secondary" onClick={()=>{setDraft(emptyDraft);setResubmitId(null);setFormOpen(false);setDiscard(false);}}>{t('Discard')}</button><button type="button" className="inline-link" onClick={()=>setDiscard(false)}>{t('Keep editing')}</button></div>}
              <button className="primary submit" type="submit" disabled={submitting || preparing.logo || preparing.cover}>
                {t(submitting ? "Please wait…" : "Submit application")}
              </button>
              <p className="form-foot">
                {t(
                  "Demo consent version and timestamp are recorded with your submission.",
                )}
              </p>
            </fieldset></form>}</>}
            {tab==='My startup' && <section className="workspace-section"><h2>{t('My startup')}</h2>
              {memberOf.length > 0 && <div className="member-of"><h3>{t('Projects where you are in the team')}</h3>{memberOf.map(row => <article key={row.id} className="owned-startup"><div className="owned-startup-heading"><div><h3>{row.name}</h3><span className={`status ${row.status.toLowerCase()}`}>{t(row.status)}</span></div></div><p>{t(row.description)}</p><p>{t('Your role')}: {t(row.members?.find(m => m.email === userEmail.toLowerCase())?.role ?? 'Member')}</p></article>)}</div>}
              {startupSaved && <p className="success-banner" role="status">{t('Changes saved')}</p>}
              {mine.length ? mine.map(row => <article key={row.id} className="owned-startup">
                {editingStartup === row.id ? <StartupEditor row={row} onClose={() => setEditingStartup(null)} onSaved={() => setStartupSaved(true)} /> : <>
                  {row.cover && <StorageImage className="startup-cover" src={row.cover} alt="" />}
                  <div className="owned-startup-heading">{row.image && <StorageImage className="startup-preview-logo" src={row.image} alt="" />}<div><h3>{row.name}</h3><span className={`status ${row.status.toLowerCase()}`}>{t(row.status)}</span></div></div>
                  <p>{t(row.description)}</p><p>{t(row.status==='Approved'&&row.publication&&row.visible!==false?'Published':'Hidden')}</p>
                  <button className="secondary" onClick={() => {setEditingStartup(row.id);setStartupSaved(false)}}>{t('Edit startup page')}</button>
                </>}
                <PublicationConsent row={row} />
              </article>) : <div className="workspace-empty"><h3>{t('Your startup starts here')}</h3><p>{t('Once your application is approved, your startup will appear here.')}</p><button className="primary" onClick={()=>{setTab('My applications');setFormOpen(true);}}>{t('New application')}</button></div>}
            </section>}
            {tab==='My teams' && <Teams go={go} embedded />}
            {tab==='Account' && <section className="workspace-section"><h2>{t('Account')}</h2><dl className="account-facts"><div><dt>{t('Account type')}</dt><dd>{t('Student')}</dd></div><div><dt>{t('Login mode')}</dt><dd>{t(liveMode ? 'Email account' : 'Prototype session')}</dd></div></dl><p className="draft-notice">{liveMode ? userEmail : t('Real SDU sign-in and profile details will be connected during development.')}</p><button className="secondary" onClick={()=>{setAccount('signed-out');go('home');}}>{t('Sign out')}</button></section>}
          </div></div>
        )}
      </div>
    </main>
  )
}

export function AdminModal({ title, onClose, children, eyebrow = "Project details" }: { title: string; onClose: () => void; children: ReactNode; eyebrow?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const t = useT()
  useEffect(() => {
    const node = dialog.current
    const previousOverflow = document.body.style.overflow
    const opener = document.activeElement as HTMLElement | null
    node?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      node?.close()
      document.body.style.overflow = previousOverflow
      opener?.focus({preventScroll:true})
    }
  }, [])
  return <dialog ref={dialog} className="admin-modal" aria-labelledby="admin-modal-title" onCancel={e => {e.preventDefault();onClose()}} onClick={e => {
    if(e.target !== e.currentTarget)return
    const rect = e.currentTarget.getBoundingClientRect()
    if(e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)onClose()
  }}>
    <header className="admin-modal-header"><div><p>{t(eyebrow)}</p><h2 id="admin-modal-title">{title}</h2></div><button type="button" autoFocus aria-label={t('Close')} onClick={onClose}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    {children}
  </dialog>
}

export function AdminDashboard({ go }: { go: Go }) {
  const t = useT()
  const { submissions, setSubmissions, events, setEvents, liveMode, isAdmin, authLoading, setAccount } = useModel()
  const [access, setAccess] = useState(false)
  const [section, setSection] = useState("Founders Cup")
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Submission | null>(null)
  const [feedback, setFeedback] = useState("")
  const [rejecting,setRejecting] = useState<Submission|null>(null)
  const [notice, setNotice] = useState("")
  const update = async (id: string, status: Submission["status"]) => {
    const saved = await setSubmissions((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, status,visible:status==="Approved", feedback: status === "Rejected" ? feedback : "" }
          : r,
      ),
    )
    if(saved) setNotice(status === "Approved" ? "Application approved. Publication follows the author’s permission." : status === "Rejected" ? "Feedback sent to the author in this preview." : "Application returned to review.")
    return saved
  }
  if (liveMode && (authLoading || !isAdmin))return <main className="shell page"><h1>{t(authLoading ? 'Please wait…' : 'Administrator access')}</h1><p>{t('Sign in with an administrator account to manage the platform.')}</p><button className="secondary" onClick={() => go('apply')}>{t('Sign in')}</button></main>
  if (!liveMode && !access)
    return (
      <main className="shell page">
        <p className="eyebrow">{t("ADMIN PREVIEW")}</p>
        <h1>{t("Administrator access")}</h1>
        <p className="prototype-note">
          {t(
            "This is a role preview. Real administrator access must be verified by the server.",
          )}
        </p>
        <div className="button-row">
          <button className="primary" onClick={() => setAccess(true)}>{t('Open admin preview')}</button>
          <button className="secondary" onClick={() => go("home")}>
            {t("Back to website")}
          </button>
        </div>
      </main>
    )
  const visible = submissions.filter(
    (r) =>
      (section !== "Startups" || r.status === "Approved") &&
      (filter === "All" || r.status === filter) &&
      [r.name, r.description, r.industry, t(r.industry)].join(" ").toLowerCase().includes(search.trim().toLowerCase()),
  )
  return (
    <main className="admin-page">
      <aside className="admin-side">
        <div className="admin-brand"><span>O</span><div><strong>OFE</strong><small>{t("Workspace management")}</small></div></div><p className="admin-nav-label">{t("WORKSPACE")}</p>
        {["Founders Cup", "Submissions", "Startups", "News", "Media team"].map((x) => (
          <button
            className={section === x ? "active" : ""}
            key={x}
            onClick={() => {
              setSection(x)
              setFilter("All"); setSearch(""); setEditing(null); setRejecting(null); setNotice("")
            }}
          >
            <i className="admin-nav-icon" aria-hidden="true">{({Submissions: "▤", Startups: "◇", Events: "▦", "Demo Day archive": "◷", News: "✎", "Media team": "◎", "Founders Cup": "★"} as Record<string,string>)[x]}</i>{t(x)}{x === "Submissions" && <b className="admin-nav-count">{submissions.filter(r => r.status === "Pending").length}</b>}
          </button>
        ))}
        <div className="admin-side-bottom"><p>{t(liveMode ? 'Changes are saved to the platform.' : 'Changes are saved for this preview session.')}</p><button onClick={() => go("home")}>↗ {t("Back to website")}</button></div>
        <button onClick={() => { if(liveMode){setAccount('signed-out');go('home')}else setAccess(false) }}>{t("Sign out")}</button>
      </aside>
      <section className="admin-main">
        <div className="admin-breadcrumb">OFE <span>/</span> {t('Workspace management')}{!liveMode && <span className="admin-demo-badge">{t('Preview mode')}</span>}</div>
        <div className="admin-head"><div><p className="eyebrow">{t('A PLACE FOR NEW IDEAS')}</p><h1>{t(section)}</h1><p className="admin-description">{t(section === 'Submissions' ? 'Review new projects, leave helpful feedback and decide what appears on the website.' : section === 'Startups' ? 'Keep project pages up to date and manage which ones visitors can see.' : section === 'Events' ? 'Bring people together. Add event details, a cover image and publish when ready.' : section === 'Founders Cup' ? 'Team registrations for SDU Founders Cup: review teams, download presentations and confirm participants.' : section === 'News' ? 'Moderate news from the media team: hide or remove posts that should not be on the website.' : section === 'Media team' ? 'Give media access to SDU accounts so they can publish news on the Events page.' : 'Keep the stories and materials from past events in one place.')}</p></div></div>
        {notice && <div className="admin-notice" role="status"><span>✓ {t(notice)}</span><button aria-label={t('Close')} onClick={() => setNotice('')}>×</button></div>}
        {section === "Founders Cup" ? <AdminRegistrations /> : section === "News" ? <AdminNews go={go} /> : section === "Media team" ? <MediaTeam /> : section === "Events" || section === "Demo Day archive" ? (
          <div className="event-editors">
            {section === 'Demo Day archive' && !events.some(e => e.id === 'archive') && <button className="secondary" onClick={() => setEvents(rows => [...rows, {id:'archive',title:'Our first Demo Day',date:'',place:'SDU University',published:false,finalists:[]}])}>{t('Create archive')}</button>}
            {section === 'Events' && <button className="secondary" onClick={() => setEvents(rows => [...rows, {id: `event-${Date.now()}`, title: '', date: '', place: '', published: false}])}>{t('Add event')}</button>}
            {events
              .filter((e) =>
                section === "Events" ? e.id !== "archive" : e.id === "archive",
              )
              .map((event) => (
                <EventEditor key={event.id} event={event} />
              ))}
          </div>
        ) : (
          <>
            <div className="admin-stats">
              {['Pending','Approved','Rejected'].map((status, i) => <button key={status} className={`admin-stat ${filter === status ? 'selected' : ''}`} onClick={() => {setFilter(status);setSearch('');if(section === 'Startups' && status !== 'Approved')setSection('Submissions')}} aria-pressed={filter === status}>
                <span className={`stat-dot stat-${status.toLowerCase()}`} /><span>{t(status)}</span><strong>{submissions.filter(r => r.status === status).length}</strong><small>{t(['Waiting for your review','Ready for the next step','Feedback for the author'][i])}</small>
              </button>)}
            </div>
            <div className="admin-list-heading"><h2>{t(section === 'Startups' ? 'Project directory' : 'Project applications')}</h2><span>{visible.length} {t('results')}</span></div>
            <div className="table-toolbar">
              <div>
                {(section === 'Startups' ? ['All', 'Approved'] : ['All', 'Pending', 'Approved', 'Rejected']).map((x) => (
                  <button
                    className={filter === x ? "active" : ""}
                    key={x}
                    onClick={() => setFilter(x)}
                  >
                    {t(x)}
                  </button>
                ))}
              </div>
              <input
                aria-label={t("Search submissions")}
                placeholder={t("Search submissions")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="admin-project-list">
              {visible.map(row => <article className="admin-project" key={row.id}>
                <div className="admin-project-identity"><span className="admin-project-logo">{row.image ? <StorageImage src={row.image} alt="" /> : row.name.slice(0,2).toUpperCase()}</span><div><h3><button className="admin-project-title" onClick={() => {setEditing({...row});setRejecting(null)}}>{row.name}</button></h3><p>{t(row.description)}</p><div className="admin-project-tags"><span>{t(row.industry)}</span><span>{t(row.stage)}</span></div></div></div>
                <div className="admin-project-state"><span className={`status ${row.status.toLowerCase()}`}>{t(row.status)}</span><small>{t(row.status === 'Approved' && row.publication && row.visible !== false ? 'Visible on the website' : 'Not shown on the website')}</small>{!row.publication && <small className="consent-hint">{t('Author has not allowed publication')}</small>}</div>
                <div className="actions"><button onClick={() => {setEditing({...row});setRejecting(null)}}>{t('View details')}</button>
                  {row.status === 'Pending' ? <><button className="approve" onClick={() => update(row.id,'Approved')}>{t('Approve')}</button><button className="reject" onClick={() => {setRejecting(row);setEditing(null);setFeedback('')}}>{t('Request changes')}</button></> : row.status === 'Approved' ? <button disabled={!row.publication} title={!row.publication ? t('Author has not allowed publication') : undefined} onClick={async () => {if(!await setSubmissions(rows => rows.map(r => r.id === row.id ? {...r,visible:r.visible===false} : r)))return;setNotice(row.visible === false ? 'Project published on the website.' : 'Project hidden from the website.')}}>{t(row.visible === false ? 'Publish' : 'Unpublish')}</button> : <button onClick={() => update(row.id,'Pending')}>{t('Return to review')}</button>}
                </div>
              </article>)}
              {!visible.length && <div className="admin-empty"><span aria-hidden="true">⌕</span><h3>{t('No projects found')}</h3><p>{t('Try a different name or clear the filters to see all projects.')}</p><button className="secondary" onClick={() => {setFilter('All');setSearch('')}}>{t('Clear filters')}</button></div>}
            </div>
          </>
        )}
        {rejecting && <AdminModal title={`${t('Reject application')}: ${rejecting.name}`} onClose={() => {setRejecting(null);setFeedback('')}}><form onSubmit={async e => {e.preventDefault();if(!await update(rejecting.id,'Rejected'))return;setRejecting(null);setFeedback('')}}><div className="modal-form-body"><label>{t('Rejection feedback')}<textarea required rows={5} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder={t('Explain what needs to change')} /></label></div><div className="modal-form-actions"><button className="primary" disabled={!feedback.trim()}>{t('Confirm rejection')}</button><button type="button" className="secondary" onClick={() => {setRejecting(null);setFeedback('')}}>{t('Cancel')}</button></div></form></AdminModal>}
        {editing && (
          <AdminModal title={editing.name} onClose={() => setEditing(null)}>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const saved = await setSubmissions((rows) =>
                  rows.map((r) => (r.id === editing.id ? editing : r)),
                )
                if(!saved)return
                setEditing(null);setNotice("Changes saved")
              }}
            >
              <div className="modal-form-body"><label>
                {t("Startup name")}
                <input
                  required
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label>
                {t("One-line description")}
                <textarea
                  required
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </label>
              <div className="admin-private">
                <h3>{t("Team members")}</h3>
                <p>{editing.team}</p>
                {editing.members?.length ? <ul className="member-list">{editing.members.map(m => <li key={m.email}><strong>{m.email}</strong><small>{t(m.role === 'Other' ? 'Other role' : m.role)}</small></li>)}</ul> : <p className="field-help">{t('No teammates added by email.')}</p>}
                <h3>{t("Contacts for the OFE team")}</h3>
                {editing.contact ? <p className="admin-contacts"><a href={`https://t.me/${editing.contact.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">{editing.contact.telegram}</a> · <a href={`tel:${editing.contact.phone}`}>{formatPhone(editing.contact.phone)}</a></p> : <p className="field-help">{t('The author has not left contacts yet.')}</p>}
              </div>
              <div className="admin-review-summary"><span className={`status ${editing.status.toLowerCase()}`}>{t(editing.status)}</span><p>{t('Review the project details before making a decision.')}</p></div>
              <ImageUpload label="Startup logo (optional)" value={editing.image} disabledReason="Only the project owner can upload its images." onChange={image => setEditing(d => d ? {...d,image} : d)} square />
              <ImageUpload label="Startup cover" value={editing.cover} disabledReason="Only the project owner can upload its images." onChange={cover => setEditing(d => d ? {...d,cover} : d)} />
              <p>
                {t("Publication consent")}:{" "}
                {t(editing.publication ? "Given" : "Not given")} ·{" "}
                {editing.consentVersion} · {editing.consentAt}
              </p>
              </div><div className="modal-form-actions">
                <button className="primary">{t("Save changes")}</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditing(null)}
                >
                  {t("Cancel")}
                </button>
              </div>
            </form>
          </AdminModal>
        )}
      </section>
    </main>
  )
}

function AdminNews({ go }: { go: Go }) {
  const t = useT()
  const { news, setNews, lang } = useModel()
  const [notice, setNotice] = useState('')
  const rows = [...news].sort((a, b) => b.date.localeCompare(a.date))
  return <div className="admin-project-list">
    <div className="admin-list-heading"><h2>{t('News')}</h2><button type="button" className="secondary" onClick={() => go('media')}>{t('Open media desk')} ↗</button></div>
    {notice && <div className="admin-notice" role="status"><span>✓ {t(notice)}</span><button aria-label={t('Close')} onClick={() => setNotice('')}>×</button></div>}
    {rows.map(post => <article className="admin-project" key={post.id}>
      <div className="admin-project-identity"><span className="admin-project-logo">{post.title.slice(0, 2).toUpperCase()}</span><div><h3>{post.title}</h3><p>{post.excerpt}</p><div className="admin-project-tags"><span>{t(categoryMeta[post.category]?.label ?? 'News')}</span><span>{eventDate(post.date, lang).full}</span>{post.author && <span>{post.author}</span>}</div></div></div>
      <div className="admin-project-state"><span className={`status ${post.published ? 'approved' : 'pending'}`}>{t(post.published ? 'Published' : 'Draft')}</span></div>
      <div className="actions">
        <button onClick={() => go('news', post.id)}>{t('View')}</button>
        <button onClick={async () => { if (await setNews(list => list.map(item => item.id === post.id ? { ...item, published: !item.published } : item))) setNotice(post.published ? 'News hidden from the website.' : 'News published.') }}>{t(post.published ? 'Unpublish' : 'Publish')}</button>
      </div>
    </article>)}
    {!rows.length && <div className="admin-empty"><h3>{t('No posts yet')}</h3></div>}
  </div>
}

function MediaTeam() {
  const t = useT()
  const { liveMode } = useModel()
  const [editors, setEditors] = useState<{ email: string; added_at: string }[]>(liveMode ? [] : [{ email: 'media.demo@sdu.edu.kz', added_at: '2026-11-13' }])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (liveMode) listMediaEditors().then(setEditors).catch(() => setError('Apply the media migration to manage the media team.')) }, [liveMode])
  const change = async (target: string, enabled: boolean) => {
    const value = target.trim().toLowerCase()
    if (!/^[a-z0-9._%+-]+@sdu\.edu\.kz$/.test(value)) { setError('Use an @sdu.edu.kz email.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      if (liveMode) { await setMediaEditor(value, enabled); setEditors(await listMediaEditors()) }
      else setEditors(list => enabled ? (list.some(item => item.email === value) ? list : [...list, { email: value, added_at: new Date().toISOString().slice(0, 10) }]) : list.filter(item => item.email !== value))
      setNotice(enabled ? 'Media access given.' : 'Media access removed.'); if (enabled) setEmail('')
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not update the media team.') }
    finally { setBusy(false) }
  }
  return <div className="media-team">
    <form className="media-team-form" onSubmit={e => { e.preventDefault(); void change(email, true) }}>
      <label>{t('Corporate email')}<input type="email" required placeholder="name@sdu.edu.kz" value={email} onChange={e => { setEmail(e.target.value); setError('') }} /></label>
      <button className="primary" disabled={busy || !email.trim()}>{t('Give media access')}</button>
    </form>
    <p className="field-help">{t('The person must already have a confirmed SDU account on the platform.')}</p>
    {error && <p className="form-error" role="alert">{t(error)}</p>}
    {notice && <div className="admin-notice" role="status"><span>✓ {t(notice)}</span><button aria-label={t('Close')} onClick={() => setNotice('')}>×</button></div>}
    <ul className="media-team-list">{editors.map(editor => <li key={editor.email}><span className="team-member-avatar">{editor.email.slice(0, 1).toUpperCase()}</span><div><strong>{editor.email}</strong><small>{t('Media editor')} · {editor.added_at.slice(0, 10)}</small></div><button type="button" className="inline-link" disabled={busy} onClick={() => void change(editor.email, false)}>{t('Remove')}</button></li>)}</ul>
    {!editors.length && !error && <p className="field-help">{t('No media editors yet.')}</p>}
  </div>
}
