import { StorageImage } from './storage'
import { eventDate } from './event-date'
import { useModel, useT, type NewsCategory, type NewsPost, type Submission } from './model'
import { Link } from './router'
import { Icon, type IconName } from './ui'

export const categoryMeta: Record<NewsCategory, { label: string; icon: IconName }> = {
  business: { label: 'Business', icon: 'briefcase' },
  it: { label: 'IT', icon: 'code' },
  hackathons: { label: 'Hackathons', icon: 'zap' },
  championships: { label: 'Championships', icon: 'flag' },
  champions: { label: 'Winners & champions', icon: 'trophy' },
  university: { label: 'University life', icon: 'building' },
}

/** News covers are public files: site images, https URLs or, in the demo, an inline preview. */
export const safeCover = (value?: string) => value && (/^https:\/\//i.test(value) || /^\/[\w./-]+$/.test(value) || /^data:image\/(webp|png|jpeg);base64,/.test(value)) ? value : undefined

export function NewsCard({ post, variant = 'default', index = 0 }: { post: NewsPost; variant?: 'default' | 'feature' | 'compact'; index?: number }) {
  const t = useT()
  const { lang } = useModel()
  const meta = categoryMeta[post.category] ?? categoryMeta.university
  const cover = safeCover(post.cover)
  return <article className={`news-card news-card-${variant} reveal-up`} style={{ '--i': index } as React.CSSProperties}>
    <Link to="news" id={post.id} className="news-card-link">
      <span className="news-card-media">
        {cover ? <img src={cover} alt="" loading={variant === 'feature' ? 'eager' : 'lazy'} width={800} height={450} /> : <span className="news-card-placeholder"><Icon name={meta.icon} size={40} /></span>}
        <span className="chip chip-on-media"><Icon name={meta.icon} size={14} />{t(meta.label)}</span>
      </span>
      <span className="news-card-body">
        <span className="news-card-meta"><time dateTime={post.date}>{eventDate(post.date, lang).full}</time>{post.sample && <span className="badge-sample">{t('Example')}</span>}{!post.published && <span className="badge-draft">{t('Draft')}</span>}</span>
        <strong className="news-card-title">{post.title}</strong>
        {variant !== 'compact' && post.excerpt && <span className="news-card-excerpt">{post.excerpt}</span>}
        <span className="news-card-more">{t('Read more')}<Icon name="arrow" size={16} /></span>
      </span>
    </Link>
  </article>
}

export const isPublic = (row: Submission) => row.status === 'Approved' && row.publication && row.visible !== false

export function ProjectCard({ project, index = 0 }: { project: Submission; index?: number }) {
  const t = useT()
  return <article className="pcard reveal-up" style={{ '--i': index % 6 } as React.CSSProperties}>
    <Link to="profile" id={project.id} className="pcard-link">
      <span className={`pcard-cover pattern-${index % 4}`}>
        {project.cover ? <StorageImage src={project.cover} alt="" /> : <span className="pcard-word" aria-hidden="true">{project.name}</span>}
        <span className="chip chip-on-media">{t(project.industry || 'Other')}</span>
      </span>
      <span className="pcard-body">
        <span className="pcard-identity">
          <span className="pcard-logo">{project.image ? <StorageImage src={project.image} alt="" /> : project.name.slice(0, 2).toUpperCase()}</span>
          <strong>{project.name}</strong>
          <Icon name="arrowUpRight" size={18} className="pcard-arrow" />
        </span>
        <span className="pcard-desc">{t(project.description)}</span>
        <span className="pcard-foot"><span className="stage-dot" data-stage={project.stage} />{t(project.stage || 'Idea')}</span>
      </span>
    </Link>
  </article>
}
