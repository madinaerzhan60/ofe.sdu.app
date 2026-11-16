import type { Submission } from './model'

/** Event products are read-only catalogue entries, never editable submissions. */
export type EventProject = Pick<Submission, 'id' | 'name' | 'description' | 'about' | 'industry' | 'stage' | 'team' | 'product' | 'createdAt'> & {
  source: 'event'
  eventIds: string[]
  image?: undefined
  cover?: string
}
export type CatalogProject = Submission | EventProject
export const isPublic = (row: Submission) => !row.removed && row.status === 'Approved' && row.publication && row.visible !== false
export const publicProjects = (submissions: Submission[], eventProjects: EventProject[]): CatalogProject[] => [
  ...submissions.filter(isPublic), ...eventProjects,
]
export const forEvent = (projects: CatalogProject[], eventId: string) => projects.filter(project => project.eventIds?.includes(eventId))
