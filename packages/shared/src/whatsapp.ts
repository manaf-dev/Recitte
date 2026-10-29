export function whatsappDigits(number: string): string {
  return number.replace(/\D/g, '')
}

/** The pre-filled WhatsApp text for "I'm interested". */
export function interestMessage(title: string, formattedDate: string | null): string {
  const when = formattedDate ? ` (${formattedDate})` : ''
  return `Assalamu alaikum, I am interested in the ${title}${when}. Please share how I can attend.`
}

export function waMeUrl(whatsapp: string, text?: string): string {
  const base = `https://wa.me/${whatsappDigits(whatsapp)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
