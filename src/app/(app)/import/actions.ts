"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  parseNetworkSheet,
  type NormalizedMember,
  type RowResult,
} from "@/lib/import/network-import";
import type { ImportReport, ImportRowReport, ImportRowStatus } from "./types";

const WRITE_ROLES = ["ADMIN", "RH"] as const;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 Mo
const ACCEPTED_EXT = [".xlsx", ".xls", ".csv"];

function fail(error: string, fileName = "", committed = false): ImportReport {
  return {
    ok: false,
    error,
    committed,
    fileName,
    sheetName: null,
    totalRows: 0,
    created: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
    agenciesCreated: 0,
    rows: [],
  };
}

/** Convertit le classeur en cherchant la 1re feuille exploitable (en-têtes reconnus). */
function readWorkbook(buffer: Buffer): {
  sheetName: string;
  parsed: ReturnType<typeof parseNetworkSheet>;
} | null {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  // Priorise une feuille dont le nom évoque la liste réseau.
  const ordered = [...wb.SheetNames].sort((a, b) => {
    const score = (n: string) => (/(reseau|liste)/i.test(n) ? 0 : 1);
    return score(a) - score(b);
  });
  for (const name of ordered) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });
    const parsed = parseNetworkSheet(aoa);
    if (parsed.ok) return { sheetName: name, parsed };
  }
  return null;
}

/**
 * Espace import — analyse (dry-run) puis intégration du fichier « Liste du
 * Réseau » dans la base RH. Réservé aux rôles ADMIN/RH (cf. CLAUDE.md §4/§5).
 *
 * @param formData `file` (xlsx/xls/csv) + `commit` ("1" pour écrire en base).
 */
