# 03 — Charte UI

Reproduire le thème de l'outil existant (captures) en version production (Tailwind + shadcn/ui).
Référence vivante : `reference/icc-finance-gestion-rh.jsx`.

## Couleurs (tokens)

À déclarer comme variables CSS / thème Tailwind. Valeurs **approximatives** issues des captures —
à ajuster si la charte officielle ICC Finance est fournie.

| Token | Hex | Usage |
|---|---|---|
| `bg` (fond appli) | `#343C72` | fond principal indigo |
| `sidebar` | `#2C3463` | barre latérale |
| `card` | `#3B4480` | cartes KPI, panneaux, tableaux |
| `card-soft` | `#454E8E` | pastilles, champs, avatars |
| `accent` (orange) | `#EE8526` → `#E2761C` | logo, bandeaux de section, actions, état actif |
| `kpi-orange` | `#EE8526` | 1re carte KPI |
| `kpi-pink` | `#E83E8C` | 2e carte KPI / colonnes Gold |
| `kpi-green` | `#3FB95B` | 3e carte / bandeau onboarding / colonnes Moyenne |
| `kpi-blue` | `#2E9BE6` | 4e carte / colonnes Total |
| `success` | `#46C46A` | badge ACTIF, disque ≥70 % |
| `warning` | `#EF8A2B` | badge INACTIF / À renouveler, disque 35-49 % |
| `danger` | `#E0533F` | EXPIRÉ, disque <35 % |
| `text` | `#FFFFFF` | texte principal |
| `text-soft` | `#AEB4DA` | texte secondaire |
| `text-faint` | `#8A90BD` | libellés discrets, footer |

Barres d'espace disque : vert ≥70, bleu 50-69, orange 35-49, rouge <35.

## Typographie

- Police : sans-serif lisible type **Hanken Grotesk** (ou Inter si déjà en place).
- Logo « GESTION RH » : gras, sur bloc orange arrondi ; au-dessus, « ICC Finance » en petites capitales.
- Titres de section : gras blanc sur bandeau orange (vert pour l'onboarding).
- En-têtes de colonnes : petites capitales, interlettrage léger, gris (`text-soft`).

## Composants clés (mappés shadcn/ui)

- **Carte KPI** : carré d'icône coloré (gauche) + libellé/valeur (droite, alignés) + sous-texte (bas).
  Valeur pouvant être sur 2 lignes (ex. « 137 membres / 15 ICC Dév. », « 7 450 € HT / 8 940 € TTC »).
- **Section** : conteneur arrondi avec bandeau d'en-tête coloré (titre + icône + bouton d'action).
- **Tableau** (`Table` shadcn + TanStack) : en-têtes triables, lignes survolables/cliquables,
  badges de statut, pastilles (chips), barres de progression, actions en fin de ligne.
- **Barre d'outils de tableau** : sélecteur « Nombre de lignes » + filtres `Select` + champ « Recherche ».
- **Badge** : ACTIF (vert) / INACTIF (orange) / EXPIRÉ (rouge), petites capitales.
- **Panneau latéral** (`Sheet`) : fiche membre 360° (onglets RH / Informatique / Formation / ORIAS).
- **Modale** (`Dialog`) : formulaires « Créer un membre » / « Créer une agence ».
- **Tableau redevance** : colonnes regroupées et teintées (Silver orange, Gold rose, Moyenne verte, Total bleu).
- **Graphique** (Recharts) : histogramme des recrutements sur le dashboard.
- **Barre latérale** : menu vertical, item actif surligné, bouton utilisateur + version en pied.

## Principes

- Aspect « tableau de bord d'administration » dense mais lisible, coins arrondis, ombres douces.
- Pas de hex en dur dans les composants : passer par les tokens du thème.
- Responsive : la barre latérale se replie en menu sur mobile ; tableaux scrollables horizontalement.
- Accessibilité : contrastes suffisants, focus visibles, navigation clavier, libellés ARIA.
