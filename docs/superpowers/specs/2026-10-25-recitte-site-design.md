# Recitte site design

Date: 2026-10-25

The prototype on branch `prototype` is the visual and copy reference. This document is the brief for the real site. A builder should be able to plan from it without asking the client again.

## Intent

Recitte has no website. A program, an event, or a call for applications becomes a flyer, then a social post, and then it scrolls away. Replies live in chats.

The public site is the page those posts should point to: a durable place for Muslims who want a small, regular connection with the Qur'an. The admin is the desk for the people who make the flyers. They publish what changes, and they read what people send.

## Goals

- A public site with the prototype's pages, look, and copy: Home, About, Connect, Academy, a page per program, and Contact.
- Two paths. Recitte Connect is the free community (WhatsApp reminders, challenges, companions). Recitte Academy is structured learning (seminars, workshops, courses from the Arabic letters toward ijazah).
- Each program has its own address, suitable for the link under a flyer.
- Staff can add and later correct programs, testimonials, the homepage headline, contact details, the community link, and which social accounts appear.
- Applications, registrations, and contact messages arrive in the admin as a queue. Each starts as new and can be marked handled.
- On submit, email goes to the staff address in settings, and the person who wrote in gets a short acknowledgement. A person still writes the real reply.
- "I'm interested" still opens WhatsApp with the message filled in, and also saves that interest in the registrations queue.
- The admin is a separate app on an admin subdomain. Sign-in is required. The super admin is created in Supabase. That person invites everyone else from a screen in the admin. Each staff person has their own email link.
- One git repository. `main` does not contain the prototype. Feature branches come off `main`. Branch `prototype` stays as the reference.

## Non-goals

- Accounts for applicants, or any way for a visitor to check a submission later.
- Payments, class video, or scheduling inside the site.
- A full permission system. Invited staff and the super admin use the same content and queue tools. The only difference is the staff screen: only the super admin can invite or remove someone.
- Editing About, the four Academy levels, vision, mission, values, approach, community offers, or community activities from the admin. That copy ships in the site.
- Saving or syncing the five-minute homepage timer. It runs in the browser only.
- A second git repository, or admin screens inside the public app.
- A visual redesign. Port the prototype's layout, type, color, and wording.
- Sample testimonials, sample programs, or placeholder social links presented as real.

## Anti-goals

These are failures even if the rest works:

- A visitor can read, list, or edit someone else's application, registration, or message.
- Staff screens are served from the public site.
- A submission is lost because the notification email failed.
- The on-screen success message claims an email was sent when it was not.
- "What's happening now" depends on a free-text date and cannot tell that a seminar is over.
- Staff share one password, anyone can create an admin account, or an invited staff member can invite someone else.
- A finished seminar stays in "what's happening now".
- Fake quotes or a fake speaker ship in production data.

## Constraints

- Public site: Nuxt, Vue 3, Composition API, Tailwind.
- Admin: Vite, Vue 3, Vue Router, Composition API, Tailwind. It is not indexed.
- Backend: Supabase (Postgres, Auth, Storage). Row Level Security is the access boundary. The subdomain is not.
- Both apps share one description of a program, a testimonial, an application, a registration, a message, and site settings.
- Admin sign-in is Supabase email and password. Invited staff land on a set-password page to choose theirs. Public sign-up is disabled. The super admin account is created in the Supabase dashboard. Further staff are invited from the admin.
- Dates and "is this over" use the `Africa/Accra` timezone.
- The interface is English. The timer keeps the prototype's Arabic verse, Al-Muzzammil 73:4, and its translation line.
- Academy applications promise a human reply within 3 working days. Contact messages promise a human reply within 2 working days. The automated note repeats the promise that was on the form. It does not replace the reply.
- Some prototype photographs require a CC BY-SA 4.0 credit (`assets/credits.json` on `prototype`). Those credits appear in the public footer. Do not remix those images into a new asset.

