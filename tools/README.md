# Export signups to a local Excel sheet

`export-signups.py` pulls registrations out of Supabase and writes a formatted
local `.xlsx` (one row per signup: name, email, phone, age range, gender,
emergency contact, guests, status, signed-up time).

## One-time setup
1. Get your **service_role key**: Supabase → **Project Settings → API** →
   copy the **`service_role`** (secret) key.
   *(This key bypasses the privacy rules so it can read every signup — keep it secret.)*
2. In this `tools/` folder, copy the template and paste your key:
   ```bash
   cp tools/.env.example tools/.env
   # then open tools/.env and replace the placeholder with your service_role key
   ```
   `tools/.env` is git-ignored, so the key never gets committed.

## Run it
From the project root:
```bash
python3 tools/export-signups.py              # Juneteenth walk (default)
python3 tools/export-signups.py all          # every event
python3 tools/export-signups.py griffith-night-hike
```
It writes e.g. `juneteenth-point-vicente-signups.xlsx` to the **parent folder**
(outside the public repo, so member data is never published). Want it elsewhere?
```bash
OUT_DIR=~/Desktop python3 tools/export-signups.py
```
Re-run it anytime to refresh the sheet with the latest signups.

## Notes
- The generated spreadsheet contains members' personal info — keep it private
  (it's git-ignored too).
- No code/no setup alternative: in Supabase → SQL Editor, run the roster query
  and click **Download CSV**.
- Needs Python 3 (preinstalled on macOS). It auto-installs `openpyxl` the first
  time; if that's blocked it falls back to writing a `.csv` instead.
