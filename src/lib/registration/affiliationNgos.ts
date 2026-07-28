import type { NGORegistration } from "@/types/registration";

export type AffiliationNgoOption = {
  id: string;
  name: string;
};

export type AffiliationDirectoryNgo = {
  id: string;
  name: string;
};

/**
 * Options for volunteer NGO affiliation autocomplete.
 * Prefers directory profiles; merges approved NGO registrations by name.
 */
export function listAffiliationNgoOptions(
  approvedRegistrations: NGORegistration[] = [],
  directoryProfiles: AffiliationDirectoryNgo[] = [],
): AffiliationNgoOption[] {
  const byName = new Map<string, AffiliationNgoOption>();

  for (const ngo of directoryProfiles) {
    const key = ngo.name.trim().toLowerCase();
    if (!key) continue;
    byName.set(key, {
      id: ngo.id,
      name: ngo.name,
    });
  }

  for (const reg of approvedRegistrations) {
    const key = reg.organizationLegalName.trim().toLowerCase();
    if (!key || byName.has(key)) continue;
    byName.set(key, {
      id: reg.ngoId,
      name: reg.organizationLegalName,
    });
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function filterAffiliationNgoOptions(
  options: AffiliationNgoOption[],
  query: string,
  limit = 8,
): AffiliationNgoOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return options.slice(0, limit);
  return options
    .filter((option) => option.name.toLowerCase().includes(needle))
    .slice(0, limit);
}