## What was decided, and by whom

The client side (confirmed in conversation):

- Build the real site in Vue, not by extending the prototype runtime.
- Supabase is the backend.
- Staff update programs, testimonials, and the other non-static content, and they see submitted applications.
- The admin lives on a subdomain and requires auth.
- `main` starts empty of the prototype. Work after that is on feature branches.
- The prototype's picture of visitors, the two paths, and the three inboxes is right.
- The four product additions below are in: editable programs with real dates, a new/handled queue, email both ways, and saving "I'm interested" into the queue.
- Left out of the first version: applicant accounts, payments, in-site classes, and admin editing of About or the four levels.
- The super admin is created in Supabase, then invites other staff from a screen in the admin.
- A program that is over still opens from its link. That page does not take a new application, registration, or "I'm interested." The button says registration has ended. Signups continue only if staff set a later end date or clear the date.
- "Notify me" only saves a registration and shows the on-screen confirmation. It does not open WhatsApp. WhatsApp stays on "I'm interested."

Calls made in this design, not by the client. Check these while reading:

- Nuxt for the public site, so a shared program link has a title, date, and image. Vite for the admin.
- One repository, two apps, one shared package. pnpm workspaces.
- TypeScript in both apps and the shared package.
- Invited people are staff, not more super admins. The app has no control to promote someone. Another super admin, if one is ever needed, is set in the Supabase dashboard.
- The super admin can remove an invited person from the same staff screen. They cannot remove their own account there.
- Invite mail is sent by Supabase Auth, so inviting works before Resend is configured. Submission notices stay on Resend.
- Transactional email through Resend, called from a Supabase Edge Function. The queue works with no API key. Email sends only when `RESEND_API_KEY` and a from-address are set.
- Vercel: two projects from this repo, one per app. Domains are attached when the client has them.
- Optional program fields the public page already shows (longer about, highlights, speaker bio, extra detail rows) are editable, not only the fields named in conversation.
- The Connect page lists community and challenge programs. The prototype computed that list and never rendered it.
- The community join QR code is drawn in the browser. The link is not sent to a third-party QR service.
- No captcha in the first version.
- Phone in settings may be empty. Email and the WhatsApp number used for interest links are required before those buttons show.
- A program slug can be edited. Old slugs do not redirect.
- Submission status can be moved back from handled to new. Staff can delete a submission.
- Testimonials can be edited, not only added and removed. The public card shows quote and name. Session is stored for the admin only.

## Public site

Port the prototype pages. Copy and section order come from `index.html` on `prototype`. Behavior below wins where the prototype only stored data in the browser.

### Routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/about` | About |
| `/connect` | Connect |
| `/academy` | Academy |
| `/programs/:slug` | Program |
| `/contact` | Contact |

There is no public admin route.

### Home

- Photo hero, headline and intro from settings, two actions: Apply to Recitte Academy, and Join Recitte Community.
- Five-minute timer. 300 seconds, pause, resume, and a done state ("Done, barakallahu feek"). Restart after done. Not stored.
- Statement and link to About.
- Two path cards: Connect and Academy, with the prototype's actions.
- "What's happening now": up to three programs that are featured, not past, and not closed. If more than three qualify, show the three with the soonest `starts_on`. Programs with no `starts_on` come after dated ones. If none qualify, omit the section.
- Testimonials marquee when at least one testimonial exists. Omit the section when there are none.
- Closing Academy band.

### About, Connect, Academy

- About: hero, vision, mission, "We remove the barriers", values, approach. All static copy.
- Connect: hero and join action, offers, activities (static), then cards for programs of type `community` or `challenge` that are not past.
- Academy: hero and apply action, the four levels (static), then cards for programs of type `workshop`, `seminar`, `course`, or `event` that are not past, then the "Ready to begin?" band.
- Card order on Connect and Academy: soonest `starts_on` first, undated programs after dated ones.

