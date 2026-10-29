import { waMeUrl, whatsappDigits, type SocialLink } from '@recitte/shared'

export const JOIN_CHANNEL_MESSAGE = 'Assalamu alaikum, I would like to join the Recitte WhatsApp channel.'

export interface ChannelLink {
  href: string
  /** 'channel': the channel itself; 'community': the community invite; 'message': ask the team on WhatsApp. */
  kind: 'channel' | 'community' | 'message'
}

/**
 * Where "Join the WhatsApp channel" goes, best first:
 * 1. the WhatsApp row under social links (its URL, even if the footer icon is hidden),
 * 2. the community join link,
 * 3. a pre-filled WhatsApp message to the team's number.
 * Null only when none of these is set.
 */
export function whatsappChannelLink(
  socials: readonly Pick<SocialLink, 'platform' | 'url'>[],
  communityLink: string,
  whatsappNumber: string,
): ChannelLink | null {
  const channel = socials.find((s) => s.platform === 'whatsapp')?.url.trim()
  if (channel) return { href: channel, kind: 'channel' }
  if (communityLink.trim()) return { href: communityLink.trim(), kind: 'community' }
  if (whatsappDigits(whatsappNumber).length >= 7) return { href: waMeUrl(whatsappNumber, JOIN_CHANNEL_MESSAGE), kind: 'message' }
  return null
}
