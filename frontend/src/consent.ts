import type { Submission } from './model'

export const publicationConsentVersion = '2026-10-22'

// Use the compatibility project write; the database appends the consent audit row.
export function withPublicationConsent(row: Submission, userId: string, granted: boolean, now = new Date()): Submission {
  if (!userId || row.ownerId !== userId) throw new Error('Only the project owner can change publication consent.')
  return {...row, publication: granted, consentVersion: publicationConsentVersion, consentAt: now.toISOString()}
}
