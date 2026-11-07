import { RoomScreen } from "@/components/room-screen";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getUser())) redirect("/login");
  const { id } = await params;
  return <RoomScreen roomId={id.toUpperCase()} />;
}
