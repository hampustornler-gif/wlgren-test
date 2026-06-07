
# Träningsapp för dig och dina kunder

En ljus, minimalistisk webbapp där du som tränare skapar program till dina kunder, och kunderna loggar sina pass, vikt och mått — med tydliga utvecklingsgrafer.

## Roller

- **Tränare (du):** skapar övningar och program, tilldelar program till kunder, ser alla kunders loggar och utveckling.
- **Kund:** ser sina tilldelade program, loggar pass (set/reps/vikt), loggar kroppsvikt och mått, ser sina egna grafer.

## Huvudsidor

1. **Inloggning / registrering** (e-post + lösenord). Första kontot blir tränare; nya konton blir kunder som default.
2. **Tränarvy**
   - Kunder: lista över kunder, klicka in för att se deras pass och utveckling.
   - Program: skapa program med övningar (namn, set, reps, viloperiod, anteckning). Tilldela till en eller flera kunder.
   - Övningsbibliotek.
3. **Kundvy**
   - Idag / Mina program: starta tilldelat pass, logga set för set (vikt + reps), spara.
   - Historik: lista över avklarade pass.
   - Utveckling: grafer per övning (max vikt, total volym över tid) + graf för kroppsvikt och mått.
   - Kroppsmått: logga vikt, midja, bröst, arm, lår, foto (valfritt).
4. **Profil / logga ut.**

## Design

Ljus och minimalistisk (Apple-aktig): vit/off-white bakgrund, mycket whitespace, mjuka kort med subtila skuggor, en lugn accentfärg (mörk indigo), Inter-typografi. Grafer i samma palett. Tokens i `src/styles.css` (oklch).

## Tekniskt

- **Stack:** TanStack Start (befintlig), shadcn/ui, Tailwind, Recharts för grafer.
- **Backend:** Lovable Cloud (aktiveras).
- **Auth:** e-post + lösenord. `_authenticated` skyddar appen.
- **Roller:** `app_role` enum (`trainer`, `client`) + `user_roles`-tabell + `has_role()` security-definer-funktion (RLS-säkert mönster).
- **Tabeller (publika, med GRANTs + RLS):**
  - `profiles` (id, display_name, trainer_id för kund→tränare-koppling)
  - `user_roles` (user_id, role)
  - `exercises` (id, trainer_id, name, notes)
  - `programs` (id, trainer_id, name, description)
  - `program_exercises` (program_id, exercise_id, order, target_sets, target_reps, rest_seconds, note)
  - `program_assignments` (program_id, client_id, assigned_at)
  - `workout_sessions` (id, client_id, program_id, started_at, completed_at, notes)
  - `set_logs` (session_id, exercise_id, set_index, weight_kg, reps, rpe)
  - `body_measurements` (client_id, measured_at, weight_kg, waist_cm, chest_cm, arm_cm, thigh_cm, photo_url)
- **RLS:** kund ser bara sin egen data; tränare ser data för kunder där `profiles.trainer_id = auth.uid()` via `has_role` + join-check.
- **Server functions** (`createServerFn` + `requireSupabaseAuth`) för all data — inga direkta DB-queries i loaders. Query via TanStack Query (`ensureQueryData` + `useSuspenseQuery`).
- **Validering:** zod på alla server-fn inputs (vikt 0–999, reps 0–999, strängar trim+max).

## Vad jag bygger i denna iteration (v1)

Allt ovan i en första körbar version: auth, roller, tränare skapar övningar + program, tilldelar till kund, kund loggar pass och mått, grafer för utveckling. Inga aviseringar, betalningar eller mobilappar i v1.