### Program page

- Hero image by program type, using the prototype's type-to-image map and alt text. Back link goes to Connect for `community` and `challenge`, and to Academy otherwise.
- Title, short description, type label, status label, and the call to action.
- About text, second image, highlights when present ("What you'll learn" for `course` and `workshop`, otherwise "What to expect"), speaker block when a speaker name is set. Photo when present, otherwise initials. Role label is "Teacher" for `course` and `workshop`, otherwise "Speaker".
- Details sidebar from the structured fields that are filled in, in this order: Date, Time, Duration, Format, then any extra rows. Date is formatted from `starts_on` as `Sat 14 Nov 2026` in `Africa/Accra`. When `ends_on` is set, Date reads as the range.
- Same call to action, and Share. Share copies the canonical program URL and confirms on screen.
- "Part of Recitte Connect" or "Part of Recitte Academy", with the prototype's text and links.
- "You might also like": up to three other programs that are not past and not closed, preferring the same type.

### Past and status

A program is past when `ends_on`, or `starts_on` if there is no `ends_on`, is before today in `Africa/Accra`. A program with no `starts_on` is never past.

Past programs stay on their URL so an old flyer is not a dead page. They drop off Home, Connect, Academy, related programs, and the application dropdown. The page shows "Registration has ended" and does not open a form, save a registration, save an interest, or open WhatsApp. The database rejects an application or registration for a past program. Staff who want signups to continue set a later `ends_on` or clear `starts_on`.

`status` is separate and set by staff. It applies only while the program is not past:

| Status | Who sees it in listings | Call to action |
| --- | --- | --- |
| `open` | Listed until it is past | The type's action |
| `soon` | Listed until it is past | "Notify me" |
| `closed` | Hidden from Home. Still listed on Connect or Academy until past | "Registration closed", and a short on-screen note. No submit. |

### Call to action by type

| Type | When `open` and not past | What happens |
| --- | --- | --- |
| `workshop` | I'm interested | Save a registration with kind `interest`, then open WhatsApp |
| `seminar` | I'm interested | Same as workshop |
| `course` | Apply now | Open the Academy application with this program selected |
| `event` | Register to attend | Registration dialog, kind `register` |
| `challenge` | Register to attend | Registration dialog, kind `register` |
| `community` | Join on WhatsApp | Open the community join dialog |

When `soon` and not past, every type except community uses "Notify me". That opens the registration dialog, saves kind `notify`, and shows the on-screen confirmation. It does not open WhatsApp. Community stays the join dialog.

WhatsApp interest text, when a date exists: `Assalamu alaikum, I am interested in the {title} ({formatted date}). Please share how I can attend.` With no date, omit the parenthetical. The number is settings `whatsapp`, digits only, via `https://wa.me/`.

If saving the interest fails, keep the person on the page with an error, and still offer a control that opens WhatsApp. Do not pretend the interest was stored.

### Academy application

Opened as a dialog from Apply actions. Fields:

| Field | Rule |
| --- | --- |
| Full name | Required, trimmed |
| Email | Required, must contain a name, an `@`, and a dot in the domain |
| Phone / WhatsApp | Required, at least 7 digits |
| Country | Required, trimmed |
| Age | Optional. If present, an integer from 5 to 100 |
| Program | Required. Options are titles of `workshop` and `course` programs that are not closed and not past, plus `Not sure, please advise` |
| Current Qur'an recitation level | Required. One of: `Beginner, cannot yet read Arabic`; `Can read slowly with mistakes`; `Read fluently, learning Tajweed`; `Advanced, seeking ijazah` |
| Previous Tajweed experience | Optional. One of: `None`; `Some informal learning`; `Formal Tajweed study` |
| Additional information | Optional |

Submit stores the application with status `new`. The dialog then shows the prototype's thank-you, using the first name, the program title, and the email they entered. That thank-you does not claim an email was sent. "Submit another application" clears it.

