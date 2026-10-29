export function mailto(email: string, subject?: string): string {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
}

/** `+233 54 063 4141` → `tel:+233540634141`. */
export function tel(phone: string): string {
  const trimmed = phone.trim()
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${trimmed.replace(/\D/g, '')}`
}
