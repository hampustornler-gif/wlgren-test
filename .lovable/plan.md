## Plan: Importera free-exercise-db

Hämtar ~870 övningar från `yuhonas/free-exercise-db` (MIT-licens) och fyller `global_exercises`-tabellen som Övningsbiblioteket redan läser från.

### 1. Databas-migration
Skapa tabellen `public.global_exercises`:

| kolumn | typ |
|---|---|
| id | text PRIMARY KEY (källans slug, t.ex. `Barbell_Squat`) |
| name | text |
| force | text (push/pull/static) |
| level | text (beginner/intermediate/expert) |
| mechanic | text |
| equipment | text |
| category | text |
| primary_muscle | text (första posten i `primaryMuscles`) |
| secondary_muscles | text[] |
| instructions | text (joinad med radbrytning) |
| image_url | text |
| image_url_2 | text |

Behörigheter: `GRANT SELECT TO authenticated, anon` (publik referensdata, ingen användarkoppling). RLS av — det är statisk read-only katalog.

### 2. Dataimport
Hämtar `dist/exercises.json` från GitHub raw, mappar fälten och bygger bild-URL:er som:

```
https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{image_path}
```

Inga bilder hostas hos oss — direkt-länk till GitHub. Insättning sker batchvis (~50/gång) via insert-verktyget.

### 3. Frontend
Inget kodjobb behövs — `src/routes/_authenticated/trainer/exercises/index.tsx` läser redan rätt fält (`primary_muscle`, `level`, `equipment`, `image_url`, `image_url_2`, `instructions`). `(supabase as any)`-casten kan tas bort efter att types regenereras.

### Notering
Licens MIT — fri användning, attribution i README rekommenderas (lägger till en kort kreditrad i Övningsbiblioteket).
