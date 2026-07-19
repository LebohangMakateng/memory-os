import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";

const cookieName = "execution-os-session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession() {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not configured.");
  const token = await new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function hasSession() {
  if (process.env.NODE_ENV !== "production" && !process.env.APP_PASSWORD_HASH) return true;
  if (!process.env.SESSION_SECRET) return false;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function requireSession() {
  if (!(await hasSession())) redirect("/login");
}