### Registration dialog

Name and email use the same rules as the application. Phone is optional. Kinds are `register`, `notify`, and `interest`. Success copy: a saved place for `register` and `interest`; a promise to write when registration opens for `notify`. The notify success does not open WhatsApp.

### Community join dialog

Explains that the visitor is about to leave for WhatsApp. On a wide screen, show a QR code generated in the browser for `community_link`. Continue opens that link in a new tab. If `community_link` is empty, hide every Join control.

### Contact

Port the prototype form. Subject is one of `General`, `Recitte Academy`, `Community`, `Partnership`, and may be empty. Name and email are required. Phone is optional. Message is required, from 10 to 1000 characters. The placeholder follows the subject, as in the prototype. Success copy is the prototype's "JazakAllahu khayran" block. It does not claim an email was sent.

Email, phone, and WhatsApp rows use settings. Hide a row when that value is empty. WhatsApp uses `https://wa.me/` and the digits of `whatsapp`. Active social links only.

### Header, footer, empty states

- Header: logo to Home, links Home, About, Connect, Academy, and Contact us. The mobile menu matches the prototype.
- Footer: explore links, join, apply, contact, active social links, copyright line for the current year, and the required photo credits.
- Join and Apply controls hide or stay, per the rules above, everywhere they appear, including the footer.

## Admin

Separate Vite app. Every screen requires a signed-in staff user. Logged-out visitors see a magic-link form and nothing else. No public sign-up, no password field. An email that is not already staff gets a clear note to ask the super admin for an invite, and no account is created.

Sections, in this order: Overview, Programs, Applications, Registrations, Messages, Testimonials, Content & links. Staff is last, and only the super admin sees it.

### Staff

The super admin enters an email address and sends an invite. Supabase Auth emails that person a link to the admin. Accepting the invite creates their sign-in. Their role is staff. They can then use every section except Staff.

The screen lists current staff. The super admin can remove an invited person. Removal deletes their access, including an invite that has not been accepted yet. The super admin cannot remove their own row. There is no promote control.

### Overview

Counts are the number still `new`, for applications, registrations, and messages, plus how many programs are `open` and not past. Each count opens its section. Recent activity lists the latest submissions across the three inboxes, newest first, up to eight, with kind, a one-line description, and date.

### Programs

List every program, including past and closed ones. From the list, staff can change status (`open` → `soon` → `closed` → `open`), toggle featured, replace the speaker photo, and remove the program. Removing asks for confirmation.

Add and edit use one form:

| Field | Rule |
| --- | --- |
| Type | Required. `workshop`, `seminar`, `course`, `community`, `challenge`, `event` |
| Title | Required |
| Slug | Required, unique, lowercase, hyphenated. Suggested from the title until the staff member edits it. Editing the title later does not change the slug |
| Description | Required. The short hero text |
| About | Optional. Longer body. If empty, the page uses the description |
| Highlights | Optional. One item per line |
| Starts on | Optional date |
| Ends on | Optional date, on or after starts on |
| Time | Optional text, such as `7:00 PM GMT` |
| Duration | Optional text, such as `4 weeks · 2×/week` |
| Format / location | Optional text |
| Extra details | Optional rows of label and value, for lines such as Entry or Level |
| Speaker / teacher | Optional |
| Speaker bio | Optional |
| Speaker photo | Optional image, stored in Supabase Storage, shown publicly |
| Status | `open`, `soon`, or `closed` |
| Featured | Boolean. New programs are not featured |

### Inboxes

Applications, registrations, and messages. Each row shows the fields the person submitted, the date, and the status. Staff can mark handled, mark new again, and delete. Delete asks for confirmation. There is no reply composer in the admin. Replies happen by email or WhatsApp outside the site.

### Testimonials

Quote (at least 10 characters) and name are required. Session is optional and is not shown on the public card. Add, edit, remove. No sample rows.

