## Mål
Du kan inte logga in. Troliga orsaker: e-post inte bekräftad, fel lösenord, eller glömt lösenord. Jag lägger till en återställningsflöde och bättre felmeddelanden på svenska.

## Ändringar

1. **`src/routes/auth.tsx`** – lägg till tre lägen: `login`, `signup`, `forgot`.
   - "Glömt lösenord?"-länk under login-knappen → växlar till `forgot`-läget (bara e-postfält + knapp "Skicka återställningslänk").
   - Anropar `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${window.location.origin}/reset-password })`.
   - Översätt vanliga Supabase-felmeddelanden till svenska (invalid credentials, email not confirmed, rate limit, weak/leaked password).
   - "Skicka bekräftelsemail igen"-knapp visas när felet är "Email not confirmed" (anropar `supabase.auth.resend`).

2. **`src/routes/reset-password.tsx`** (ny, publik route) – formulär för nytt lösenord.
   - Lyssnar på `onAuthStateChange` för `PASSWORD_RECOVERY`-event.
   - Anropar `supabase.auth.updateUser({ password })` och redirectar till `/`.
   - Sätter `errorComponent` + `notFoundComponent`.

## Inte med i denna ändring
- Ingen ändring av e-postmallar eller HIBP-inställning.
- Ingen ändring av auth-konfig på serversidan.

Vill du köra på detta?