import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { AppRole } from "./session";

/**
 * Session de test locale — active UNIQUEMENT si ENABLE_DEV_AUTH=1.
 *
 * Sert à tester l'app avec une vraie base (Neon, voir PROGRESS.md) avant
 * qu'un vrai fournisseur d'auth (Supabase ou alternative) soit branché.
 * Aucune vérification de mot de passe : un cookie signé désigne un
 * utilisateur déjà seedé en base. À supprimer dès qu'une vraie auth est
 * en place — ne doit jamais être activable en dehors du développement
 * local (getSession() ignore ce mécanisme si la variable est absente).
 */

const COOKIE_NAME = "kerf_dev_session";

export interface DevSessionPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: AppRole;
}

function secret(): string {
  const s = process.env.DEV_SESSION_SECRET;
  if (!s) throw new Error("DEV_SESSION_SECRET manquant — voir .env.local");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function setDevSession(payload: DevSessionPayload) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(value);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${value}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearDevSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getDevSession(): Promise<DevSessionPayload | null> {
  if (process.env.ENABLE_DEV_AUTH !== "1") return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [value, signature] = raw.split(".");
  if (!value || !signature) return null;

  const expected = sign(value);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf-8")) as DevSessionPayload;
  } catch {
    return null;
  }
}
