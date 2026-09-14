import "server-only";
import { headers } from "next/headers";

/**
 * The app's own public origin (no trailing slash), e.g.
 * "https://owners.unique-places.com" - the one place any absolute URL
 * (currently: invitation links) is built, so it's never guessed twice in
 * two different ways.
 *
 * `APP_URL` wins when set - only ever set for the Vercel Production
 * environment (see .env.example): the production domain is contractual,
 * not something to infer from a request that might arrive through a
 * proxy/CDN with a rewritten Host header.
 *
 * Everywhere else (Preview deployments, local dev, or Production without
 * APP_URL configured) falls back to the incoming request's own Host header -
 * exactly what a Preview deployment's unique *.vercel.app URL or a local
 * `next dev`/`next start` needs, with no extra configuration. This is a
 * server-side equivalent of the previous client-side
 * `window.location.origin` approach - just resolved once, centrally, so
 * both the Owner Center and Admin invite flows agree.
 */
export async function getAppUrl(): Promise<string> {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = headerList.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
