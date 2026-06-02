# 01 — Cahier des charges fonctionnel

Application de gestion RH / IT du réseau ICC Finance. Référence visuelle : `reference/icc-finance-gestion-rh.jsx`
et les 5 captures d'écran de l'outil existant.

## Navigation générale

Barre latérale fixe (indigo foncé) avec logo « GESTION RH » (bloc orange), menu, bouton utilisateur
connecté en bas, et pied de page de version. Cinq entrées principales :

1. **Dashboard** — vue d'ensemble
2. **Employés** — membres du réseau
3. **Agences**
4. **Ordinateurs** — parc informatique
5. **Redevance info.** — redevances logicielles

Chaque écran « liste » comporte : 4 cartes KPI en haut, un bandeau de section orange (titre + action),
un sélecteur « Nombre de lignes à afficher », un champ « Recherche », un tableau triable et paginé.

---

## Écran 1 — Dashboard

**4 cartes KPI** (icône colorée + valeurs) :
- **Ressources Humaines** : nb total de membres du réseau + nb membres ICC Dév.
- **Agences** : nb de franchises + nb de filiales.
- **Ordinateurs** : nb enregistrés + nb proches expiration ou expirés.
- **Alertes** : compteurs ORIAS / Ieam / Afib en alerte (jaune) et à jour.

**Bloc « Recrutements »** : histogramme des 5 derniers mois + le mois à venir, avec total.
Source : dates d'arrivée des membres.

**Bloc « Derniers ordinateurs masterisés »** : tableau des derniers postes préparés
(Nom, Modèle + n° de série, Enregistrement, Dernière synchro, Utilisateur).

**Bloc « Suivi du processus de création des nouveaux arrivants »** (bandeau vert) :
tableau du workflow d'onboarding — Utilisateur, Statut, Mise à jour le, Avancement (x/4),
Dernière étape, Prochaine étape, Réalisée par, Email. Paginé.

---

## Écran 2 — Employés

**4 KPI** : Actifs / Inactifs / Franchisés (membres d'une franchise) / Affiliés (membres d'une filiale).

**Action** : bouton « Créer un membre » (ouvre un formulaire).

**Tableau « Utilisateurs »**, colonnes :
- **Utilisateur** : avatar + Nom Prénom + email professionnel.
- **Type de contrat** : CDI, CDD, Contrat de Mandat, Contrat de Franchise.
- **Statut** : badge ACTIF (vert) / INACTIF (orange).
- **Fonction** : intitulé (ex. « Mandataire », « Directeur d'agence », « Salarié », « Alternant »)
  + précision contenant les **catégories ORIAS** (ex. « MIOBSP & MIA », « COBSP & COA »).
- **Agence** de rattachement.
- **Arrivée** (date).
- Actions : **Éditer** (crayon), **SharePoint** (dossier), **MDP** (réinitialisation mot de passe / verrou).

**Filtres** (ajout vs ancien outil) : statut, type de contrat, agence.

**Clic sur une ligne → fiche membre 360°** (panneau latéral) regroupant :
- Identité & contact, contrat, réseau, dates d'arrivée/départ.
- **ORIAS** : catégories (déduites de la fonction ou saisies), n° ORIAS, dates d'immatriculation
  et de renouvellement, RC Pro, garantie financière, statut (à jour / à renouveler / expiré).
- **Formation continue** : heures requises (15 h DDA / 7 h DCI) vs réalisées sur l'année, historique des sessions.
- **Informatique** : poste(s) attribué(s), accès logiciels, statut d'onboarding.

---

## Écran 3 — Agences

**4 KPI** : Actives / Inactives / Franchisées / Affiliées.

**Action** : bouton « Créer une agence ».

**Tableau « Agences »**, colonnes :
- **Agence** (nom),
- **Type** (Franchise / Filiale),
- **Statut** (ACTIF / INACTIF),
- **Directeur(s)** (un ou plusieurs, en pastilles),
- **Raison sociale — statut juridique** (ex. « ICC Finance — SARL », « SJG Finance — SAS »),
- Actions : Éditer, SharePoint.

Données complémentaires en fiche agence : adresse, n° ORIAS de l'agence, RC Pro, garantie financière,
membres rattachés, lien SharePoint.

---

## Écran 4 — Ordinateurs (parc informatique)

**4 KPI** :
- **Attribués** : ordinateurs liés à un utilisateur.
- **Libres** : non attribués.
- **À renouveler** : âge > 34 mois (depuis la date d'enregistrement).
- **Expirés** : âge > 36 mois.

**Tableau « Ordinateurs »**, colonnes :
- **Nom** (ex. DESKTOP-XXXX),
- **Modèle** + **n° de série**,
- **Enregistrement** (date),
- **Dernière synchro** (date),
- **Espace disque libre** : pourcentage + barre colorée (vert ≥70, bleu 50-69, orange 35-49, rouge <35),
- **Statut** (ACTIF / À renouveler / Expiré, calculé sur l'âge),
- **Utilisateur** (pastille),
- **Redevance** (indicateur), **Source** (indicateur), **Éditer**.

**Filtres** : état (à renouveler / expiré), agence, attribué/libre.
Données alimentées idéalement par synchronisation (agent de parc / Intune) — voir intégrations.

---

## Écran 5 — Redevance info.

**4 KPI** : nb Silver / nb Gold / Redevance moyenne par agence (HT + TTC) / Redevance totale (HT + TTC).
(Les libellés existants précisent « sans ICC Dev. » : prévoir un paramètre d'exclusion d'agences du calcul.)

**Tableau « Redevance informatique »** — une ligne par agence, colonnes regroupées et colorées :
- bloc **Silver** (orange) : nb, HT, Total TTC,
- bloc **Gold** (rose) : nb, HT, Total TTC,
- bloc **Moyenne/personne** (vert) : HT, TTC,
- bloc **Total redevance** (bleu) : HT, TTC.

Calculs : prix unitaires paramétrables (Silver et Gold, HT), TVA paramétrable (20 % par défaut),
TTC = HT × (1 + TVA). Le bloc redevance est lié au parc / aux licences (chaque poste ou membre porte
un niveau Silver/Gold). Prévoir un **export** (CSV/Excel).

---

## Transverse

- **Recherche** plein-texte et **tri** sur chaque tableau ; pagination (10/25/50/Tout).
- **Workflow d'onboarding** paramétrable (étapes : création AD, boîte mail, attribution PC,
  accès CRM, accès SharePoint, immatriculation ORIAS, planification formation initiale…),
  avec avancement, responsable et notifications.
- **Alertes & notifications** : renouvellement ORIAS (fenêtre déc.–fév.), RC Pro arrivant à échéance,
  postes > 34/36 mois, heures de formation insuffisantes, dossier RH incomplet.
- **Exports** CSV/Excel sur les listes et la redevance.
- **Journal d'audit** consultable par les admins.
- **Paramétrage** : agences, prix de redevance, niveaux Silver/Gold, étapes d'onboarding, rôles.
- **i18n** : français (extensible).

## Hors périmètre (V1)

- Paie et notes de frais.
- Signature électronique des contrats (prévoir un point d'extension).
