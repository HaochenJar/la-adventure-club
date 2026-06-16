# LA Adventure Club 🌊🥾

A simple, fast, **static website** for the LA Adventure Club — outdoor adventures around Los Angeles.
Built as plain HTML/CSS/JS so it can be hosted **free on GitHub Pages** with no build step and no server.

**Design:** bold editorial / "exaggerated minimalism" — oversized Archivo display type, warm-paper & near-black high contrast with a single adventure-orange accent, JetBrains Mono "field-notes" labels (coordinates, dates, indices), and SVG icons (no emoji).

It has the three sections you asked for, plus a **member portal**:

1. **Past Adventures** — highlight reels + photo galleries from each trip (Catalina, Dawn Mine hike, Naples Island)
2. **Join a Trip** — upcoming events that lead into the member portal
3. **About** — the club and the captain (you!)
4. **Member portal** (`members.html`) — **Sign in with Google → short profile questionnaire (name / age / sex / emergency contact) → register for upcoming events**, backed by a real database (Supabase/Postgres). See **[SETUP-database.md](SETUP-database.md)** to switch it on.

---

## 📁 What's in here

```
la-adventure-club/
├── index.html          ← landing page (one page, anchor-linked sections)
├── members.html        ← member portal: Google sign-in + profile + event registration
├── styles.css          ← all styling (landing + portal)
├── script.js           ← landing-page nav, gallery lightbox, scroll reveal
├── members.js          ← portal logic (Supabase auth, profile, registration)
├── config.js           ← paste your Supabase URL + anon key here
├── schema.sql          ← run this once in Supabase to create the database
├── SETUP-database.md   ← step-by-step: Supabase + Google sign-in
├── README.md           ← this file
├── .nojekyll           ← tells GitHub Pages to serve files as-is
└── assets/
    ├── favicon.svg
    ├── img/            ← hero + gallery photos (pulled from the trip footage)
    └── video/          ← web-compressed highlight reels (~30–36 MB each)
```

---

## 🚀 Publish it on GitHub Pages (free)

### Option A — drag & drop (no command line)
1. Go to <https://github.com/new> and create a **public** repo, e.g. `la-adventure-club`.
2. On the repo page click **Add file → Upload files**, then drag the **contents of this folder** in (the files, not the folder itself). Commit.
3. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main` / `/ (root)`**, Save.
4. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/la-adventure-club/`.

> The big video files are ~30–36 MB each (under GitHub's 100 MB limit), so plain upload works fine.

### Option B — git command line
```bash
cd la-adventure-club
git init -b main
git add .
git commit -m "LA Adventure Club website"
git remote add origin https://github.com/<your-username>/la-adventure-club.git
git push -u origin main
```
Then enable Pages in **Settings → Pages** as in step 3 above.

---

## ✉️ How registration works (member portal)

The landing-page "Register" buttons lead to **`members.html`**, the member portal:

1. **Sign in with Google** (Supabase Auth — no passwords for you to manage).
2. **First time only:** a short profile questionnaire — name, age, sex, phone, and
   emergency contact — saved to the `profiles` table.
3. **Register for events:** the portal lists upcoming trips from the `events` table
   and lets each member book a spot (with guests), see how many spots are left, get
   waitlisted automatically when a trip is full, and cancel.

It's powered by **Supabase** (a free Postgres database + auth). Until you connect it
(see **[SETUP-database.md](SETUP-database.md)**), the portal shows a friendly
"setup needed" message — the rest of the site works regardless.

**The database** (`schema.sql`) has three tables — `profiles`, `events`,
`registrations` — with Row-Level Security so members only ever see their own data,
plus helper functions that enforce event capacity. You manage events and view
sign-ups from the Supabase dashboard.

---

## ✏️ Customizing (all easy text edits in `index.html`)

| You want to… | Do this |
|---|---|
| **Change the captain's name/bio** | Edit the `.captain__card` block in `index.html` (look for "Jared"). Change the `JC` initials in `.captain__avatar` too. |
| **Add a real photo of yourself** | Drop a square photo in `assets/img/` and replace the `<div class="captain__avatar">JC</div>` with `<img src="assets/img/captain.jpg" alt="Captain">`. |
| **Add / edit an upcoming trip** | Add a row to the `events` table in Supabase (it shows up in the portal automatically). Optionally mirror it as a static preview card on the landing page by copying an `<article class="trip" …>` block — keep its `members.html?event=<slug>` link matching the event's `slug`. |
| **Add a new past adventure** | Copy an `<article class="event">` block, drop a new video in `assets/video/` and poster in `assets/img/`. |
| **Change colors** | Edit the CSS variables at the top of `styles.css` (`--accent` = adventure orange, `--ink` = near-black, `--paper` = warm background, `--ocean` = secondary). |
| **Change fonts** | Swap the Google Fonts `<link>` in `index.html` and the `--f-display` / `--f-body` / `--f-mono` vars in `styles.css`. |
| **Change contact email** | Search `jarrr23d@gmail.com` in `index.html` and `members.html` (footers). |
| **Change the profile questions** | Edit the `#profileForm` fields in `members.html` and the matching columns in `schema.sql` (`profiles` table). |

---

## 🎵 Music credits

The highlight reels use these tracks (Creative Commons — attribution kept in the site footer as required):

- *Gymnopédie No. 1* — Kevin MacLeod — CC BY 4.0
- *Tropical Dream* — Lele Rambelli — CC BY 3.0
- *Cozy Corner Bossa* — Pixabay/CC0 (no attribution required)

---

## 🔧 Preview locally

Any static file server works. For example:
```bash
cd la-adventure-club
python3 -m http.server 8765
# open http://localhost:8765
```

Made for the love of getting outside. 🏔️
