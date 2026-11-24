# gestionauto.ma

Application web pour gérer une agence de location de voitures au Maroc : véhicules, clients, contrats de location, photos de check-out / check-in, suivi de la caution (الكوسيون), et impression du **déclaration préalable de location de voiture sans chauffeur**.

## Lancer en local

Prérequis : **Node.js 22.13 ou plus** (la base de données utilise le module intégré `node:sqlite`, sans installation supplémentaire).

```bash
npm install
npm run dev      # http://localhost:3000
```

Build de production :

```bash
npm run build
npm start
```

La base SQLite est créée automatiquement dans `data/gestionauto.db`. On peut la changer avec la variable `DATABASE_PATH`.

## Structure

- `app/` : pages (Next.js App Router) et actions serveur (`app/actions.ts`)
- `lib/db.ts` : schéma SQLite et connexion
- `components/ActionForm.tsx` : formulaire qui affiche les erreurs sans recharger la page
- `public/uploads/` : photos des véhicules (ignorées par git)

## Fonctionnalités de la première version

- Tableau de bord : nombre de véhicules, contrats ouverts, cautions bloquées, contrats proches du retour
- Véhicules et clients (CIN masqué dans la liste)
- Contrats : vérification de chevauchement de dates pour un même véhicule, référence `BK-1001`, `BK-1002`...
- Photos au départ et au retour, liées au contrat
- Clôture du contrat : exige au moins une photo de retour, enregistre le kilométrage et la caution (remboursée / retenue)
- Déclaration préalable imprimable, pré-remplie avec les données du contrat

## À faire avant la mise en production

- **Authentification et comptes utilisateurs** : aujourd'hui, l'application est ouverte à quiconque connaît l'adresse. Elle contient des données personnelles (CIN, permis), donc c'est la priorité.
- Sauvegarde de la base et des photos.
- Chiffrement des CIN et numéros de permis au repos, et conformité à la loi 09-08.
- Modules non inclus : intermédiaires et commissions, rappels (assurance, visite technique, vignette), factures, GPS, rapports.
