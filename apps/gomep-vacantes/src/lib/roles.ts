export type AccountRole = "docente" | "admin";

export function parseAdminEmails(list: string | undefined): Set<string> {
  return new Set(
    (list ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function roleForEmail(
  email: string | undefined,
  adminEmails: string | undefined,
): AccountRole {
  if (!email) return "docente";
  return parseAdminEmails(adminEmails).has(email.trim().toLowerCase())
    ? "admin"
    : "docente";
}

export function wouldRemoveLastAdmin(
  adminUids: string[],
  targetUid: string,
  nextRole: AccountRole,
): boolean {
  if (nextRole !== "docente") return false;
  if (!adminUids.includes(targetUid)) return false;
  return adminUids.filter((uid) => uid !== targetUid).length === 0;
}

export const LAST_ADMIN_ERROR = "No se puede quitar al último admin";
