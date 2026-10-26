# IBDP2 Agenda

A shared class planner: homework, tests, deadlines, events and reminders, laid out as a notebook.

- **Views:** a week spread you can page through, a month calendar, and a "coming up" list. Search covers everything.
- **Up next:** sticky notes count down to the next tests, deadlines, events and important entries.
- **Entries:** each one can have a time, a place, an end date for multi-day things like trips, notes with links, HL/SL only, and an "important" flag.
- **Calendar export:** tap an entry for its details and **Add to Google Calendar**, or download it for any calendar app (.ics).
- **Personal:** "my subjects" (with HL/SL) and the theme are saved only on each person's own device.
- **Who did what:** every entry shows who added or last edited it, its details list every version with "bring back this version", and entries changed since your last visit say "new" or "edited".
- **Accountability:** anyone with the link can **read** it. To **write**, people enter their name and the class code once. Their name shows on what they add, every change is listed under **History of changes**, and deleted entries can be brought back.
- **Phones:** on a phone, **Share → Add to Home Screen** makes it open like an app.

Without a database the site runs in **preview mode**: everything works, but changes stay on that device.

## Switching on the shared database (about 10 minutes, free)

1. Go to <https://supabase.com>, sign in (GitHub works) and click **New project**. Any name and region works.
2. Open **SQL Editor** → **New query**, paste all of `supabase-setup.sql` and click **Run**.
3. In a new query, set the class code. Type it in the editor itself, never in a file here:

   ```sql
   select private.set_class_code('your-class-code-here');
   ```

   Use at least 6 characters, ideally three random words. To change it later, run the line again. Everyone then gets asked for the new code.
4. In **Project Settings → API Keys**, copy the **publishable** key (`sb_publishable_...`). In **Project Settings → Data API**, copy the **Project URL**.
5. Put both into `config.js` and publish the change. Both values are safe to be public. **Never** put the `secret` key or the database password here.

## Good to know

- Supabase pauses free projects after a week with no visits. If that happens over a holiday, open the dashboard and click **Restore**.
- If someone posts nonsense, **History of changes** shows their name. Delete it, and change the class code if needed.
- `supabase-setup.sql` is safe to run again after updates. It keeps everything already on the agenda.

## Files

| File | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The website |
| `config.js` | Supabase URL and publishable key |
| `supabase-setup.sql` | Tables, protection and starting data |
| `manifest.webmanifest`, `icon*` | Home-screen app name and icon |
