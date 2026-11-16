import { useState, type FormEvent } from 'react'
import { uploadNewsCover } from '../backend'
import { NewsCard, categoryMeta, safeCover } from '../cards'
import { eventDate } from '../event-date'
import { AdminModal } from '../flows'
import { newsCategories, useModel, useT, type NewsCategory, type NewsPost } from '../model'
import { Link, useRouter } from '../router'
import { Icon, PageHero, blobToDataUrl, compressImage } from '../ui'

const gallery = ['/demo-day/awards.webp', '/demo-day/IMG_7414.webp', '/demo-day/IMG_7500.webp', '/demo-day/IMG_7247.webp', '/demo-day/IMG_7440.webp', '/demo-day/IMG_7494.webp', '/demo-day/IMG_7388.webp']
const today = () => new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10)
const blank = (): NewsPost => ({ id: '', title: '', excerpt: '', body: '', category: 'business', date: today(), published: false, cover: '', link: '' })

function NewsEditor({ initial, onDone }: { initial: NewsPost; onDone: (message: string) => void }) {
  const t = useT()
  const { setNews, liveMode, userEmail } = useModel()
  const [draft, setDraft] = useState<NewsPost>(initial)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const isNew = !initial.id
  const linkValid = !draft.link || /^https:\/\/\S+$/i.test(draft.link) || /^\/[\w./-]*$/.test(draft.link)
  const save = async (publish: boolean) => {
    if (!draft.title.trim() || !draft.body.trim()) { setError('Add a title and the text of the news.'); return }
    if (!linkValid) { setError('The link must start with https://'); return }
    setBusy(true); setError('')
    const id = draft.id || `news-${Date.now().toString(36)}`
    const row: NewsPost = { ...draft, id, title: draft.title.trim(), excerpt: draft.excerpt.trim(), body: draft.body.trim(), link: draft.link?.trim() || undefined, cover: draft.cover || undefined, published: publish, author: draft.author || userEmail || undefined, sample: false }
    const ok = await setNews(rows => isNew ? [row, ...rows] : rows.map(item => item.id === id ? row : item))
    setBusy(false)
    if (ok) onDone(publish ? 'News published.' : 'Draft saved.')
  }
  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true); setError('')
    try {
      const blob = await compressImage(file)
      const id = draft.id || `news-${Date.now().toString(36)}`
      const cover = liveMode ? await uploadNewsCover(blob, id) : await blobToDataUrl(blob)
      setDraft(value => ({ ...value, id: value.id || id, cover }))
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Image upload failed.') }
    finally { setUploading(false) }
  }
  const preview: NewsPost = { ...draft, id: draft.id || 'preview', title: draft.title || t('News title'), excerpt: draft.excerpt || t('A short summary appears in the news feed.') }
  return <form className="news-editor" onSubmit={(event: FormEvent) => { event.preventDefault(); void save(true) }}>
    <div className="news-editor-fields">
      <label>{t('Title')}<input required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder={t('For example: SDU team won the hackathon')} /></label>
      <div className="form-row">
        <label>{t('Category')}<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as NewsCategory })}>{newsCategories.map(key => <option key={key} value={key}>{t(categoryMeta[key].label)}</option>)}</select></label>
        <label>{t('Date')}<input type="date" required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
      </div>
      <label>{t('Short summary')}<small className="field-help">{t('One or two sentences for the news feed.')}</small><textarea rows={2} maxLength={300} value={draft.excerpt} onChange={e => setDraft({ ...draft, excerpt: e.target.value })} /></label>
      <label>{t('Text')}<small className="field-help">{t('Separate paragraphs with an empty line.')}</small><textarea required rows={9} maxLength={8000} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
      <fieldset className="cover-picker">
        <legend>{t('Cover image')}</legend>
        <div className="cover-options">
          <label className="cover-upload"><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} /><Icon name="image" size={22} /><span>{t(uploading ? 'Loading image…' : 'Upload')}</span></label>
          {gallery.map(src => <button key={src} type="button" className={`cover-option${draft.cover === src ? ' is-active' : ''}`} aria-pressed={draft.cover === src} aria-label={t('Use this photo')} onClick={() => setDraft({ ...draft, cover: src })}><img src={src} alt="" loading="lazy" width={120} height={68} /></button>)}
        </div>
        {draft.cover && <button type="button" className="link-arrow" onClick={() => setDraft({ ...draft, cover: '' })}>{t('Remove image')}</button>}
      </fieldset>
      <label>{t('Link (optional)')}<input type="url" inputMode="url" placeholder="https://" value={draft.link ?? ''} aria-invalid={!linkValid} onChange={e => setDraft({ ...draft, link: e.target.value })} /></label>
      <label className="check-row"><input type="checkbox" checked={Boolean(draft.pinned)} onChange={e => setDraft({ ...draft, pinned: e.target.checked })} />{t('Pin to the top of the home page')}</label>
      {error && <p className="field-error" role="alert">{t(error)}</p>}
      <div className="news-editor-actions">
        <button type="button" className="btn btn-outline" disabled={busy || uploading} onClick={() => void save(false)}>{t('Save draft')}</button>
        <button type="submit" className="btn btn-primary" disabled={busy || uploading}>{t(busy ? 'Please wait…' : draft.published ? 'Update news' : 'Publish')}</button>
      </div>
    </div>
    <aside className="news-editor-preview" aria-label={t('Preview')}><p className="kicker">{t('Preview')}</p><NewsCard post={{ ...preview, cover: safeCover(draft.cover) }} /></aside>
  </form>
}

