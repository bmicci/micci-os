// America/Chicago helpers for dispatcher and briefs
export function chicagoNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
}

export function chicagoDate(): string {
  const d = chicagoNow()
  return d.toISOString().slice(0, 10)
}

export function chicagoTime(): string {
  const d = chicagoNow()
  return d.toTimeString().slice(0, 5) // HH:MM
}

export function chicagoWeekday(): string {
  const days = ['sun','mon','tue','wed','thu','fri','sat']
  return days[chicagoNow().getDay()]
}
