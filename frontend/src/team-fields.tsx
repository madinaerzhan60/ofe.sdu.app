import { useId, useState } from 'react'
import type { Member } from './model'
import { useT } from './model'
import { Icon } from './ui'
import { formatPhone, isPhone, isSduEmail, isTelegram, normalizeEmail, normalizePhone, normalizeTelegram } from './validation'

export const memberRoles = ['Co-founder', 'Development', 'Design', 'Marketing', 'Research', 'Finance', 'Content', 'Operations', 'Other']
const roleLabel = (role: string) => role === 'Other' ? 'Other role' : role

/** Team members are identified by their corporate @sdu.edu.kz address, never by a free-text name. */
export function MemberEmailsField({ members, onChange, ownEmail = '', max = 12 }: { members: Member[]; onChange: (members: Member[]) => void; ownEmail?: string; max?: number }) {
  const t = useT()
  const id = useId()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(memberRoles[0])
  const [error, setError] = useState('')
  const add = () => {
    const value = normalizeEmail(email)
    if (!value) return
    if (!isSduEmail(value)) { setError('Use a corporate @sdu.edu.kz email.'); return }
    if (value === normalizeEmail(ownEmail)) { setError('You are already in the team as the author.'); return }
    if (members.some(member => member.email === value)) { setError('This person is already in the team.'); return }
    if (members.length >= max) { setError('You can add up to 12 team members.'); return }
    onChange([...members, { email: value, role }])
    setEmail(''); setError('')
  }
  return <fieldset className="member-field">
    <legend>{t('Team members')}</legend>
    <p className="field-help" id={`${id}-help`}>{t('Add teammates by their corporate SDU email. Emails are visible only to the team and OFE reviewers.')}</p>
    {members.length > 0 && <ul className="member-chips" aria-label={t('Team members')}>
      {members.map(member => <li key={member.email}>
        <span className="member-avatar" aria-hidden="true"><Icon name="users" size={16} /></span>
        <span className="member-text"><strong>{member.email}</strong><small>{t(roleLabel(member.role))}</small></span>
        <button type="button" className="icon-button" aria-label={`${t('Remove')} ${member.email}`} onClick={() => onChange(members.filter(item => item.email !== member.email))}><Icon name="close" size={16} /></button>
      </li>)}
    </ul>}
    <div className="member-add">
      <label className="member-add-email"><span className="sr-only">{t('Corporate email')}</span>
        <input type="email" inputMode="email" autoComplete="off" placeholder="student@sdu.edu.kz" value={email} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)}
          onChange={event => { setEmail(event.target.value); if (error) setError('') }}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add() } }} />
      </label>
      <label className="member-add-role"><span className="sr-only">{t('Role in the team')}</span>
        <select value={role} onChange={event => setRole(event.target.value)}>{memberRoles.map(value => <option key={value} value={value}>{t(roleLabel(value))}</option>)}</select>
      </label>
      <button type="button" className="btn btn-outline btn-sm" onClick={add} disabled={!email.trim()}><Icon name="plus" size={16} />{t('Add')}</button>
    </div>
    {error && <p className="field-error" id={`${id}-error`} role="alert">{t(error)}</p>}
    {!members.length && <p className="field-note">{t('Working alone? You can submit the project and add teammates later.')}</p>}
  </fieldset>
}

export function ContactFields({ telegram, phone, onChange }: { telegram: string; phone: string; onChange: (value: { telegram: string; phone: string }) => void }) {
  const t = useT()
  const [touched, setTouched] = useState({ telegram: false, phone: false })
  const telegramError = touched.telegram && telegram && !isTelegram(telegram) ? 'Enter a Telegram username: 5–32 letters, digits or _.' : ''
  const phoneError = touched.phone && phone && !isPhone(phone) ? 'Enter a Kazakhstan number, for example +7 701 123 45 67.' : ''
  return <fieldset className="contact-fields">
    <legend>{t('Contacts for the OFE team')}</legend>
    <p className="field-help">{t('Only you and OFE reviewers see these contacts. They are never shown on the public project page.')}</p>
    <div className="form-row">
      <label>{t('Telegram username')}
        <span className="input-with-icon"><Icon name="telegram" size={18} />
          <input required autoComplete="off" placeholder="@username" value={telegram} aria-invalid={Boolean(telegramError)}
            onChange={event => onChange({ telegram: event.target.value, phone })}
            onBlur={() => { setTouched(value => ({ ...value, telegram: true })); if (telegram) onChange({ telegram: normalizeTelegram(telegram), phone }) }} /></span>
        {telegramError && <span className="field-error" role="alert">{t(telegramError)}</span>}
      </label>
      <label>{t('Phone number')}
        <span className="input-with-icon"><Icon name="phone" size={18} />
          <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 7__ ___ __ __" value={phone} aria-invalid={Boolean(phoneError)}
            onChange={event => onChange({ telegram, phone: event.target.value })}
            onBlur={() => { setTouched(value => ({ ...value, phone: true })); if (phone && isPhone(phone)) onChange({ telegram, phone: formatPhone(phone) }) }} /></span>
        {phoneError && <span className="field-error" role="alert">{t(phoneError)}</span>}
      </label>
    </div>
  </fieldset>
}

export const contactIsValid = (telegram: string, phone: string) => isTelegram(telegram) && isPhone(phone)
export const cleanContact = (telegram: string, phone: string) => ({ telegram: normalizeTelegram(telegram), phone: normalizePhone(phone) })
