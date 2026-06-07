## Mål

Lägg till en separat **admin**-roll så att du kan ha både flera tränare och en eller flera administratörer i appen. Admin är högsta rollen och kan hantera alla användare och roller.

## Roller efter ändringen

- **admin** — ser och hanterar alla användare, kan tilldela/ta bort rollerna `admin`, `trainer`, `client`. Kan koppla kunder till tränare. Ser allt som tränare ser.
- **trainer** — som idag: skapar övningar/program, hanterar sina egna kunder.
- **client** — som idag: loggar pass och mått.

Första registrerade kontot blir nu **admin** (idag blir det `trainer`). Efterföljande konton blir `client` som default, och admin uppgraderar manuellt till `trainer` eller `admin` vid behov.

## Vad jag bygger

### 1. Databasändringar (migration)

- Lägg till `'admin'` i enum `app_role`.
- Uppdatera triggern `handle_new_user` så att första kontot blir `admin` istället för `trainer`.
- Lägg till RLS-policies så att admin kan:
  - läsa alla `profiles`, `user_roles`, `exercises`, `programs`, `program_assignments`, `program_exercises`, `workout_sessions`, `set_logs`, `body_measurements`
  - sätta/ändra `trainer_id` på valfri profil
  - lägga till och ta bort rader i `user_roles` (idag kan ingen göra det via API)
- Begränsning: en admin kan inte ta bort sin egen sista admin-roll (skydd mot utelåsning).

### 2. Server functions (`src/lib/app.functions.ts`)

Nya, alla skyddade med `requireSupabaseAuth` och en intern `requireAdmin`-check via `has_role`:

- `listAllUsers()` — alla användare med roller och tilldelad tränare.
- `setUserRole({ userId, role, enabled })` — lägg till eller ta bort en roll.
- `assignClientToTrainer({ clientId, trainerId })` — sätt/byt tränare för en kund.

Validering via zod på alla inputs.

### 3. UI

- Ny admin-vy under `src/routes/_authenticated/admin/`:
  - `admin/index.tsx` — översikt.
  - `admin/users.tsx` — tabell med alla användare: namn, e-post-prefix, roller (checkboxar för admin/trainer/client), dropdown för tränarkoppling. Sparar via server fn.
- `app-shell.tsx`: lägg till "Admin"-länk i sidonav/bottennav när inloggad är admin.
- `src/routes/index.tsx`: skicka admin → `/admin`, tränare → `/trainer`, kund → `/app`.

### 4. Bakåtkompatibilitet

Befintligt första konto (du, som är `trainer`) påverkas inte automatiskt. Jag lägger till en engångs-knapp i admin-vyn ("Gör mig till admin") som bara fungerar om det inte finns någon admin än — så du kan promota dig själv första gången.

## Teknisk sammanfattning

- Enum-ändring: `ALTER TYPE public.app_role ADD VALUE 'admin'`.
- `has_role(uid, 'admin')` används i alla nya policies (security-definer, RLS-säkert mönster).
- Inga ändringar i auth-flöde, inga edge functions, ingen Supabase-konfiguration utöver migrationen.
- TanStack Query + `createServerFn` enligt befintligt mönster.

## Utanför scope

- Mejlbjudningar till nya tränare/admins.
- Audit log över rolländringar.
- Granulär per-kund-behörighet mellan flera tränare (kund hör fortfarande till **en** tränare via `profiles.trainer_id`).
