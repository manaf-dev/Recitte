// CC BY-SA 4.0 photographs that need a visible credit (from the prototype's
// assets/credits.json). These files are used unaltered.
export interface PhotoCredit {
  file: string
  title: string
  creator: string
  creatorUrl: string
  license: string
  licenseUrl: string
  page: string
  via: string
}

export const photoCredits: PhotoCredit[] = [
  {
    file: '/images/quran-manuscript-1697.jpg',
    title: 'Quran Manuscript 1697',
    creator: 'Fred Cherrygarden',
    creatorUrl: 'https://commons.wikimedia.org/wiki/User:Fred_Cherrygarden',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    page: 'https://commons.wikimedia.org/w/index.php?curid=149446380',
    via: 'Wikimedia Commons',
  },
  {
    file: '/images/kufic-manuscript.jpg',
    title: 'Close-up of Kufic Quranic Manuscript',
    creator: 'Bebo12321',
    creatorUrl: 'https://commons.wikimedia.org/w/index.php?title=User:Bebo12321&action=edit&redlink=1',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    page: 'https://commons.wikimedia.org/w/index.php?curid=178937067',
    via: 'Wikimedia Commons',
  },
  {
    file: '/images/ghana-national-mosque.jpg',
    title: 'Ghana National Mosque 01',
    creator: 'Sir Amugi',
    creatorUrl: 'https://commons.wikimedia.org/wiki/User:Sir_Amugi',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    page: 'https://commons.wikimedia.org/w/index.php?curid=123464893',
    via: 'Wikimedia Commons',
  },
]
