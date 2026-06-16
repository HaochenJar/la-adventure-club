# Member portal setup — Supabase + Google sign-in

This connects the **member portal** (`members.html`) to a real database and
"Sign in with Google". Everything below is a one-time setup. Budget ~20 minutes.

You'll do three things:
**A.** Create a free Supabase project and run the schema.
**B.** Turn on Google sign-in.
**C.** Paste two keys into `config.js`.

> Why you have to do this part yourself: creating the Supabase project and the
> Google OAuth credentials is tied to *your* accounts — I can't create those for
> you. The schema, the app, and these exact steps are all done.

---

## A. Create the database (~5 min)

1. Go to **<https://supabase.com>** → sign in → **New project**.
   - Name it `la-adventure-club`, pick a region near LA (e.g. *West US*), set a
     database password (save it somewhere), and create. Wait ~2 min for it to spin up.
2. In the left sidebar open **SQL Editor → New query**.
3. Open the file **`schema.sql`** from this project, copy **all** of it, paste it
   into the editor, and click **Run**. You should see "Success".
   - This creates the `profiles`, `events`, and `registrations` tables, the
     security rules, the helper functions, and 3 sample events.
4. Open **Project Settings → API** and copy these two values for step C:
   - **Project URL** (e.g. `https://abcdxyz.supabase.co`)
   - **Project API keys → `anon` `public`** (a long string starting with `eyJ…`)

---

## B. Turn on "Sign in with Google" (~10 min)

### B1. Get the Supabase callback URL
In Supabase, go to **Authentication → Sign In / Providers → Google**. Near the top
you'll see a **Callback URL (for OAuth)** that looks like
`https://abcdxyz.supabase.co/auth/v1/callback`. Copy it — you need it in B2.

### B2. Create Google OAuth credentials
1. Go to **<https://console.cloud.google.com>** → create a project (or pick one).
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in app
   name ("LA Adventure Club"), your support email, and save. (You can leave it in
   "Testing" mode while you try it out, then "Publish" when ready for the public.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs → Add URI**: paste the Supabase **Callback URL** from B1.
   - Create. Copy the **Client ID** and **Client secret**.

### B3. Connect Google to Supabase
1. Back in Supabase **Authentication → Providers → Google**: toggle **Enable**,
   paste the **Client ID** and **Client secret**, and **Save**.
2. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: your live site, e.g. `https://<your-username>.github.io/la-adventure-club`
   - **Redirect URLs → Add**: add both your live `members.html` URL and a local one
     for testing, e.g.
     - `https://<your-username>.github.io/la-adventure-club/members.html`
     - `http://localhost:8765/members.html`

---

## C. Plug in your keys (~1 min)

Open **`config.js`** and replace the two placeholders with the values from step A4:

```js
window.LAAC_CONFIG = {
  SUPABASE_URL: "https://abcdxyz.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJI...your-anon-key..."
};
```

The `anon` key is **meant to be public** — your data is protected by the
Row-Level Security rules in `schema.sql`, not by hiding the key. Never paste the
`service_role` key into this file.

---

## Try it

1. Serve the folder locally: `python3 -m http.server 8765` then open
   `http://localhost:8765/members.html`.
2. Click **Continue with Google** → pick your account → you'll be asked to fill
   the short profile → then you land on the dashboard and can register for the 3
   sample trips. Re-open the page and you should go straight to the dashboard.
3. Deploy (commit + push to GitHub) so it works on your live site too.

---

## Running the club

- **Add / edit trips:** Supabase → **Table Editor → events** → *Insert row*
  (set a unique `slug`, `title`, `event_date`, `capacity`, etc.). They appear in
  the portal automatically. The 3 cards on the landing page are static previews —
  keep their slugs (`solstice-canyon-hike`, `marina-del-rey-sup`,
  `griffith-night-hike`) matching the `events` table so the "Register" links land
  on the right trip.
- **See who registered:** Supabase → **Table Editor → registrations**, or write a
  query joining `registrations` + `profiles` + `events`. Capacity is enforced
  automatically — once a trip is full, new sign-ups become `waitlist`.
- **Privacy:** members can only ever read/edit their own profile and their own
  registrations. Only you (via the Supabase dashboard) can see everyone's.
