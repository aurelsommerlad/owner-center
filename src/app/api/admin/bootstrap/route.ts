import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { bootstrapInitialAdmin } from "@/server/adminBootstrapCore";

/**
 * Token-gated, one-time admin bootstrap endpoint - the "no terminal needed"
 * path for creating the very first admin account, e.g. on Vercel: visit
 * this URL once (with the correct `token`) from any browser, no repo
 * clone, no CLI, no local database access required. The equivalent
 * terminal-based path is `npm run seed:admin` (prisma/seedAdmin.ts); both
 * share the same idempotent core logic in
 * src/server/adminBootstrapCore.ts and can never create a second admin
 * between them.
 *
 * GET (not a form/mutation-only POST) is deliberate here: the whole point
 * is that pasting a URL into a browser address bar is enough - no HTTP
 * client, no request body. This is safe specifically because the action is
 * idempotent (repeat visits after the first do nothing) and the only
 * credentials it can ever create are the ones already sitting in
 * INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD on the server - a caller who
 * merely knows this URL's token can trigger that creation but can never
 * choose or learn the resulting password.
 *
 * Never accepts email/password from the request itself - only from
 * process.env, which the client never sees. The response never echoes the
 * password back.
 */

function timingSafeTokenEquals(a: string, b: string): boolean {
  const bufA = createHash("sha256").update(a).digest();
  const bufB = createHash("sha256").update(b).digest();
  return timingSafeEqual(bufA, bufB);
}

export async function GET(request: NextRequest) {
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expectedToken) {
    // Indistinguishable from a route that doesn't exist - same reasoning as
    // requireAdminRole()'s notFound() for a non-admin session.
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const suppliedToken = request.nextUrl.searchParams.get("token");
  if (!suppliedToken || !timingSafeTokenEquals(suppliedToken, expectedToken)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const result = await bootstrapInitialAdmin(prisma);

  const status = result.ok ? 200 : result.status === "already_exists" ? 409 : 500;
  return NextResponse.json(result, { status });
}
