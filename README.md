# LA Adventure Club 🌊🥾

A simple, fast, **static website** for the LA Adventure Club — outdoor adventures around Los Angeles.
Built as plain HTML/CSS/JS so it can be hosted **free on GitHub Pages** with no build step and no server.

It has the three sections you asked for:

1. **Past Adventures** — highlight reels + photo galleries from each trip (Catalina, Dawn Mine hike, Naples Island)
2. **Join a Trip** — upcoming events + a working registration form
3. **About** — the club and the captain (you!)

---

## 📁 What's in here

```
la-adventure-club/
├── index.html          ← the whole site (one page, anchor-linked sections)
├── styles.css          ← all styling
├── script.js           ← nav, gallery lightbox, registration form
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

## ✉️ How the registration form works

The form posts to **[FormSubmit](https://formsubmit.co)** — a free service that emails you each
registration. No backend, no signup, no API key.

**One-time activation:** the *first* time anyone submits the form, FormSubmit sends a confirmation
email to **jarrr23d@gmail.com** with an "Activate" link. Click it once and every future
registration lands straight in your inbox.

- To change the destination email, edit `REGISTRATION_EMAIL` near the top of `script.js`.
- If the form service is ever unreachable, the form automatically falls back to opening the
  visitor's email app with the details pre-filled — so you never miss a sign-up.
- Prefer less spam exposure? Get a hashed endpoint at formsubmit.co and drop it into `script.js`.

Want something else instead? The form is a normal `<form>` — you can swap it for Google Forms,
Netlify Forms, Tally, etc.

---

## ✏️ Customizing (all easy text edits in `index.html`)

| You want to… | Do this |
|---|---|
| **Change the captain's name/bio** | Edit the `.captain__card` block in `index.html` (look for "Jared"). Change the `JC` initials in `.captain__avatar` too. |
| **Add a real photo of yourself** | Drop a square photo in `assets/img/` and replace the `<div class="captain__avatar">JC</div>` with `<img src="assets/img/captain.jpg" alt="Captain">`. |
| **Add / edit an upcoming trip** | Copy one `<article class="trip" …>` block in the *Upcoming Trips* section and change the date/title/details. The registration dropdown updates itself automatically from these cards. |
| **Add a new past adventure** | Copy an `<article class="event">` block, drop a new video in `assets/video/` and poster in `assets/img/`. |
| **Change colors** | Edit the CSS variables at the top of `styles.css` (`--teal`, `--coral`, `--navy`, …). |
| **Change contact email** | Search `jarrr23d@gmail.com` in `index.html` (footer) and `script.js`. |

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