export async function runImport(formData: FormData): Promise<ImportReport> {
  const session = await auth();
  if (!session?.user) return fail("Non authentifié.");
  const { role, id: userId } = session.user;
  if (!WRITE_ROLES.includes(role as (typeof WRITE_ROLES)[number])) {
    return fail("Accès refusé : import réservé aux rôles RH/Admin.");
  }

  const file = formData.get("file");
  const commit = formData.get("commit") === "1";
  if (!(file instanceof File) || file.size === 0) {
    return fail("Aucun fichier fourni.");
  }
  const lowerName = file.name.toLowerCase();
  if (!ACCEPTED_EXT.some((ext) => lowerName.endsWith(ext))) {
    return fail("Format non supporté : utilisez un fichier .xlsx, .xls ou .csv.", file.name);
  }
  if (file.size > MAX_FILE_BYTES) {
    return fail("Fichier trop volumineux (max 8 Mo).", file.name);
  }

  let read: ReturnType<typeof readWorkbook>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    read = readWorkbook(buffer);
  } catch {
    return fail("Lecture du fichier impossible : format illisible ou corrompu.", file.name);
  }
  if (!read || !read.parsed.ok) {
    return fail(
      read?.parsed.ok === false
        ? read.parsed.error
        : "Aucune feuille exploitable trouvée dans le fichier.",
      file.name,
    );
  }

  const { sheetName, parsed } = read;
  const results = parsed.data.results;

  // Détection des doublons d'e-mail à l'intérieur du fichier (1re occurrence gardée).
  const seenEmails = new Set<string>();
  const importable: RowResult[] = [];
  const duplicates = new Set<number>();
  for (const r of results) {
    if (!r.ok || !r.member) continue;
    if (seenEmails.has(r.email)) {
      duplicates.add(r.rowNumber);
      continue;
    }
    seenEmails.add(r.email);
    importable.push(r);
  }

  // État en base : quels e-mails existent déjà (create vs update) ?
  const existingEmails = new Set<string>();
  if (importable.length > 0) {
    const found = await prisma.member.findMany({
      where: { email: { in: importable.map((r) => r.email) } },
      select: { email: true },
    });
    for (const m of found) existingEmails.add(m.email);
  }

  // Agences à créer (comparaison insensible à la casse / espaces).
  const distinctAgencies = new Map<string, string>(); // clé normalisée → libellé d'origine
  for (const r of importable) {
    const key = r.member!.agencyName.toLowerCase();
    if (!distinctAgencies.has(key)) distinctAgencies.set(key, r.member!.agencyName);
  }
  const existingAgencies = await prisma.agency.findMany({ select: { id: true, name: true } });
  const agencyIdByKey = new Map<string, string>();
  for (const a of existingAgencies) agencyIdByKey.set(a.name.toLowerCase(), a.id);
  const agenciesToCreate = [...distinctAgencies].filter(([key]) => !agencyIdByKey.has(key));

  // --- Construction du rapport (statut par ligne) ---
  const rows: ImportRowReport[] = results.map((r) => {
    let status: ImportRowStatus;
    let messages: string[];
    if (!r.ok) {
      status = "error";
      messages = r.errors;
    } else if (duplicates.has(r.rowNumber)) {
      status = "skip";
      messages = ["Doublon d'e-mail dans le fichier : ligne ignorée."];
    } else {
      status = existingEmails.has(r.email) ? "update" : "create";
      messages = r.warnings;
    }
    return {
      rowNumber: r.rowNumber,
      agencyName: r.agencyName,
      lastName: r.lastName,
      firstName: r.firstName,
      email: r.email,
      status,
      messages,
    };
  });

  const errorsCount = rows.filter((r) => r.status === "error").length;
  const skippedCount = rows.filter((r) => r.status === "skip").length;
  const createdCount = rows.filter((r) => r.status === "create").length;
  const updatedCount = rows.filter((r) => r.status === "update").length;

  const baseReport: ImportReport = {
    ok: true,
    committed: false,
    fileName: file.name,
    sheetName,
    totalRows: results.length,
    created: createdCount,
    updated: updatedCount,
    errors: errorsCount,
    skipped: skippedCount,
    agenciesCreated: agenciesToCreate.length,
    rows,
  };

  // Analyse seule : on s'arrête là.
  if (!commit) return baseReport;

  if (importable.length === 0) {
    return { ...baseReport, error: "Aucune ligne valide à importer.", ok: false };
  }

  // --- Intégration en base (transaction atomique) ---
  try {
    await prisma.$transaction(
      async (tx) => {
        // 1) Agences manquantes.
        for (const [key, label] of agenciesToCreate) {
          const agency = await tx.agency.create({
            data: { name: label, type: "FILIALE", status: "ACTIF" },
          });
          agencyIdByKey.set(key, agency.id);
        }
        // 2) Membres (+ inscription ORIAS) par upsert sur l'e-mail.
        for (const r of importable) {
          const m = r.member as NormalizedMember;
          const agencyId = agencyIdByKey.get(m.agencyName.toLowerCase());
          if (!agencyId) continue; // garde-fou (ne devrait pas arriver)

          const data = {
            civility: m.civility,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            phone: m.phone,
            contractType: m.contractType,
            functionTitle: m.functionTitle,
            functionSub: m.functionSub,
            network: m.network,
            status: m.status,
            agencyId,
            arrivalDate: m.arrivalDate,
            departureDate: m.departureDate,
          };
          const member = await tx.member.upsert({
            where: { email: m.email },
            update: data,
            create: data,
          });

          // Inscription ORIAS si numéro ou catégories présents.
          if (m.oriasNumber || m.oriasCategories.length > 0 || m.rcProPolicy) {
            await tx.oriasRegistration.upsert({
              where: { memberId: member.id },
              update: {
                oriasNumber: m.oriasNumber,
                categories: m.oriasCategories,
                rcProPolicy: m.rcProPolicy,
              },
              create: {
                memberId: member.id,
                oriasNumber: m.oriasNumber,
                categories: m.oriasCategories,
                rcProPolicy: m.rcProPolicy,
              },
            });
          }
        }
      },
      { maxWait: 20000, timeout: 120000 },
    );
  } catch (error) {
    console.error("Import échoué :", error);
    return fail(
      "Échec de l'intégration en base : aucune donnée n'a été modifiée.",
      file.name,
      false,
    );
  }

  await writeAudit({
    userId,
    action: "CREATE",
    entity: "Import",
    diff: {
      fileName: file.name,
      sheetName,
      created: createdCount,
      updated: updatedCount,
      agenciesCreated: agenciesToCreate.length,
      errors: errorsCount,
      skipped: skippedCount,
    },
  });

  revalidatePath("/employes");
  revalidatePath("/agences");
  revalidatePath("/");

  return { ...baseReport, committed: true };
}
