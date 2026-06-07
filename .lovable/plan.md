
## Mål
Göra `/trainer/clients` till ett komplett verktyg för tränaren att hitta, bjuda in och hantera sina klienter.

## 1. Sök & filter
- Sökruta (matchar `display_name`, case-insensitive).
- Filterflikar: **Alla / Mina klienter / Otilldelade**.
- Tillstånd sparas i URL via `validateSearch` (`q`, `tab`) så det överlever refresh och delas via länk.

## 2. Mer info i listan
För varje klient visas:
- Namn
- Senaste pass (datum eller "Inga pass")
- Antal tilldelade program
- Senaste vikt från `body_measurements` (om finns)

Implementeras genom att utöka `listClients` server-funktionen att aggregera:
- `workout_sessions` (senaste `started_at` per klient)
- `program_assignments` (antal per klient)
- `body_measurements` (senaste `weight_kg` per klient)

## 3. Hantera klient (frikoppla)
- Ny knapp "Ta bort" på varje "Mina klienter"-rad → bekräftelsedialog → kallar ny serverfn `releaseClient({ clientId })` som sätter `profiles.trainer_id = null` (kontroll: nuvarande tränare måste äga klienten).
- Klienten finns kvar i systemet men hamnar bland "Otilldelade".

## 4. Bjuda in klient via e-post
- "Bjud in"-knapp överst → dialog med fält **E-post** + **Namn** (valfritt).
- Skapar en post i ny tabell `client_invites` (token, trainer_id, email, expires_at, accepted_at).
- Skickar ett mejl via Lovable Emails med länk `/invite/$token`.
- Inbjudningssidan visar tränarens namn, ber besökaren registrera sig / logga in, och kopplar automatiskt `profiles.trainer_id` till den tränare som bjudit in.
- Förutsätter att e-postdomän är uppsatt — om inte visar jag setup-dialogen först.

## Tekniska detaljer
- **DB-migration** (ny tabell):
  ```text
  client_invites(id, trainer_id, email, token, name, expires_at, accepted_at, created_at)
  ```
  RLS: tränare ser/skapar sina egna; serviceroll används vid acceptans.
- **Server-funktioner** (`src/lib/app.functions.ts`): utöka `listClients`, ny `releaseClient`, `createClientInvite`, `acceptClientInvite`, `getInvite`.
- **Email-mall**: scaffoldas via `email_domain--scaffold_transactional_email` (klientinbjudan).
- **Ruter**:
  - `/trainer/clients/` – uppgraderad lista (search params för q/tab).
  - `/invite/$token` – publik landningssida.

## Out of scope
- Direktmeddelanden till klient.
- Återanvändbara/permanenta inbjudningslänkar (varje invite är unik och engångs).
