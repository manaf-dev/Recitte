// Static copy ported verbatim from the prototype. Staff do not edit this.
import type { ProgramType } from '@recitte/shared'

export interface TitledText {
  title: string
  text: string
}

export const whatWeDo: TitledText[] = [
  { title: 'Reminders', text: 'Timely nudges that make the daily portion a habit, not an afterthought.' },
  { title: 'Recitation aids', text: 'Structured plans and tools that make recitation manageable at any level.' },
  { title: 'Learning resources', text: 'Workshops, courses and seminars on Tajweed, meaning and practice.' },
  { title: 'Reflective prompts', text: 'Questions that carry the ayah from the page into the day.' },
]

export const values: TitledText[] = [
  { title: 'Authenticity', text: "Grounded in the Qur'an and the Sunnah of the Prophet ﷺ." },
  { title: 'Consistency', text: 'The most beloved deeds are those done regularly, even if small.' },
  { title: 'Accessibility', text: 'Removing barriers of time, level and cost wherever we can.' },
  { title: 'Sincerity', text: 'Everything we do is for the pleasure of Allah.' },
  { title: 'Community', text: 'We grow better and further together.' },
]

export const approach: TitledText[] = [
  { title: 'Recite', text: 'A few minutes daily, with correct pronunciation and presence.' },
  { title: 'Understand', text: 'Learn what the words mean, one passage at a time.' },
  { title: 'Reflect', text: 'Pause with prompts that bring the ayah into your life.' },
  { title: 'Implement', text: 'Turn guidance into small, consistent action.' },
]

export const offers: TitledText[] = [
  { title: 'Daily reminders', text: 'A short ayah and reflection each day to keep the connection alive.' },
  { title: 'Accountability', text: 'Challenges and check-ins that help you keep your commitment.' },
  { title: 'Brotherhood & sisterhood', text: 'A space to ask, share and encourage one another.' },
]

export const activities: (TitledText & { when: string })[] = [
  { when: 'Daily', title: 'Reminder & reflection', text: 'One ayah, one thought, one action.' },
  { when: 'Weekly', title: 'Recitation circles', text: 'Small online groups reading together with feedback.' },
  { when: 'Seasonal', title: "Qur'an challenges", text: 'Ramadan and 30-day challenges with the whole community.' },
  {
    when: 'Seasonal',
    title: 'Reminders',
    text: 'Daily Ramadan reminders and reminders through the first ten days of Dhul-Hijjah.',
  },
]

export const levels: (TitledText & { bg: string })[] = [
  { title: 'Huruf, Foundations', text: 'Arabic letters, makharij and sifat. For those beginning to read.', bg: '#F2ECB6' },
  { title: 'Tajweed Essentials', text: 'Core rules of recitation applied to short surahs.', bg: '#fff' },
  { title: 'Fluent Recitation', text: 'Reading longer passages with rhythm, accuracy and ease.', bg: '#E5E3DE' },
  { title: 'Mastery Track', text: 'Advanced Tajweed and preparation toward ijazah.', bg: '#202545' },
]

export const applySteps: TitledText[] = [
  { title: 'Submit the form', text: 'Tell us about your recitation and goals.' },
  { title: 'Placement call', text: 'A short recitation with a teacher to find your level.' },
  { title: 'Confirm your class', text: 'Choose a schedule that fits your week.' },
  { title: 'Begin', text: 'Join your first live session, bi idhnillah.' },
]

export const connectPitch =
  "A community built around the Qur'an and Sunnah, with daily reminders, challenges and companions who keep you consistent."
export const academyPitch =
  "Seminars, workshops and courses in Qur'an recitation and Tajweed, from the Arabic letters to fluent, measured recitation."

export interface Picture {
  src: string
  alt: string
}

const img = (file: string, alt: string): Picture => ({ src: `/images/${file}`, alt })

export const pictures = {
  workshopMushaf: img('workshop-mushaf.jpg', "A closed blue Qur'an with gold ornament beside purple flowers"),
  ghanaMosque: img(
    'ghana-national-mosque.jpg',
    'The domes and minaret of the Ghana National Mosque in Accra against a blue sky',
  ),
  communityCircle: img(
    'community-circle.jpg',
    "Six people sitting in a circle on a rug, each reading from a Qur'an on a wooden stand",
  ),
  kufic: img('kufic-manuscript.jpg', "Close-up of gold Kufic script on a Qur'an manuscript page"),
  heroMushaf: img('hero-mushaf.jpg', "A hand following the text of a Mushaf resting on a wooden Qur'an stand"),
  connectMosque: img('connect-mosque.jpg', "A boy reading the Qur'an on a wooden stand in a mosque"),
  manuscript1697: img(
    'quran-manuscript-1697.jpg',
    "An open illuminated Qur'an manuscript on a stand, lit against a dark ground",
  ),
} satisfies Record<string, Picture>

/** Program hero image by type, as in the prototype. */
export const heroPictureByType: Record<ProgramType, Picture> = {
  workshop: pictures.workshopMushaf,
  seminar: pictures.ghanaMosque,
  community: pictures.communityCircle,
  course: pictures.kufic,
  challenge: pictures.heroMushaf,
  event: pictures.connectMosque,
}

/** Second, round image beside "About this program". */
export const secondPictureByType: Record<ProgramType, Picture> = {
  workshop: pictures.kufic,
  seminar: pictures.connectMosque,
  community: pictures.heroMushaf,
  course: pictures.manuscript1697,
  challenge: pictures.communityCircle,
  event: pictures.ghanaMosque,
}
