# gestionauto.ma

Application web pour gérer une agence de location de voitures au Maroc : véhicules, clients, contrats, photos de check-out / check-in, caution (الكوسيون), déclaration préalable imprimable, et **assistance IA avec la clé de chaque utilisateur**.

## Lancer en local

Prérequis : **Node.js 22.13 ou plus** (base SQLite via le module intégré `node:sqlite`).

```bash
npm install
npm run dev      # http://localhost:3000
```

Build de production :

```bash
npm run build
npm start
```

## Variables d'environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `ENCRYPTION_KEY` | **Oui en production** | 32 octets en base64 (`openssl rand -base64 32`). Chiffre les clés IA des utilisateurs. Si vous la perdez, les clés enregistrées deviennent illisibles et chaque utilisateur doit les ressaisir. |
| `DATA_DIR` | Non | Dossier des données (base, photos). Par défaut `./data`. |
| `DATABASE_PATH` | Non | Chemin direct vers le fichier SQLite. |
| `COOKIE_SECURE` | Non | Mettre `false` seulement pour tester en HTTP local. En production, le cookie de session est `Secure` (HTTPS obligatoire). |

En développement, si `ENCRYPTION_KEY` n'est pas définie, une clé est générée dans `data/.app-secret` (ignoré par git).

## Comptes et sécurité

- Inscription et connexion par email et mot de passe (scrypt). Le cookie de session est `httpOnly`, valable 30 jours.
- Chaque utilisateur ne voit que ses véhicules, clients et contrats. Les photos passent par une route protégée (`/api/photos/[id]`) et ne sont pas publiques.
- Les clés IA sont chiffrées en AES-256-GCM et ne sont jamais renvoyées au navigateur. La page Paramètres n'affiche que les 4 derniers caractères.

## Intelligence artificielle

Chaque utilisateur choisit son fournisseur et colle sa propre clé dans **Paramètres** :

- **Google Gemini** (défaut : `gemini-2.5-flash`)
- **OpenAI** (défaut : `gpt-4o-mini`)
- **Anthropic Claude** (défaut : `claude-haiku-5-5`)

Le nom du modèle est modifiable, car les noms de modèles changent souvent. Le bouton **Tester la connexion** envoie un appel minimal pour vérifier la clé.

Fonction actuelle : **comparer les photos du départ et du retour** sur un contrat ouvert, pour proposer une liste de dommages nouveaux. C'est une suggestion : l'agent doit la vérifier avant de la copier dans les notes.

**Important :** les photos sont envoyées au fournisseur choisi par l'utilisateur, et les frais d'utilisation sont facturés sur son propre compte. Prévenez vos clients dans votre politique de confidentialité (loi 09-08).

## Structure

- `app/` : pages (App Router) et actions serveur (`app/actions.ts`, `app/auth-actions.ts`)
- `lib/auth.ts` : comptes et sessions · `lib/crypto.ts` : chiffrement des clés
- `lib/ai/providers.ts` : appels Gemini / OpenAI / Claude · `lib/ai/config.ts` : configuration par utilisateur
- `lib/db.ts` : schéma SQLite
- `components/` : formulaires avec messages d'erreur inline, bouton d'analyse IA

## À faire avant la mise en production

- Limiter les tentatives de connexion (aujourd'hui il n'y a pas de protection contre le brute force).
- Réinitialisation du mot de passe, et confirmation par email.
- Sauvegarde de la base, des photos, et de la clé `ENCRYPTION_KEY`.
- Journal des appels IA (coût, date), et limite de taille des photos envoyées.
- Modules non inclus : intermédiaires et commissions, rappels, factures, GPS, rapports.
