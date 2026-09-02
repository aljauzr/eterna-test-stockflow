import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_KEY } from "../lib/auth-session";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has(AUTH_COOKIE_KEY);

  redirect(hasSession ? "/dashboard" : "/login");
}