### Content and links

- Homepage headline and intro.
- Email. Required. This is where submission notices go.
- Phone. Optional.
- WhatsApp number. Required for interest and contact WhatsApp actions.
- Community join link. Optional. Empty hides Join.
- Seven platforms, fixed: WhatsApp, Instagram, Facebook, TikTok, YouTube, X, Telegram. Each has a URL and active or hidden. Only active platforms with a non-empty URL are shown publicly.

There is no "reset data" control.

## Data and access

Tables: `programs`, `testimonials`, `settings` (one row), `social_links`, `applications`, `registrations`, `contacts`, `staff`.

`staff` has the auth user id, the email, and a role of `super_admin` or `staff`. `registrations.kind` is `register`, `notify`, or `interest`. `applications`, `registrations`, and `contacts` have `status` of `new` or `handled`.

The super admin row is not seeded with a personal email. Whoever deploys creates that user in the Supabase dashboard and sets the role to `super_admin`. Invites go through an Edge Function. The function checks that the caller is a super admin, then uses the service role to invite the auth user and insert a `staff` row with role `staff`. The browser never receives the service role key. A staff member calling that function is rejected.

Anonymous visitors:

- May read programs, testimonials, the settings row, and social links.
- May insert an application, a registration, or a contact, and only with `status = new`.
- May not read, update, or delete those three tables.
- May not write programs, testimonials, settings, or social links.

Signed-in staff, including the super admin:

- May read and write all of the content and inbox tables above, including status changes and deletes of submissions.
- May not invite, list, or remove staff unless their role is `super_admin`.

Speaker photos live in a public Storage bucket. Anonymous visitors may read objects. Only staff may upload or replace them. The database stores the public URL.

Validate the field rules above again in the database, not only in the browser. An insert that breaks a rule fails, and the form shows that it was not received.

## Email

An Edge Function sends mail after a successful insert. It does not run inside the visitor's request as a condition of success.

- To the staff `settings.email`: which inbox, the person's name, and the program or subject.
- To the address they typed: a short acknowledgement that names what they submitted and repeats the reply window from the form they used (3 working days for an application, 2 for a contact). Registrations confirm the place or the notify request and do not invent a day count.

If Resend is not configured, or a send fails, the row stays. The failure is logged. The visitor's on-screen success stays the same, and it never says the message was emailed.

## Repository and delivery

```
apps/web/                 Nuxt public site
apps/admin/               Vite admin
packages/shared/          types and pure helpers (slug, past-date, call to action)
supabase/migrations/      schema and RLS
supabase/functions/       notification email
docs/superpowers/specs/   this document
```

`main` is created with no files from `prototype`. This design is the first commit. Feature branches come off `main`. The prototype branch is only a source for copy, layout, and image files. Do not merge it.

Local development uses the Supabase CLI and the local stack. Production uses one Supabase project and two Vercel projects. Environment variables hold the Supabase URL, the anon key, and, on the server only, the service role and Resend secrets. The service role key is never shipped to either browser app.

Seed `settings` with the headline and intro from the prototype, email `salman@recitte.org`, and WhatsApp `+233 54 063 4141`. Leave phone, community link, and social URLs empty. Social rows exist and start hidden. Seed no programs and no testimonials.

## Left to the builder

- Nuxt and Vite versions current at implementation time, component file split, and Tailwind setup.
- The exact SQL types, indexes, and policy expressions, as long as the access rules above hold.
- How magic-link redirects are configured between the admin origin and Supabase Auth.
- The Resend from-address once the client has a domain that can send mail. Until then, email stays off and the queue still works.
- Vercel project names and the real public and admin hostnames, once the client has them.
- Test layout. The behaviors a wrong guess would break are the past-date rule, the call-to-action table, form validation, the anonymous versus staff access split, and a staff member being rejected from the invite function. Those need automated checks.
