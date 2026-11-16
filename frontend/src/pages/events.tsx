import { useState } from 'react'
import { NewsCard, categoryMeta, safeCover } from '../cards'
import { eventDate } from '../event-date'
import { newsCategories, useModel, useT, type NewsCategory } from '../model'
import { Link, useRouter } from '../router'
import { Icon, PageHero, SectionHead, useReveal } from '../ui'

const isCategory = (value?: string): value is NewsCategory => Boolean(value && (newsCategories as readonly string[]).includes(value))

export function Events() {
  const t = useT()
  const { route, go } = useRouter()
  const { news, events, lang, isMediaEditor } = useModel()
  const [shown, setShown] = useState(9)
  const category = isCategory(route.id) ? route.id : 'all'
  const published = news.filter(post => post.published).sort((a, b) => b.date.localeCompare(a.date))
  const visible = category === 'all' ? published : published.filter(post => post.category === category)
  const upcoming = events.filter(event => event.id !== 'archive' && event.published && event.date).sort((a, b) => a.date.localeCompare(b.date))
  useReveal([category, shown, visible.length])
  return <main id="main" className="events-hub">
    <PageHero eyebrow={t('Events & news')} crumbs={category === 'all' ? [{ label: 'Events' }] : [{ label: 'Events', to: 'events' }, { label: categoryMeta[category].label }]}
      title={category === 'all' ? t('Events and news') : t(categoryMeta[category].label)} image="/demo-day/IMG_7414.webp"
      lead={t('Business and IT at the university, hackathons, championships and the students who won them.')}>
      {isMediaEditor && <Link to="media" className="btn btn-accent"><Icon name="edit" size={18} />{t('Publish news')}</Link>}
    </PageHero>

    {upcoming.length > 0 && <section className="pg-section pg-section-tight">
      <div className="wrap">
        <SectionHead eyebrow={t('Upcoming')} title={t('Events')} action={<a className="link-arrow" href="/archive.html">{t('Demo Day archive')}<Icon name="arrowUpRight" size={16} /></a>} />
        <div className="event-strip">{upcoming.map((event, i) => <Link key={event.id} to="demo" className="event-item reveal-up" style={{ '--i': i } as React.CSSProperties}>
          <span className="event-item-date"><strong>{event.date.slice(8)}</strong><span>{eventDate(event.date, lang).month}</span><small>{event.date.slice(0, 4)}</small></span>
          <span className="event-item-copy"><span className="chip">{t('Demo Day')}</span><strong>{event.title === 'SDU FOUNDERS CUP' ? 'SDU Founders Cup' : t(event.title)}</strong><span><Icon name="pin" size={16} />{t(event.place)} · {eventDate(event.date, lang).weekday}</span></span>
          <span className="event-item-cta">{t('Details')}<Icon name="arrow" size={18} /></span>
        </Link>)}</div>
      </div>
    </section>}

    <section className="pg-section pg-section-muted" aria-labelledby="news-title">
      <div className="wrap">
        <div className="section-heading"><div><p className="kicker">{t('News')}</p><h2 id="news-title">{t('Latest news')}</h2></div></div>
        <div className="category-tabs" role="tablist" aria-label={t('News categories')}>
          {(['all', ...newsCategories] as const).map(key => {
            const count = key === 'all' ? published.length : published.filter(post => post.category === key).length
            return <button key={key} type="button" role="tab" aria-selected={category === key} className={`category-tab${category === key ? ' is-active' : ''}`} onClick={() => go('events', key === 'all' ? undefined : key)}>
              {key !== 'all' && <Icon name={categoryMeta[key].icon} size={16} />}{t(key === 'all' ? 'All news' : categoryMeta[key].label)}<small>{count}</small>
            </button>
          })}
        </div>
        {visible.length ? <div className="news-grid">{visible.slice(0, shown).map((post, i) => <NewsCard key={post.id} post={post} index={i % 6} variant={i === 0 && category === 'all' ? 'feature' : 'default'} />)}</div>
          : <div className="empty-state"><Icon name="megaphone" size={36} /><h3>{t('No news in this category yet')}</h3><p>{t('The OFE media team will publish news here soon.')}</p><button type="button" className="btn btn-outline" onClick={() => go('events')}>{t('All news')}</button></div>}
        {visible.length > shown && <div className="more-row"><button type="button" className="btn btn-outline" onClick={() => setShown(shown + 9)}>{t('Show more news')}</button></div>}
      </div>
    </section>
  </main>
}

export function NewsArticle() {
  const t = useT()
  const { route } = useRouter()
  const { news, lang, isMediaEditor } = useModel()
  const post = news.find(item => item.id === route.id && (item.published || isMediaEditor))
  useReveal([route.id])
  if (!post) return <main id="main" className="wrap page-missing"><Icon name="megaphone" size={40} /><h1>{t('News not found')}</h1><Link to="events" className="btn btn-primary">{t('All news')}</Link></main>
  const meta = categoryMeta[post.category] ?? categoryMeta.university
  const cover = safeCover(post.cover)
  const related = news.filter(item => item.published && item.id !== post.id).sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category) || b.date.localeCompare(a.date)).slice(0, 3)
  const link = post.link && (/^https:\/\//i.test(post.link) || /^\/[\w./-]*$/.test(post.link)) ? post.link : undefined
  return <main id="main" className="article-page">
    <header className="article-head">
      <div className="wrap article-head-inner">
        <nav className="breadcrumbs" aria-label={t('Breadcrumbs')}><ol><li><Link to="home">{t('Home')}</Link></li><li><Link to="events">{t('Events')}</Link></li><li><Link to="events" id={post.category}>{t(meta.label)}</Link></li></ol></nav>
        <p className="article-meta"><span className="chip"><Icon name={meta.icon} size={14} />{t(meta.label)}</span><time dateTime={post.date}>{eventDate(post.date, lang).full}</time>{post.sample && <span className="badge-sample">{t('Example')}</span>}{!post.published && <span className="badge-draft">{t('Draft')}</span>}</p>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="article-lead">{post.excerpt}</p>}
      </div>
    </header>
    {cover && <figure className="wrap article-cover"><img src={cover} alt="" width={1600} height={898} /></figure>}
    <div className="wrap article-layout">
      <div className="prose article-body">{post.body.split('\n').filter(line => line.trim()).map((line, i) => <p key={i}>{line}</p>)}
        {link && <p><a className="btn btn-outline" href={link} {...(link.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{t('Learn more')}<Icon name="arrowUpRight" size={16} /></a></p>}
      </div>
      <aside className="article-aside">
        <button type="button" className="btn btn-outline btn-block" onClick={() => { void navigator.clipboard?.writeText(window.location.href) }}><Icon name="link" size={16} />{t('Copy link')}</button>
        {isMediaEditor && <Link to="media" className="btn btn-ghost btn-block"><Icon name="edit" size={16} />{t('Media desk')}</Link>}
      </aside>
    </div>
    {related.length > 0 && <section className="pg-section pg-section-muted"><div className="wrap"><SectionHead title={t('More news')} action={<Link to="events" className="link-arrow">{t('All news')}<Icon name="arrow" size={16} /></Link>} />
      <div className="news-grid">{related.map((item, i) => <NewsCard key={item.id} post={item} index={i} />)}</div></div></section>}
  </main>
}
