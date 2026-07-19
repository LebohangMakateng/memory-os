"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth/session";

export async function login(formData: FormData) {
  const password = formData.get("password");
  const hash = process.env.APP_PASSWORD_HASH;
  if (typeof password !== "string" || !hash || !(await bcrypt.compare(password, hash))) {
    redirect("/login?error=invalid");
  }
  await createSession();
  redirect("/");
}
