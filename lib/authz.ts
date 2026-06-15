import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export type Principal = {
  email: string;
  role: UserRole;
  schoolId: string;
  isSuperAdmin: boolean;
};

export type AuthzResult = {
  ok: boolean;
  principal?: Principal;
  response?: NextResponse;
};

export type SchoolAccessResult = {
  ok: boolean;
  principal?: Principal;
  schoolId?: string;
  response?: NextResponse;
};

export type RecordAccessResult<T extends { schoolId: string }> = {
  ok: boolean;
  principal?: Principal;
  record?: T;
  response?: NextResponse;
};

export function normalizeSchoolId(input: unknown) {
  return String(input ?? "").trim();
}

export function authzError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function getPrincipal(): Promise<Principal | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;

  const [user, superAdmin] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.superAdmin.findUnique({ where: { email } }),
  ]);

  if (!user && !superAdmin) return null;

  const role =
    user?.role ??
    (superAdmin ? UserRole.SUPERADMIN : UserRole.SCHOOL_ADMIN);
  const schoolId =
    normalizeSchoolId(user?.schoolId) ||
    normalizeSchoolId(superAdmin?.schoolId) ||
    normalizeSchoolId((session.user as any)?.schoolId);

  return {
    email,
    role,
    schoolId,
    isSuperAdmin: role === UserRole.SUPERADMIN || Boolean(superAdmin),
  };
}

export async function requireAuthenticated(): Promise<AuthzResult> {
  const principal = await getPrincipal();
  if (!principal) {
    return { ok: false, response: authzError("Unauthorized", 401) };
  }
  return { ok: true, principal };
}

export async function requireSuperAdmin(): Promise<AuthzResult> {
  const auth = await requireAuthenticated();
  if (!auth.ok) return auth;
  if (!auth.principal.isSuperAdmin) {
    return { ok: false, response: authzError("Forbidden", 403) };
  }
  return auth;
}

export function canAccessSchool(principal: Principal, schoolId: string) {
  return principal.isSuperAdmin || principal.schoolId === schoolId;
}

export async function getAccessiblePageSchoolId(
  requestedSchoolId: unknown,
): Promise<string> {
  const principal = await getPrincipal();
  if (!principal) return "";

  const requested = normalizeSchoolId(requestedSchoolId);
  if (!requested) return principal.schoolId;
  return canAccessSchool(principal, requested) ? requested : "";
}

export async function requireSchoolAccess(
  requestedSchoolId: unknown,
): Promise<AuthzResult> {
  const auth = await requireAuthenticated();
  if (!auth.ok) return auth;

  const schoolId = normalizeSchoolId(requestedSchoolId);
  if (!schoolId) {
    return { ok: false, response: authzError("schoolId が必要です", 400) };
  }

  if (!canAccessSchool(auth.principal, schoolId)) {
    return { ok: false, response: authzError("Forbidden", 403) };
  }

  return auth;
}

export async function resolveAccessibleSchool(
  requestedSchoolId: unknown,
): Promise<SchoolAccessResult> {
  const auth = await requireAuthenticated();
  if (!auth.ok) return auth;

  const requested = normalizeSchoolId(requestedSchoolId);
  const schoolId = requested || auth.principal.schoolId;

  if (!schoolId) {
    return { ok: false, response: authzError("schoolId が必要です", 400) };
  }

  if (!canAccessSchool(auth.principal, schoolId)) {
    return { ok: false, response: authzError("Forbidden", 403) };
  }

  return { ok: true, principal: auth.principal, schoolId };
}

export async function requireRecordSchoolAccess<T extends { schoolId: string }>(
  loadRecord: () => Promise<T | null>,
  notFoundMessage = "Not found",
): Promise<RecordAccessResult<T>> {
  const auth = await requireAuthenticated();
  if (!auth.ok) return auth;

  const record = await loadRecord();
  if (!record) {
    return { ok: false, response: authzError(notFoundMessage, 404) };
  }

  if (!canAccessSchool(auth.principal, record.schoolId)) {
    return { ok: false, response: authzError("Forbidden", 403) };
  }

  return { ok: true, principal: auth.principal, record };
}
