import { HomeScreen } from "@/components/home-screen";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <HomeScreen
      name={user.firstName || user.name || user.username || "دوست من"}
      avatar={user.avatar || ""}
    />
  );
}