export function MediaDesk() {
  const t = useT()
  const { go } = useRouter()
  const { news, setNews, isMediaEditor, account, liveMode, lang, setAccount, setDemoMedia, authLoading } = useModel()
  const [editing, setEditing] = useState<NewsPost | null>(null)
  const [removing, setRemoving] = useState<NewsPost | null>(null)
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all')
  if (!isMediaEditor) return <main id="main" className="media-page">
    <PageHero eyebrow={t('Media')} crumbs={[{ label: 'Media desk' }]} title={t('Media desk')} lead={t('The OFE media team publishes news about business and IT at SDU, hackathons, championships and student wins.')} />
    <section className="pg-section"><div className="wrap gate-card">
      <Icon name="megaphone" size={40} />
      <h2>{t(authLoading ? 'Please wait…' : 'Media access required')}</h2>
      <p>{t(account === 'student' ? 'Your account does not have media access yet. Ask an OFE administrator to add your SDU email to the media team.' : 'Sign in with your SDU account. Media access is given by an OFE administrator.')}</p>
      <div className="button-group">
        {account !== 'student' && <button type="button" className="btn btn-primary" onClick={() => go('apply')}>{t('Sign in')}</button>}
        {!liveMode && <button type="button" className="btn btn-outline" onClick={() => { setAccount('student'); setDemoMedia(true) }}>{t('Continue as demo media editor')}</button>}
        <Link to="events" className="btn btn-ghost">{t('Read the news')}</Link>
      </div>
    </div></section>
  </main>
  const rows = [...news].sort((a, b) => b.date.localeCompare(a.date)).filter(post => filter === 'all' || (filter === 'published') === post.published)
  return <main id="main" className="media-page">
    <PageHero eyebrow={t('Media')} crumbs={[{ label: 'Media desk' }]} title={t('Media desk')} lead={t('Write news, add a cover and publish it to the Events page.')}>
      <button type="button" className="btn btn-accent" onClick={() => { setEditing(null); requestAnimationFrame(() => setEditing({ ...blank() })); setNotice('') }}><Icon name="plus" size={18} />{t('New post')}</button>
    </PageHero>
    <section className="pg-section pg-section-tight"><div className="wrap">
      {!liveMode && <p className="notice">{t('Demo mode · Posts are kept only in this browser tab.')}</p>}
      {notice && <p className="success-banner" role="status"><Icon name="check" size={18} />{t(notice)}</p>}
      {editing && <div className="editor-panel"><div className="editor-panel-head"><h2>{t(editing.id ? 'Edit news' : 'New post')}</h2><button type="button" className="icon-button" aria-label={t('Close')} onClick={() => setEditing(null)}><Icon name="close" size={20} /></button></div><NewsEditor key={editing.id || 'new'} initial={editing} onDone={message => { setEditing(null); setNotice(message) }} /></div>}
      <div className="desk-toolbar">
        <div className="chip-row" role="group" aria-label={t('Filter')}>{(['all', 'published', 'drafts'] as const).map(key => <button key={key} type="button" className={`chip-button${filter === key ? ' is-active' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>{t(key === 'all' ? 'All posts' : key === 'published' ? 'Published' : 'Drafts')}<small>{news.filter(post => key === 'all' || (key === 'published') === post.published).length}</small></button>)}</div>
      </div>
      <ul className="desk-list">{rows.map(post => <li key={post.id} className="desk-row">
        <span className="desk-thumb">{safeCover(post.cover) ? <img src={safeCover(post.cover)} alt="" loading="lazy" width={96} height={64} /> : <Icon name={categoryMeta[post.category]?.icon ?? 'megaphone'} size={22} />}</span>
        <span className="desk-copy"><strong>{post.title}</strong><small>{t(categoryMeta[post.category]?.label ?? 'News')} · {eventDate(post.date, lang).full}{post.sample ? ` · ${t('Example')}` : ''}</small></span>
        <span className={`status-pill ${post.published ? 'is-live' : 'is-draft'}`}>{t(post.published ? 'Published' : 'Draft')}</span>
        <span className="desk-actions">
          <Link to="news" id={post.id} className="icon-button" aria-label={`${t('View')}: ${post.title}`}><Icon name="eye" size={18} /></Link>
          <button type="button" className="icon-button" aria-label={`${t('Edit news')}: ${post.title}`} onClick={() => { setEditing(post); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Icon name="edit" size={18} /></button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { if (await setNews(list => list.map(item => item.id === post.id ? { ...item, published: !item.published } : item))) setNotice(post.published ? 'News hidden from the website.' : 'News published.') }}>{t(post.published ? 'Unpublish' : 'Publish')}</button>
          <button type="button" className="icon-button danger" aria-label={`${t('Delete')}: ${post.title}`} onClick={() => setRemoving(post)}><Icon name="trash" size={18} /></button>
        </span>
      </li>)}</ul>
      {!rows.length && <div className="empty-state"><Icon name="megaphone" size={36} /><h3>{t('No posts yet')}</h3></div>}
    </div></section>
    {removing && <AdminModal title={removing.title} eyebrow="Delete news" onClose={() => setRemoving(null)}>
      <div className="modal-form-body"><p>{t('Delete this news? This cannot be undone.')}</p></div>
      <div className="modal-form-actions"><button type="button" className="secondary" onClick={() => setRemoving(null)}>{t('Cancel')}</button><button type="button" className="primary danger-button" onClick={async () => { const id = removing.id; if (await setNews(list => list.filter(item => item.id !== id))) { setRemoving(null); setNotice('News deleted.') } }}>{t('Delete')}</button></div>
    </AdminModal>}
  </main>
}
