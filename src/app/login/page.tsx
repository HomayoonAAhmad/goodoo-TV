import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginScreen } from "@/components/login-screen";

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return <LoginScreen />;
}
