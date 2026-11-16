import { useEffect, useState } from 'react'
import { eventDate } from '../event-date'
import { StorageImage } from '../storage'
import { useModel, useT, type EventData } from '../model'
import { Link } from '../router'
import { registrationDeadline, registrationIsOpen } from './register'
import { Icon } from '../ui'

export function Countdown({ date = "2026-11-21" }: { date?: string }) {
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

function externalUrl(value?: string): string | undefined {
  try { const url = new URL(value?.trim() || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}

export function FoundersCup() {
  const t = useT()
  const { events, lang } = useModel()
  const publishedEvent = events.find((e) => e.id === "current" && e.published) ?? events.find(e => e.id !== "archive" && e.published && e.date)
  const current: EventData = publishedEvent ?? {id:'announced-founders-cup',title:'SDU FOUNDERS CUP',date:'2026-11-21',place:'Venue to be confirmed',published:false}
  const past = events.find((e) => e.id === "archive" && e.published)
  const registrationUrl = externalUrl(current.registrationUrl || import.meta.env.VITE_EVENT_REGISTRATION_URL)
  const archiveUrl = '/archive.html'
return (
    <main id="main" className="events-page">
      {!current ? <section className="shell page"><h1>{t('No upcoming Demo Day')}</h1><p>{t('Check the archive for previous editions.')}</p></section> : <>      <section className="demo-hero">
        {current.image && <StorageImage className="demo-event-image" src={current.image} alt={current.title} />}
        {!current && (
          <p className="shell">{t("Event unpublished in this preview.")}</p>
        )}
        <div className="shell event-hero-layout">
          <div className="event-hero-copy">
            <Link to="events" className="event-back">← {t('All events')}</Link>
            <p className="event-kicker"><span />{t(current.title)}</p>
            <h1><span className="event-title-university">SDU</span><span className="event-title-name">FOUNDERS CUP</span></h1>
            <p className="event-hero-description">{t('Meet student founders, discover fresh ideas and connect with the OFE community.')}</p>
            <div className="event-countdown"><span className="event-countdown-label">{t('Until we meet')}</span><Countdown date={current.date} /></div>
            <div className="event-register-cta">
              <Link to="register" className="btn btn-accent btn-lg">{t(registrationIsOpen(current) ? 'Register your team' : 'Team registration')}<Icon name="arrow" size={18} /></Link>
              <span>{t(registrationIsOpen(current) ? 'Registration is open until' : 'Registration closed on')} {new Intl.DateTimeFormat(lang === 'KK' ? 'kk-KZ' : lang === 'RU' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' }).format(new Date(registrationDeadline(current).getTime() - 60000))}</span>
            </div>
          </div>
          <aside className="event-ticket" aria-label={t('Event details')}>
            <div className="event-poster" aria-hidden="true"><div className="event-poster-meta"><span>SDU · OFE</span><span>{current.date.split('-').reverse().join(' · ')}</span></div><div className="event-poster-type"><span>FOUNDERS</span><span>CUP<span className="poster-arrow">↗</span></span></div><svg className="poster-spark" viewBox="0 0 100 100"><path d="M50 0 58 32 85 15 68 42 100 50 68 58 85 85 58 68 50 100 42 68 15 85 32 58 0 50 32 42 15 15 42 32Z" /></svg><span className="event-poster-footer">{t('IDEAS BECOME REAL')}</span></div>
            <div className="event-ticket-top"><span>{t('YOU’RE INVITED')}</span><span className="event-ticket-badge">{t('Demo Day')}</span></div>
            <div className="event-date-display">
              <div className="event-day"><span>{eventDate(current.date,lang).month.replace('.', '')}</span><strong>{current.date.slice(8)}</strong></div>
              <div><span className="event-field-label">{t('DATE')}</span><time dateTime={current.date}>{eventDate(current.date,lang).full}</time><small>{eventDate(current.date,lang).weekday}</small></div>
            </div>
            <div className="event-location"><span className="event-location-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><div><span className="event-field-label">{t('PLACE')}</span><strong>{t(current.place)}</strong><small>{t('Follow this page for event updates.')}</small></div></div>
            <div className="ticket-perforation" aria-hidden="true" />
            {registrationIsOpen(current) ? <Link to="register" className="event-register">{t('Register your team')}<span aria-hidden="true">↗</span></Link> : registrationUrl ? <a className="event-register" href={registrationUrl} target="_blank" rel="noopener noreferrer">{t('Register to attend')}<span aria-hidden="true">↗</span></a> : <Link to="register" className="event-register">{t('Team registration')}<span aria-hidden="true">↗</span></Link>}
            <button className="event-calendar" onClick={() => {
              const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
              const date = current.date.replace(/-/g, '')
              const next = new Date(current.date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1)
              const calendar = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OFE//Events//EN','BEGIN:VEVENT',`UID:${current.id}-${date}@ofe.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z')}`,`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replace(/-/g,'')}`,`SUMMARY:${escape(current.title)}`,`LOCATION:${escape(current.place)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n')
              const url = URL.createObjectURL(new Blob([calendar], {type:'text/calendar;charset=utf-8'})); const link = document.createElement('a'); link.href=url; link.download='ofe-demo-day.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}>{t('Add to calendar')}<span aria-hidden="true">＋</span></button>

          </aside>
        </div>
        <div className="event-ticker" aria-hidden="true"><div><span><b>SDU FOUNDERS CUP</b><i>✳</i>{t('MEET THE NEXT GENERATION')}<i>✳</i><b>{t('IDEAS BECOME REAL')}</b><i>✳</i></span><span><b>SDU FOUNDERS CUP</b><i>✳</i>{t('MEET THE NEXT GENERATION')}<i>✳</i><b>{t('IDEAS BECOME REAL')}</b><i>✳</i></span></div></div>
      </section>
      <section className="section shell program">
        <div className="section-head">
          <p className="eyebrow">{t("PROPOSED PROGRAM")}</p>
          <h2>{t('Program')}</h2>
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
</>}
      <section className="section shell archive">
        <div className="section-head">
          <p className="eyebrow">{t("ARCHIVE")}</p>
          <h2>{t("Our first Demo Day")}</h2>
        </div>
        <a className="archive-feature" href={archiveUrl}>
          <span className="archive-feature-mark" aria-hidden="true">01<span>OFE<br/>DEMO DAY</span></span>
          <span className="archive-feature-copy"><strong>Demo Day 2026</strong><span className="archive-feature-link">{t('Open archive')} →</span></span>
        </a>

      </section>
    </main>
  )
}
