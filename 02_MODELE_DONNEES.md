# 02 — Modèle de données

Vue conceptuelle des entités. Le schéma Prisma prêt à l'emploi est dans `prisma/schema.prisma`.

## Entités principales

### Membre (`Member`)
Personne du réseau (salarié, mandataire, franchisé, affilié).
- identité : civilité, prénom, nom, email pro, téléphone, photo
- contrat : `ContractType`, dates d'arrivée / de départ
- fonction : intitulé + sous-libellé
- rattachement : `agencyId`, `network` (`NetworkType`)
- statut : `MemberStatus` (ACTIF / INACTIF)
- liens : `sharePointUrl`, `adObjectId` (id Azure AD)
- relations : `oriasRegistration` (1-1), `trainings` (1-N), `computers` (1-N attribués),
  `onboarding` (1-1), `directedAgencies` (N-N via `AgencyDirector`)

### Agence (`Agency`)
- nom, `type` (`AgencyType`: FRANCHISE / FILIALE), `status`
- `legalName` (raison sociale), `legalForm` (SAS, SARL…)
- adresse, `oriasNumber`, RC Pro (assureur, échéance), garantie financière (montant, échéance)
- `sharePointUrl`
- relations : `members` (1-N), `directors` (N-N), `redevanceExcluded` (bool, pour « sans ICC Dev. »)

### Ordinateur (`Computer`)
- `name`, `model`, `serialNumber`
- `registrationDate`, `lastSyncDate`, `diskFreePct`
- `licenseTier` (`LicenseTier`: SILVER / GOLD) → base de la redevance
- `source` (origine de la donnée : agent de parc, Intune, manuel)
- `assignedMemberId` (nullable) → utilisateur
- statut calculé (ACTIF / À_RENOUVELER / EXPIRÉ) à partir de l'âge (>34 / >36 mois)

### Immatriculation ORIAS (`OriasRegistration`)
- `memberId` (1-1), `oriasNumber`
- `categories` : liste de `OriasCategory` (COBSP, MOBSP, MIOBSP, COA, MIAS, CIF, IFP…)
- `registrationDate`, `renewalDate` (annuel), `status` (`ComplianceStatus`)
- RC Pro : assureur, n° police, échéance
- garantie financière : montant, échéance
- justificatifs : capacité pro, honorabilité (B3) — booléens + dates

### Formation (`Training`)
- `memberId`, `year`
- `requiredHours` (15 DDA / 7 DCI), `completedHours`
- relation `sessions` (1-N) : date, intitulé, heures, organisme, certificat (url)

### Processus d'onboarding (`OnboardingProcess`)
- `memberId` (1-1), `status` (`OnboardingStatus`), `progress` (0-100), `assignedToId`
- relation `steps` (1-N) : libellé, ordre, `OnboardingStepStatus`, date de réalisation, réalisé par
- champs dérivés : dernière étape, prochaine étape

### Redevance (`Redevance`) — paramétrage + lignes calculées
- paramètres : prix unitaire Silver (HT), prix unitaire Gold (HT), taux de TVA
- les **lignes par agence** sont calculées (nb Silver/Gold issus des postes/licences),
  pas forcément stockées : possibilité de vue/agrégat. Stocker au minimum les **paramètres**
  (`Setting`) et le niveau de licence sur `Computer`/`Member`.

### Utilisateur applicatif (`User`) & rôles
- compte de connexion (lié à Azure AD), `role` (`Role`), périmètre d'agence (`scopedAgencyId` nullable)
- distinct de `Member` (un membre n'a pas forcément de compte applicatif).

### Journal d'audit (`AuditLog`)
- `userId`, `action` (CREATE/UPDATE/DELETE/VIEW), `entity`, `entityId`, `diff` (json), `createdAt`, `ip`

### Paramètres (`Setting`)
- clés/valeurs typées : prix redevance, TVA, étapes d'onboarding par défaut, agences exclues du calcul…

## Énumérations

- `NetworkType` : FRANCHISE, FILIALE, AFFILIE
- `AgencyType` : FRANCHISE, FILIALE
- `ContractType` : CDI, CDD, MANDAT, FRANCHISE
- `MemberStatus` : ACTIF, INACTIF
- `LicenseTier` : SILVER, GOLD
- `ComputerStatus` (dérivé) : ACTIF, A_RENOUVELER, EXPIRE
- `OriasCategory` : COBSP, MOBSP, MIOBSP, COA, MIAS, MIA, CIF, IFP
- `ComplianceStatus` : A_JOUR, A_RENOUVELER, EXPIRE
- `OnboardingStatus` : AUCUN, EN_COURS, TERMINE
- `OnboardingStepStatus` : A_FAIRE, EN_COURS, FAIT
- `Role` : ADMIN, RH, IT, DIRECTEUR_AGENCE, LECTURE

## Règles de calcul

- **Âge d'un poste** = mois écoulés depuis `registrationDate`. À_RENOUVELER si > 34, EXPIRÉ si > 36.
- **Redevance agence** = Σ (Silver × prixSilverHT) + (Gold × prixGoldHT) ; TTC = HT × (1 + TVA).
  Moyenne/personne = total agence / (nb Silver + nb Gold). Exclure les agences `redevanceExcluded`.
- **Statut ORIAS** = EXPIRE si `renewalDate` passée ; A_RENOUVELER si < 60 j ; sinon A_JOUR.
  Idem pour RC Pro et garantie financière (l'état le plus défavorable l'emporte).
- **KPI Employés** : Actifs/Inactifs par `status` ; Franchisés/Affiliés par `network`/type d'agence.
- **Recrutements (dashboard)** : regroupement des `arrivalDate` par mois sur 6 mois glissants.

## Jeu de données de démo (seed)

Reprendre les valeurs des captures pour un seed réaliste :
- Agences : Agen & Miramont-de-Guyenne, Albi, Bordeaux, Colomiers, ICC Développement, L'Union,
  Labège, Montauban, Muret, Perpignan, Angoulême, Bayonne, Brive, Clermont-Ferrand, Figeac… (+ directeurs et raisons sociales).
- Membres : Baucal Anthony (Alternant/Dév), Boguene Anaïs, Charpentier Arnaud, D'Orso Axelle (inactif),
  Dai-Pra Anaïs (RAF), Denegre Alexia, Dumas Arnaud, Florian Antoine (inactif), Garrouste Andréa, etc.
- Ordinateurs : HP EliteBook 8x0 G6/G7/G8, ZBook Power G8, avec n° de série, dates 2022-2023, % disque.
- Redevance : Silver 58,33 € HT / Gold 112,50 € HT, TVA 20 % ; compteurs par agence comme en capture.
Le prototype `reference/icc-finance-gestion-rh.jsx` contient déjà ces données : s'en servir comme source du seed.
