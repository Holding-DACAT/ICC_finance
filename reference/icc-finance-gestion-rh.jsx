import React, { useState, useMemo } from "react";
import {
  LayoutDashboard, Users, Building2, Monitor, BadgeEuro, Search, Plus,
  Pencil, Folder, Lock, Bell, RefreshCw, CalendarX, ClipboardList, FileText,
  Cog, X, Mail, ShieldCheck, GraduationCap, Laptop, ChevronRight, UserX,
} from "lucide-react";

/* =========================================================================
   Charte reprise des captures : fond indigo, accent orange, KPI multicolores
   ========================================================================= */
const C = {
  appBg: "#343C72", sidebar: "#2C3463", card: "#3B4480", cardSoft: "#454E8E",
  line: "rgba(255,255,255,0.08)", line2: "rgba(255,255,255,0.14)",
  text: "#FFFFFF", soft: "#AEB4DA", faint: "#8A90BD",
  orange: "#EE8526", orange2: "#E2761C",
  pink: "#E83E8C", green: "#3FB95B", blue: "#2E9BE6",
  ok: "#46C46A", warn: "#EF8A2B", danger: "#E0533F",
};
const TVA = 1.2, U_SILVER = 58.33, U_GOLD = 112.5;

/* ------------------------------- utils ---------------------------------- */
const now = new Date();
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const fmt = (s) => { if (!s) return "—"; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const monthsSince = (s) => { const dt = new Date(s); return (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth()); };
const eur = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const ini = (p, n) => `${(p || " ")[0]}${(n || " ")[0]}`.toUpperCase();

/* ============================== DONNÉES ================================== */
/* Employés — repris des captures + complétés pour un échantillon cohérent   */
const EMP = [
  ["Anthony", "BAUCAL", "CDD", "Alternant", "Développeur", "", "ICC Développement", "Filiale", iso(2020, 9, 27), "actif"],
  ["Anaïs", "BOGUENE", "Contrat de Mandat", "Mandataire", "MIOBSP & MIA", "MIOBSP, MIA", "Colomiers", "Filiale", iso(2021, 7, 11), "actif"],
  ["Arnaud", "CHARPENTIER", "Contrat de Mandat", "Mandataire", "MIOBSP & MIA", "MIOBSP, MIA", "Colomiers", "Filiale", iso(2021, 9, 1), "actif"],
  ["Axelle", "D'ORSO", "Contrat de mandat", "Mandataire", "MIOBSP & MIA", "MIOBSP, MIA", "Bordeaux", "Filiale", iso(2026, 2, 26), "inactif"],
  ["Anaïs", "DAI-PRA", "CDI", "Salarié", "Responsable Administrative et Financière", "", "Colomiers", "Filiale", iso(2014, 7, 15), "actif"],
  ["Alexia", "DENEGRE", "Contrat de Franchise", "Directrice d'agence", "COBSP & COA", "COBSP, COA", "Agen & Miramont-de-Guyenne", "Franchise", iso(2020, 12, 17), "actif"],
  ["Arnaud", "DUMAS", "Contrat de Franchise", "Directeur d'agence", "COBSP & COA", "COBSP, COA", "Albi", "Franchise", iso(2018, 12, 14), "actif"],
  ["Antoine", "FLORIAN", "Contrat de Mandat", "Mandataire", "MIOBSP & MIA", "MIOBSP, MIA", "Montauban", "Franchise", iso(2019, 4, 14), "inactif"],
  ["Andréa", "GARROUSTE", "Contrat de Mandat", "Mandataire", "MIOBSP & MIA", "MIOBSP, MIA", "Muret", "Filiale", iso(2019, 9, 30), "actif"],
  ["Valentin", "DESTRUEL", "Contrat de Mandat", "Mandataire", "MIOBSP & MIA", "MIOBSP, MIA", "Labège", "Filiale", iso(2022, 11, 3), "actif"],
  ["Vincent", "GISQUET", "Contrat de Franchise", "Directeur d'agence", "COBSP & COA", "COBSP, COA", "Perpignan", "Franchise", iso(2017, 6, 9), "actif"],
  ["Séverine", "BUENO GARCIA", "Contrat de Franchise", "Directrice d'agence", "COBSP & COA", "COBSP, COA", "Albi", "Franchise", iso(2016, 3, 21), "actif"],
  ["Jean-Baptiste", "BOURIN", "CDI", "Directeur d'agence", "COBSP & COA", "COBSP, COA", "Bordeaux", "Filiale", iso(2015, 1, 12), "actif"],
  ["Julien", "COSTA", "Contrat de Franchise", "Directeur d'agence", "COBSP & COA", "COBSP, COA", "Perpignan", "Franchise", iso(2021, 5, 4), "actif"],
  ["Laurent", "LABAU", "CDI", "Directeur d'agence", "COBSP & COA", "COBSP, COA", "Labège", "Filiale", iso(2013, 9, 2), "actif"],
  ["Marie", "FERRAND", "Contrat de Mandat", "Mandataire", "MIOBSP & MIA", "MIOBSP, MIA", "Bordeaux", "Filiale", iso(2023, 2, 15), "actif"],
].map((e, i) => ({
  id: "e" + i, prenom: e[0], nom: e[1], email: `${e[0].toLowerCase().replace(/[éè]/g, "e").replace(/[^a-z]/g, "")}.${e[1].toLowerCase().replace(/['\s]/g, "")}@icc-finance.fr`,
  contrat: e[2], fonction: e[3], sousFonction: e[4], orias: e[5], agence: e[6], reseau: e[7], arrivee: e[8], statut: e[9],
  heuresRealise: e[3].includes("Mandataire") || e[3].includes("irecteur") ? [6, 9, 12, 15, 4, 11, 15, 8][i % 8] : 0,
}));

/* Agences — reprises des captures */
const AG = [
  ["Agen & Miramont-de-Guyenne", "Franchise", ["Florent PETIT"], "Clape And Co-Consulting", "SAS"],
  ["Albi", "Franchise", ["Séverine BUENO GARCIA"], "SJG Finance", "SAS"],
  ["Bordeaux", "Filiale", ["Jean-Baptiste BOURIN"], "ICC Bordeaux", "SARL"],
  ["Colomiers", "Filiale", ["Damien CATALA", "Hugo CARIAT"], "ICC Finance", "SARL"],
  ["ICC Développement", "Filiale", ["Sylvain GOMEZ"], "ICC Développement", "SARL"],
  ["L'Union", "Filiale", ["Antoine LOUBIERE", "Hugo CARIAT"], "ICC Saint Jean", "SARL"],
  ["Labège", "Filiale", ["Laurent LABAU"], "ICC Labège", "SARL"],
  ["Montauban", "Franchise", ["Sébastien ASCARAT"], "Ascarat Conseil & Financement", "SARL"],
  ["Muret", "Filiale", ["Jérôme HILAIRE"], "ICC Muret", "SARL"],
  ["Perpignan", "Franchise", ["Julien COSTA"], "CC Crédit", "SAS"],
  ["Angoulême", "Franchise", ["Catherine BUTON"], "CB Patrimoine", "SAS"],
  ["Bayonne", "Filiale", ["Carole ETCHEVERRY"], "ICC Pays Basque", "SARL"],
].map((a, i) => ({ id: "a" + i, nom: a[0], type: a[1], directeurs: a[2], raison: a[3], juridique: a[4], statut: "actif" }));

/* Redevance par agence (compteurs Silver / Gold) */
const RED_SEED = {
  "Agen & Miramont-de-Guyenne": [3, 0], "Albi": [6, 0], "Angoulême": [3, 1], "Bayonne": [2, 3],
  "Bordeaux": [8, 2], "Colomiers": [14, 1], "ICC Développement": [4, 3], "L'Union": [5, 1],
  "Labège": [4, 2], "Montauban": [3, 1], "Muret": [2, 0], "Perpignan": [6, 2],
};

/* Ordinateurs */
const PCS = [
  ["DESKTOP-UOGNCMI", "HP EliteBook 850 G7 Notebook PC", "5CG0470C7N", iso(2023, 3, 22), iso(2023, 7, 26), 91, "BAUCAL Anthony"],
  ["DESKTOP-5R4TK2F", "HP EliteBook 850 G8 Notebook PC", "5CG22133NH", iso(2022, 12, 20), iso(2023, 7, 26), 51, "BOGUENE Anaïs"],
  ["DESKTOP-D9V22HO", "HP EliteBook 840 G6", "5CG0268V55", iso(2022, 8, 4), iso(2023, 7, 21), 59, "CHARPENTIER Arnaud"],
  ["DESKTOP-AL10836", "HP EliteBook 840 G6", "5CG03935V3", iso(2022, 7, 19), iso(2023, 7, 26), 68, "DENEGRE Alexia"],
  ["DESKTOP-1ARTE8F", "HP ZBook Power 15.6 G8 Mobile Workstation", "5CD2022GVV", iso(2022, 7, 13), iso(2023, 7, 26), 57, "DUMAS Arnaud"],
  ["DESKTOP-PH9L396", "HP EliteBook x360 830 G7 Notebook PC", "5CG124778Z", iso(2022, 7, 6), iso(2023, 7, 23), 66, "GARROUSTE Andréa"],
  ["DESKTOP-IKUJ3R3", "HP EliteBook 840 G6", "5CG938C7TF", iso(2022, 3, 1), iso(2023, 7, 26), 33, "GISQUET Vincent"],
  ["DESKTOP-9KKL9OJ", "HP EliteBook 850 G8 Notebook PC", "5CG125CDJK", iso(2022, 2, 28), iso(2023, 7, 26), 65, "DESTRUEL Valentin"],
  ["DESKTOP-386C60H", "HP EliteBook 850 G8 Notebook PC", "5CG1224CGM", iso(2022, 2, 4), iso(2023, 7, 21), 44, "FERRAND Marie"],
  ["DESKTOP-R410RLT", "HP EliteBook 850 G8 Notebook PC", "5CG1224K4S", iso(2022, 1, 25), iso(2023, 7, 26), 28, "BOURIN Jean-Baptiste"],
  ["DESKTOP-KBK6V76", "HP EliteBook 850 G8 Notebook PC", "5CG1350898", iso(2023, 6, 21), iso(2023, 7, 21), 74, "DESTRUEL Valentin"],
  ["DESKTOP-3NBDSR4", "HP EliteBook 850 G8 Notebook PC", "5CG221BSJ3", iso(2023, 1, 23), iso(2023, 2, 25), 80, "GISQUET Vincent"],
].map((p, i) => ({ id: "p" + i, nom: p[0], modele: p[1], serie: p[2], enr: p[3], synchro: p[4], disque: p[5], user: p[6] }));

/* Nouveaux arrivants (process onboarding) */
const ARRIV = [
  { user: "FERRAND Marie", statut: "EN COURS", maj: iso(2023, 2, 16), av: 2, dern: "Création AD", proch: "Attribution PC", par: "DAI-PRA Anaïs" },
  { user: "DESTRUEL Valentin", statut: "TERMINÉ", maj: iso(2022, 11, 4), av: 4, dern: "Accès SharePoint", proch: "Aucune", par: "DAI-PRA Anaïs" },
];
const RECRUT = [["Nov", 1], ["Déc", 0], ["Jan", 2], ["Fév", 1], ["Mar", 0], ["Avr", 1]];

const ORIAS_LIB = { MIOBSP: "Mandataire en opérations de banque", MIA: "Mandataire d'intermédiaire d'assurance", COBSP: "Courtier en opérations de banque", COA: "Courtier en assurance", CIF: "Conseiller en investissements financiers", MIAS: "Mandataire en assurance" };

/* =========================== COMPOSANTS UI =============================== */
function Kpi({ Icon, color, label, value, sub }) {
  return (
    <div className="k-card">
      <div className="k-top">
        <div className="k-ic" style={{ background: color }}><Icon size={22} color="#fff" /></div>
        <div className="k-vals">
          <div className="k-label">{label}</div>
          <div className="k-value">{value}</div>
        </div>
      </div>
      <div className="k-sub">{sub}</div>
    </div>
  );
}
function Section({ title, Icon, accent = "orange", action, children }) {
  return (
    <div className="sec">
      <div className={"sec-head " + accent}>
        <div className="sec-title"><Icon size={17} /> {title}</div>
        {action}
      </div>
      <div className="sec-body">{children}</div>
    </div>
  );
}
function Controls({ rows, setRows, q, setQ, extra }) {
  return (
    <div className="ctrls">
      <div className="ctrl-rows">
        <select value={rows} onChange={(e) => setRows(e.target.value)}>
          {["10", "25", "50", "Tout"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <span>Nombre de lignes à afficher</span>
      </div>
      {extra}
      <label className="ctrl-search">Recherche :
        <input value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
    </div>
  );
}
const Badge = ({ ok, children }) => (
  <span className="badge" style={{ background: ok ? C.ok : C.warn }}>{children}</span>
);
const Avatar = ({ p, n, on = true }) => (
  <div className="ava" style={{ background: on ? C.cardSoft : "#5b6190" }}>{ini(p, n)}</div>
);
function Disk({ v }) {
  const col = v >= 70 ? C.ok : v >= 50 ? C.blue : v >= 35 ? C.orange : C.danger;
  return (
    <div className="disk"><b>{v}%</b>
      <div className="disk-bar"><div style={{ width: v + "%", background: col }} /></div>
    </div>
  );
}
const Dot = () => <span className="dot" />;
const Act = ({ children }) => <div className="acts">{children}</div>;

function paginate(arr, rows) { return rows === "Tout" ? arr : arr.slice(0, +rows); }

/* ============================== PAGES ==================================== */
function Dashboard({ emp, ag, pcs, open }) {
  const actifs = emp.filter((e) => e.statut === "actif").length;
  const fr = ag.filter((a) => a.type === "Franchise").length;
  const fi = ag.filter((a) => a.type === "Filiale").length;
  const expSoon = pcs.filter((p) => monthsSince(p.enr) > 34).length;
  const last = [...pcs].sort((a, b) => b.enr.localeCompare(a.enr)).slice(0, 3);
  const totalRec = RECRUT.reduce((s, r) => s + r[1], 0);
  const maxRec = Math.max(1, ...RECRUT.map((r) => r[1]));
  return (
    <>
      <div className="kpis">
        <Kpi Icon={Users} color={C.orange} label="Membres du réseau"
          value={<><div>{emp.length} membres du réseau</div><div className="k-line2">{emp.filter((e) => e.reseau === "Filiale").length} membres ICC Dév.</div></>}
          sub="Ressources Humaines" />
        <Kpi Icon={Building2} color={C.pink} label="Agences du réseau"
          value={<><div>{fr} franchises</div><div className="k-line2">{fi} filiales</div></>} sub="Réseau d'agences" />
        <Kpi Icon={Monitor} color={C.green} label="Parc informatique"
          value={<><div>{pcs.length} ordinateurs</div><div className="k-line2">{expSoon} proches expiration</div></>} sub="Résumé ordinateurs" />
        <Kpi Icon={Bell} color={C.blue} label="Alertes en cours"
          value={<><div className="k-warn">⚠ {emp.filter((e) => e.orias).length} Orias · 0 Ieam</div><div className="k-line2">à surveiller</div></>} sub="Résumé des alertes" />
      </div>

      <div className="dash-cols">
        <Section title="Recrutements (5 derniers mois + à venir)" Icon={ClipboardList}>
          <div className="chart">
            {RECRUT.map(([m, v]) => (
              <div className="chart-col" key={m}>
                <div className="chart-bar" style={{ height: `${(v / maxRec) * 100}%` }}>{v > 0 && <span>{v}</span>}</div>
                <div className="chart-x">{m}</div>
              </div>
            ))}
          </div>
          <div className="chart-cap">Total : <b>{totalRec} recrutements</b> sur la période.</div>
        </Section>

        <Section title="Derniers ordinateurs masterisés" Icon={Cog}>
          <table className="tbl">
            <thead><tr><th>Nom</th><th>Modèle</th><th>Enreg.</th><th>Utilisateur</th></tr></thead>
            <tbody>
              {last.map((p) => (
                <tr key={p.id}><td className="b">{p.nom}</td>
                  <td className="soft">{p.modele}<div className="serie">{p.serie}</div></td>
                  <td className="soft">{fmt(p.enr)}</td>
                  <td><span className="chip">{p.user}</span></td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Suivi du processus de création des nouveaux arrivants" Icon={Search} accent="green">
        <table className="tbl">
          <thead><tr><th>Utilisateur</th><th>Statut</th><th>MàJ le</th><th>Avancement</th><th>Dernière étape</th><th>Prochaine étape</th><th>Réalisée par</th></tr></thead>
          <tbody>
            {ARRIV.map((a, i) => (
              <tr key={i}>
                <td className="b">{a.user}</td>
                <td><span className="badge" style={{ background: a.statut === "TERMINÉ" ? C.ok : C.orange }}>{a.statut}</span></td>
                <td className="soft">{fmt(a.maj)}</td>
                <td><div className="prog"><div style={{ width: `${(a.av / 4) * 100}%` }} /></div><span className="soft sm">{a.av}/4</span></td>
                <td><span className="chip">{a.dern}</span></td>
                <td><span className="chip">{a.proch}</span></td>
                <td className="soft">{a.par}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

function Employes({ emp, open, onCreate }) {
  const [rows, setRows] = useState("25"); const [q, setQ] = useState("");
  const [statut, setStatut] = useState("Tous"); const [type, setType] = useState("Tous");
  const f = emp.filter((e) =>
    (statut === "Tous" || e.statut === statut.toLowerCase()) &&
    (type === "Tous" || e.contrat === type) &&
    `${e.prenom} ${e.nom} ${e.email} ${e.fonction} ${e.agence}`.toLowerCase().includes(q.toLowerCase()));
  const contrats = [...new Set(emp.map((e) => e.contrat))];
  const kpi = {
    actifs: emp.filter((e) => e.statut === "actif").length,
    inactifs: emp.filter((e) => e.statut === "inactif").length,
    fr: emp.filter((e) => e.reseau === "Franchise").length,
    fi: emp.filter((e) => e.reseau === "Filiale").length,
  };
  return (
    <>
      <div className="kpis">
        <Kpi Icon={Users} color={C.orange} label="Actifs" value={kpi.actifs} sub="Membres actuels du réseau" />
        <Kpi Icon={UserX} color={C.pink} label="Inactifs" value={kpi.inactifs} sub="Anciens membres du réseau" />
        <Kpi Icon={Building2} color={C.green} label="Franchisés" value={kpi.fr} sub="Membres d'une franchise" />
        <Kpi Icon={Users} color={C.blue} label="Affiliés" value={kpi.fi} sub="Membres d'une filiale" />
      </div>
      <Section title="Utilisateurs" Icon={Users}
        action={<button className="btn-create" onClick={onCreate}>Créer un membre <Plus size={15} /></button>}>
        <Controls rows={rows} setRows={setRows} q={q} setQ={setQ} extra={
          <div className="ctrl-filters">
            <select value={statut} onChange={(e) => setStatut(e.target.value)}><option>Tous</option><option>Actif</option><option>Inactif</option></select>
            <select value={type} onChange={(e) => setType(e.target.value)}><option>Tous</option>{contrats.map((c) => <option key={c}>{c}</option>)}</select>
          </div>} />
        <table className="tbl">
          <thead><tr><th>Utilisateur</th><th>Type de contrat</th><th>Statut</th><th>Fonction</th><th>Agence</th><th>Arrivée</th><th className="c">Éditer</th><th className="c">SharePoint</th><th className="c">MDP</th></tr></thead>
          <tbody>
            {paginate(f, rows).map((e) => (
              <tr key={e.id} className="rowclick" onClick={() => open(e)}>
                <td><div className="usr"><Avatar p={e.prenom} n={e.nom} on={e.statut === "actif"} />
                  <div><div className="b">{e.nom} {e.prenom}</div><div className="soft sm">{e.email}</div></div></div></td>
                <td className="soft">{e.contrat}</td>
                <td><Badge ok={e.statut === "actif"}>{e.statut === "actif" ? "ACTIF" : "INACTIF"}</Badge></td>
                <td><div className="b">{e.fonction}</div><div className="soft sm">{e.sousFonction}</div></td>
                <td className="soft">{e.agence}</td>
                <td className="soft">{fmt(e.arrivee)}</td>
                <td className="c"><Pencil size={15} className="i" /></td>
                <td className="c"><Folder size={15} className="i" /></td>
                <td className="c"><Lock size={14} className="i" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {f.length === 0 && <div className="empty">Aucun membre pour ces critères.</div>}
        <div className="tbl-foot">{f.length} membre(s) — affichage {rows === "Tout" ? f.length : Math.min(+rows, f.length)}</div>
      </Section>
    </>
  );
}

function Agences({ ag }) {
  const [rows, setRows] = useState("Tout"); const [q, setQ] = useState(""); const [type, setType] = useState("Tous");
  const f = ag.filter((a) => (type === "Tous" || a.type === type) &&
    `${a.nom} ${a.directeurs.join(" ")} ${a.raison}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="kpis">
        <Kpi Icon={Building2} color={C.orange} label="Actives" value={ag.filter((a) => a.statut === "actif").length} sub="Agences actuelles du réseau" />
        <Kpi Icon={Building2} color={C.pink} label="Inactives" value={ag.filter((a) => a.statut !== "actif").length} sub="Anciennes agences du réseau" />
        <Kpi Icon={Building2} color={C.green} label="Franchisées" value={ag.filter((a) => a.type === "Franchise").length} sub="Agences franchisées" />
        <Kpi Icon={Building2} color={C.blue} label="Affiliées" value={ag.filter((a) => a.type === "Filiale").length} sub="Agences filiales" />
      </div>
      <Section title="Agences" Icon={Building2} action={<button className="btn-create">Créer une agence <Plus size={15} /></button>}>
        <Controls rows={rows} setRows={setRows} q={q} setQ={setQ} extra={
          <div className="ctrl-filters"><select value={type} onChange={(e) => setType(e.target.value)}><option>Tous</option><option>Franchise</option><option>Filiale</option></select></div>} />
        <table className="tbl">
          <thead><tr><th>Agence</th><th>Type</th><th>Statut</th><th>Directeur(s)</th><th>Raison sociale — statut juridique</th><th className="c">Éditer</th><th className="c">SharePoint</th></tr></thead>
          <tbody>
            {paginate(f, rows).map((a) => (
              <tr key={a.id}>
                <td className="b">{a.nom}</td>
                <td className="soft">{a.type}</td>
                <td><Badge ok>ACTIF</Badge></td>
                <td>{a.directeurs.map((d) => <span key={d} className="chip">{d}</span>)}</td>
                <td className="soft"><b style={{ color: C.text }}>{a.raison}</b> — {a.juridique}</td>
                <td className="c"><Pencil size={15} className="i" /></td>
                <td className="c"><Folder size={15} className="i" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tbl-foot">{f.length} agence(s)</div>
      </Section>
    </>
  );
}

function Ordinateurs({ pcs }) {
  const [rows, setRows] = useState("25"); const [q, setQ] = useState(""); const [etat, setEtat] = useState("Tous");
  const aged = (p) => monthsSince(p.enr);
  const f = pcs.filter((p) => {
    const m = aged(p);
    const okEtat = etat === "Tous" || (etat === "À renouveler" ? m > 34 && m <= 36 : etat === "Expiré" ? m > 36 : m <= 34);
    return okEtat && `${p.nom} ${p.modele} ${p.serie} ${p.user}`.toLowerCase().includes(q.toLowerCase());
  });
  return (
    <>
      <div className="kpis">
        <Kpi Icon={Monitor} color={C.orange} label="Attribués" value={pcs.filter((p) => p.user).length} sub="Ordinateurs attribués à un utilisateur" />
        <Kpi Icon={FileText} color={C.pink} label="Libres" value={pcs.filter((p) => !p.user).length} sub="Ordinateurs non attribués" />
        <Kpi Icon={RefreshCw} color={C.green} label="À renouveler" value={pcs.filter((p) => aged(p) > 34).length} sub="Ordinateurs de plus de 34 mois" />
        <Kpi Icon={CalendarX} color={C.blue} label="Expirés" value={pcs.filter((p) => aged(p) > 36).length} sub="Ordinateurs de plus de 36 mois" />
      </div>
      <Section title="Ordinateurs" Icon={Monitor}>
        <Controls rows={rows} setRows={setRows} q={q} setQ={setQ} extra={
          <div className="ctrl-filters"><select value={etat} onChange={(e) => setEtat(e.target.value)}><option>Tous</option><option>À renouveler</option><option>Expiré</option></select></div>} />
        <table className="tbl">
          <thead><tr><th>Nom</th><th>Modèle</th><th>Enreg.</th><th>Synchro</th><th>Disque libre</th><th>Statut</th><th>Utilisateur</th><th className="c">Red.</th><th className="c">Src</th><th className="c">Éd.</th></tr></thead>
          <tbody>
            {paginate(f, rows).map((p) => {
              const m = aged(p);
              return (
                <tr key={p.id}>
                  <td className="b">{p.nom}</td>
                  <td className="soft">{p.modele}<div className="serie">{p.serie}</div></td>
                  <td className="soft">{fmt(p.enr)}</td>
                  <td className="soft">{fmt(p.synchro)}</td>
                  <td><Disk v={p.disque} /></td>
                  <td><span className="badge" style={{ background: m > 36 ? C.danger : m > 34 ? C.warn : C.ok }}>{m > 36 ? "EXPIRÉ" : m > 34 ? "À RENOUV." : "ACTIF"}</span></td>
                  <td><span className="chip">{p.user}</span></td>
                  <td className="c"><Dot /></td><td className="c"><Dot /></td>
                  <td className="c"><Pencil size={14} className="i" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tbl-foot">{f.length} poste(s)</div>
      </Section>
    </>
  );
}

function Redevance({ ag }) {
  const [rows, setRows] = useState("25"); const [q, setQ] = useState("");
  const data = ag.map((a) => {
    const [s, g] = RED_SEED[a.nom] || [0, 0];
    const sHT = s * U_SILVER, gHT = g * U_GOLD, totHT = sHT + gHT;
    const pers = s + g, moyHT = pers ? totHT / pers : 0;
    return { nom: a.nom, s, g, sHT, gHT, totHT, moyHT };
  }).filter((r) => r.nom.toLowerCase().includes(q.toLowerCase()));
  const tot = data.reduce((o, r) => ({ s: o.s + r.s, g: o.g + r.g, ht: o.ht + r.totHT }), { s: 0, g: 0, ht: 0 });
  const moyAg = data.length ? tot.ht / data.length : 0;
  return (
    <>
      <div className="kpis">
        <Kpi Icon={BadgeEuro} color={C.orange} label="Silver" value={tot.s} sub="Nombre total de redevances Silver" />
        <Kpi Icon={BadgeEuro} color={C.pink} label="Gold" value={tot.g} sub="Nombre total de redevances Gold" />
        <Kpi Icon={BadgeEuro} color={C.green} label="Moyenne / agence"
          value={<><div>{eur(moyAg)} HT</div><div className="k-line2">{eur(moyAg * TVA)} TTC</div></>} sub="Redevance agence moyenne" />
        <Kpi Icon={BadgeEuro} color={C.blue} label="Totale"
          value={<><div>{eur(tot.ht)} HT</div><div className="k-line2">{eur(tot.ht * TVA)} TTC</div></>} sub="Redevance totale" />
      </div>
      <Section title="Redevance informatique" Icon={BadgeEuro}>
        <Controls rows={rows} setRows={setRows} q={q} setQ={setQ} />
        <table className="tbl tbl-red">
          <thead><tr>
            <th>Agence</th>
            <th className="col-s">Silver</th><th className="col-s">HT</th><th className="col-s">Total TTC</th>
            <th className="col-g">Gold</th><th className="col-g">HT</th><th className="col-g">Total TTC</th>
            <th className="col-m">Moy/pers HT</th><th className="col-m">Moy/pers TTC</th>
            <th className="col-t">Total HT</th><th className="col-t">Total TTC</th>
          </tr></thead>
          <tbody>
            {paginate(data, rows).map((r) => {
              const pers = r.s + r.g;
              return (
                <tr key={r.nom}>
                  <td className="b">{r.nom}</td>
                  <td className="col-s c">{r.s}</td><td className="col-s">{eur(r.sHT)}</td><td className="col-s">{eur(r.sHT * TVA)}</td>
                  <td className="col-g c">{r.g}</td><td className="col-g">{eur(r.gHT)}</td><td className="col-g">{eur(r.gHT * TVA)}</td>
                  <td className="col-m">{eur(pers ? r.totHT / pers : 0)}</td><td className="col-m">{eur(pers ? (r.totHT / pers) * TVA : 0)}</td>
                  <td className="col-t">{eur(r.totHT)}</td><td className="col-t">{eur(r.totHT * TVA)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tbl-foot">{data.length} agence(s) — Silver {U_SILVER.toLocaleString("fr-FR")} € · Gold {U_GOLD.toLocaleString("fr-FR")} € (HT, TVA 20 %)</div>
      </Section>
    </>
  );
}

/* --------------------------- Détail employé ----------------------------- */
function EmpDetail({ e, pcs, onClose }) {
  const codes = e.orias ? e.orias.split(",").map((s) => s.trim()) : [];
  const poste = pcs.find((p) => p.user === `${e.nom} ${e.prenom}`);
  const requis = codes.length ? 15 : 0;
  return (
    <div className="ov" onClick={onClose}>
      <div className="drw" onClick={(ev) => ev.stopPropagation()}>
        <div className="drw-h">
          <div className="usr"><Avatar p={e.prenom} n={e.nom} on={e.statut === "actif"} />
            <div><div className="drw-name">{e.nom} {e.prenom}</div><div className="soft sm">{e.fonction} · {e.agence}</div></div></div>
          <button className="close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drw-contact"><Mail size={13} /> {e.email}</div>

        <div className="drw-sec"><FileText size={14} /> Informations RH</div>
        <div className="drw-grid">
          <div><span>Statut</span><b>{e.statut === "actif" ? "Actif" : "Inactif"}</b></div>
          <div><span>Type de contrat</span><b>{e.contrat}</b></div>
          <div><span>Réseau</span><b>{e.reseau}</b></div>
          <div><span>Arrivée</span><b>{fmt(e.arrivee)}</b></div>
        </div>

        <div className="drw-sec"><ShieldCheck size={14} /> Immatriculation ORIAS</div>
        {codes.length === 0 && <div className="soft sm" style={{ padding: "4px 0" }}>Aucune catégorie (fonction support).</div>}
        {codes.map((c) => (
          <div className="drw-line" key={c}><span><b style={{ color: C.text }}>{c}</b> — {ORIAS_LIB[c] || "Catégorie"}</span>
            <span className="badge" style={{ background: C.ok }}>À jour</span></div>
        ))}

        <div className="drw-sec"><GraduationCap size={14} /> Formation continue (DDA)</div>
        {requis > 0 ? (
          <>
            <div className="prog lg"><div style={{ width: `${Math.min(100, (e.heuresRealise / requis) * 100)}%`, background: e.heuresRealise >= requis ? C.ok : C.orange }} /></div>
            <div className="soft sm">{e.heuresRealise} / {requis} h réalisées cette année.</div>
          </>
        ) : <div className="soft sm">Non soumis à l'obligation DDA.</div>}

        <div className="drw-sec"><Laptop size={14} /> Poste informatique</div>
        {poste ? (
          <div className="drw-line"><span>{poste.nom} · {poste.modele}</span>
            <span className="badge" style={{ background: monthsSince(poste.enr) > 36 ? C.danger : monthsSince(poste.enr) > 34 ? C.warn : C.ok }}>
              {monthsSince(poste.enr) > 36 ? "À remplacer" : monthsSince(poste.enr) > 34 ? "À renouveler" : "OK"}</span></div>
        ) : <div className="soft sm">Aucun poste attribué.</div>}
      </div>
    </div>
  );
}

/* ------------------------------ Créer membre ---------------------------- */
function CreateMember({ onClose, onAdd }) {
  const [f, setF] = useState({ prenom: "", nom: "", contrat: "Contrat de Mandat", fonction: "Mandataire", agence: "Colomiers", reseau: "Filiale" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="drw-h"><div className="drw-name">Créer un membre</div><button className="close" onClick={onClose}><X size={18} /></button></div>
        <div className="form">
          <label>Prénom<input value={f.prenom} onChange={set("prenom")} /></label>
          <label>Nom<input value={f.nom} onChange={set("nom")} /></label>
          <label>Type de contrat<select value={f.contrat} onChange={set("contrat")}><option>Contrat de Mandat</option><option>Contrat de Franchise</option><option>CDI</option><option>CDD</option></select></label>
          <label>Fonction<select value={f.fonction} onChange={set("fonction")}><option>Mandataire</option><option>Directeur d'agence</option><option>Salarié</option><option>Alternant</option></select></label>
          <label>Agence<select value={f.agence} onChange={set("agence")}>{AG.map((a) => <option key={a.id}>{a.nom}</option>)}</select></label>
          <label>Réseau<select value={f.reseau} onChange={set("reseau")}><option>Filiale</option><option>Franchise</option></select></label>
        </div>
        <button className="btn-create full" disabled={!f.prenom || !f.nom} onClick={() => onAdd(f)}>Créer le membre <Plus size={15} /></button>
      </div>
    </div>
  );
}

/* ================================ APP ==================================== */
export default function App() {
  const [view, setView] = useState("dashboard");
  const [emp, setEmp] = useState(EMP);
  const [sel, setSel] = useState(null);
  const [creating, setCreating] = useState(false);

  const NAV = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["employes", "Employés", Users],
    ["agences", "Agences", Building2],
    ["ordinateurs", "Ordinateurs", Monitor],
    ["redevance", "Redevance info.", BadgeEuro],
  ];
  const addMember = (f) => {
    const isMand = f.fonction === "Mandataire", isDir = f.fonction.includes("irecteur");
    setEmp([{
      id: "e" + Date.now(), prenom: f.prenom, nom: f.nom.toUpperCase(),
      email: `${f.prenom.toLowerCase()}.${f.nom.toLowerCase()}@icc-finance.fr`,
      contrat: f.contrat, fonction: f.fonction, sousFonction: isMand ? "MIOBSP & MIA" : isDir ? "COBSP & COA" : "",
      orias: isMand ? "MIOBSP, MIA" : isDir ? "COBSP, COA" : "", agence: f.agence, reseau: f.reseau,
      arrivee: iso(now.getFullYear(), now.getMonth() + 1, now.getDate()), statut: "actif", heuresRealise: 0,
    }, ...emp]);
    setCreating(false);
  };

  return (
    <div className="app">
      <style>{CSS}</style>
      <aside className="side">
        <div className="brand">
          <div className="brand-mark"><Building2 size={18} color="#fff" /></div>
          <div><div className="brand-sub">ICC Finance</div><div className="brand-name">GESTION RH</div></div>
        </div>
        <nav>
          {NAV.map(([k, l, Icon]) => (
            <button key={k} className={"nav" + (view === k ? " on" : "")} onClick={() => setView(k)}>
              <Icon size={18} /> {l}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="user-pill">ANAÏS DAI-PRA</button>
          <div className="copy">© 2026 — ICC Finance (1.3.99)</div>
        </div>
      </aside>

      <main className="main">
        {view === "dashboard" && <Dashboard emp={emp} ag={AG} pcs={PCS} open={setSel} />}
        {view === "employes" && <Employes emp={emp} open={setSel} onCreate={() => setCreating(true)} />}
        {view === "agences" && <Agences ag={AG} />}
        {view === "ordinateurs" && <Ordinateurs pcs={PCS} />}
        {view === "redevance" && <Redevance ag={AG} />}
      </main>

      {sel && <EmpDetail e={sel} pcs={PCS} onClose={() => setSel(null)} />}
      {creating && <CreateMember onClose={() => setCreating(false)} onAdd={addMember} />}
    </div>
  );
}

/* ================================ CSS ==================================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.app{display:flex;min-height:100vh;background:${C.appBg};color:${C.text};
  font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:13.5px;}
.app select,.app input{font-family:inherit;}

/* Sidebar */
.side{width:236px;flex-shrink:0;background:${C.sidebar};display:flex;flex-direction:column;
  padding:16px 14px;position:sticky;top:0;height:100vh;border-radius:0 18px 18px 0;}
.brand{display:flex;align-items:center;gap:10px;padding:6px 6px 22px;}
.brand-mark{width:34px;height:34px;border-radius:9px;background:${C.orange};display:grid;place-items:center;}
.brand-sub{font-size:9.5px;letter-spacing:1px;color:${C.soft};text-transform:uppercase;}
.brand-name{font-weight:800;font-size:15px;background:${C.orange};color:#fff;padding:1px 8px;border-radius:5px;letter-spacing:.5px;display:inline-block;margin-top:2px;}
.nav{width:100%;display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:10px;border:none;
  background:none;color:${C.soft};cursor:pointer;font-size:13.5px;font-weight:600;margin-bottom:3px;text-align:left;transition:.13s;}
.nav:hover{background:rgba(255,255,255,.05);color:#fff;}
.nav.on{background:rgba(255,255,255,.09);color:#fff;}
.side-foot{margin-top:auto;text-align:center;}
.user-pill{width:100%;background:${C.orange};color:#fff;border:none;padding:11px;border-radius:10px;font-weight:700;
  font-size:12px;letter-spacing:.4px;cursor:pointer;font-family:inherit;}
.copy{font-size:10px;color:${C.faint};margin-top:12px;}

/* Main */
.main{flex:1;min-width:0;padding:22px 26px 40px;}

/* KPI */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;}
.k-card{background:${C.card};border-radius:14px;padding:16px 18px;box-shadow:0 6px 18px rgba(0,0,0,.12);}
.k-top{display:flex;gap:14px;align-items:flex-start;}
.k-ic{width:46px;height:46px;border-radius:11px;display:grid;place-items:center;flex-shrink:0;box-shadow:0 4px 10px rgba(0,0,0,.18);}
.k-vals{flex:1;text-align:right;}
.k-label{font-size:11.5px;color:${C.soft};}
.k-value{font-size:22px;font-weight:800;line-height:1.15;margin-top:2px;}
.k-line2{font-size:12.5px;font-weight:600;color:${C.soft};}
.k-warn{font-size:13px;font-weight:700;color:#FFD27A;}
.k-sub{font-size:11.5px;color:${C.faint};margin-top:12px;}

/* Sections */
.dash-cols{display:grid;grid-template-columns:1fr 1.3fr;gap:16px;margin-bottom:16px;}
.sec{background:${C.card};border-radius:14px;overflow:hidden;margin-bottom:16px;box-shadow:0 6px 18px rgba(0,0,0,.12);}
.sec-head{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;color:#fff;}
.sec-head.orange{background:linear-gradient(90deg,${C.orange},${C.orange2});}
.sec-head.green{background:linear-gradient(90deg,${C.green},#34a44e);}
.sec-title{display:flex;align-items:center;gap:9px;font-weight:700;font-size:14.5px;}
.sec-body{padding:14px 18px 18px;}
.btn-create{background:rgba(0,0,0,.22);color:#fff;border:1px solid rgba(255,255,255,.35);padding:8px 14px;border-radius:9px;
  font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:7px;}
.btn-create:hover{background:rgba(0,0,0,.34);}
.btn-create.full{width:100%;justify-content:center;background:${C.orange};border-color:${C.orange};margin-top:18px;padding:12px;}
.btn-create:disabled{opacity:.5;cursor:not-allowed;}

/* Controls */
.ctrls{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px;}
.ctrl-rows{display:flex;align-items:center;gap:8px;color:${C.soft};font-size:12.5px;}
.ctrl-rows select,.ctrl-filters select{background:${C.cardSoft};color:#fff;border:1px solid ${C.line2};
  border-radius:8px;padding:7px 10px;font-size:12.5px;font-weight:600;cursor:pointer;outline:none;}
.ctrl-filters{display:flex;gap:8px;}
.ctrl-search{margin-left:auto;display:flex;align-items:center;gap:8px;color:${C.soft};font-size:12.5px;}
.ctrl-search input{background:${C.cardSoft};border:1px solid ${C.line2};border-radius:8px;padding:7px 11px;color:#fff;width:210px;outline:none;}
.ctrl-search input:focus,.ctrl-rows select:focus,.ctrl-filters select:focus{border-color:${C.orange};}

/* Tables */
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:${C.soft};font-weight:700;
  text-align:left;padding:9px 12px;border-bottom:1px solid ${C.line2};white-space:nowrap;}
.tbl td{padding:11px 12px;border-bottom:1px solid ${C.line};vertical-align:middle;}
.tbl tr:last-child td{border-bottom:none;}
.tbl th.c,.tbl td.c{text-align:center;}
.tbl .b{font-weight:700;}
.tbl .soft{color:${C.soft};}
.tbl .sm{font-size:11.5px;}
.serie{font-size:11px;color:${C.faint};}
.rowclick{cursor:pointer;transition:.1s;}
.rowclick:hover{background:rgba(255,255,255,.04);}
.usr{display:flex;align-items:center;gap:11px;}
.ava{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font-weight:700;font-size:12px;flex-shrink:0;}
.badge{display:inline-block;color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.4px;padding:3px 9px;border-radius:6px;}
.chip{display:inline-block;background:${C.cardSoft};color:#fff;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:6px;margin:2px 3px 2px 0;}
.i{color:${C.soft};cursor:pointer;}.i:hover{color:#fff;}
.dot{display:inline-block;width:11px;height:11px;border-radius:50%;background:${C.orange};}
.disk{display:flex;align-items:center;gap:9px;}
.disk b{font-size:12px;min-width:34px;}
.disk-bar{width:120px;height:6px;background:rgba(255,255,255,.14);border-radius:5px;overflow:hidden;}
.disk-bar div{height:100%;border-radius:5px;}
.prog{display:inline-block;width:120px;height:7px;background:rgba(255,255,255,.14);border-radius:5px;overflow:hidden;vertical-align:middle;}
.prog.lg{display:block;width:100%;height:9px;margin:6px 0;}
.prog div{height:100%;background:${C.green};border-radius:5px;}
.tbl-foot{margin-top:12px;font-size:11.5px;color:${C.faint};}
.empty{padding:22px;text-align:center;color:${C.soft};}

/* Redevance colored columns */
.tbl-red .col-s{background:rgba(238,133,38,.16);}
.tbl-red .col-g{background:rgba(232,62,140,.16);}
.tbl-red .col-m{background:rgba(63,185,91,.15);}
.tbl-red .col-t{background:rgba(46,155,230,.16);}
.tbl-red th.col-s{background:rgba(238,133,38,.32);}
.tbl-red th.col-g{background:rgba(232,62,140,.32);}
.tbl-red th.col-m{background:rgba(63,185,91,.3);}
.tbl-red th.col-t{background:rgba(46,155,230,.32);}
.tbl-red td{font-size:12.5px;white-space:nowrap;}

/* Chart */
.chart{display:flex;align-items:flex-end;gap:14px;height:150px;padding:8px 4px 0;border-bottom:1px solid ${C.line2};}
.chart-col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;}
.chart-bar{width:60%;min-height:3px;background:linear-gradient(180deg,${C.pink},#c92d77);border-radius:6px 6px 0 0;
  position:relative;display:flex;justify-content:center;}
.chart-bar span{position:absolute;top:-18px;font-size:11px;font-weight:700;color:#fff;}
.chart-x{font-size:11px;color:${C.soft};margin-top:7px;}
.chart-cap{font-size:12px;color:${C.soft};margin-top:10px;}

/* Drawer / modal */
.ov{position:fixed;inset:0;background:rgba(20,24,48,.55);backdrop-filter:blur(2px);display:flex;justify-content:flex-end;z-index:50;animation:fade .2s;}
.drw{width:430px;max-width:94vw;height:100%;background:${C.appBg};overflow-y:auto;padding:22px;animation:slide .28s cubic-bezier(.2,.8,.2,1);}
.modal{margin:auto;width:520px;max-width:94vw;background:${C.appBg};border-radius:16px;padding:22px;animation:rise .25s;}
.drw-h{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
.drw-name{font-size:18px;font-weight:800;}
.close{background:${C.card};border:1px solid ${C.line2};width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:#fff;cursor:pointer;}
.drw-contact{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:${C.soft};background:${C.card};padding:7px 11px;border-radius:8px;margin-bottom:6px;}
.drw-sec{display:flex;align-items:center;gap:8px;font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:${C.orange};font-weight:800;margin:20px 0 9px;}
.drw-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.drw-grid div{background:${C.card};border-radius:10px;padding:10px 12px;}
.drw-grid span{display:block;font-size:11px;color:${C.soft};margin-bottom:3px;}
.drw-line{display:flex;justify-content:space-between;align-items:center;gap:10px;background:${C.card};border-radius:10px;padding:10px 12px;margin-bottom:7px;font-size:12.5px;}

/* Form */
.form{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.form label{display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:${C.soft};font-weight:600;}
.form input,.form select{background:${C.card};border:1px solid ${C.line2};border-radius:9px;padding:10px 12px;color:#fff;font-size:13px;outline:none;}
.form input:focus,.form select:focus{border-color:${C.orange};}

@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes slide{from{transform:translateX(40px);opacity:.5}to{transform:none;opacity:1}}
@keyframes rise{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}

@media(max-width:1100px){.kpis{grid-template-columns:1fr 1fr;}.dash-cols{grid-template-columns:1fr;}}
@media(max-width:760px){.side{display:none;}.main{padding:16px;}.ctrl-search{margin-left:0;}.ctrl-search input{width:150px;}
  .tbl{font-size:12px;}.tbl th,.tbl td{padding:8px;}}
`;
