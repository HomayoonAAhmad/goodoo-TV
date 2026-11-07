import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { ProfileScreen } from "@/components/profile-screen";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <ProfileScreen
      initial={{
        firstName: user.firstName || user.name || "",
        lastName: user.lastName || "",
        username: user.username || "",
        avatar: user.avatar || "",
      }}
      phone={user.phone || "—"}
    />
  );
}
