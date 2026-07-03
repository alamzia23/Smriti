import { auth } from "@/auth";
import { Dashboard } from "@/components/Dashboard";

export default async function Home() {
  const session = await auth();
  const user = {
    name: session?.user?.name ?? "Guest",
    role: session?.user?.role ?? "guest",
  };
  return <Dashboard user={user} />;
}
