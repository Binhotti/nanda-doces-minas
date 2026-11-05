import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "nanda_admin";
const maxAge = 60 * 60 * 24 * 7;

function signature(value: string) {
  return createHmac("sha256", process.env.SESSION_SECRET || "").update(value).digest("hex");
}

export function credentialsConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}

export function passwordMatches(password: string) {
  if (!credentialsConfigured()) return false;
  const given = Buffer.from(password);
  const expected = Buffer.from(process.env.ADMIN_PASSWORD!);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function isAdmin() {
  if (!credentialsConfigured()) return false;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  const [timestamp, mac] = token.split(".");
  if (!timestamp || !mac || !/^\d+$/.test(timestamp)) return false;
  const age = Date.now() - Number(timestamp);
  if (age < 0 || age > maxAge * 1000) return false;
  const actual = Buffer.from(mac, "hex");
  const expected = Buffer.from(signature(timestamp), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function setAdminCookie() {
  const timestamp = String(Date.now());
  (await cookies()).set(cookieName, `${timestamp}.${signature(timestamp)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(cookieName);
}
