import type {EventData} from './model'

// Keep the announced date correct while existing installations apply the migration.
export function correctEventDate(event:EventData):EventData {
 return event.id==='current' && event.date==='2026-11-26'
  ? {...event,date:'2026-11-25'} : event
}
