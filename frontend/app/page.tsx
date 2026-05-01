import { getCurrentUser } from "@/lib/actions/auth";
import LandingPage from "./_components/landing/LandingPage";

export default async function Home() {
  const user = await getCurrentUser();
  return <LandingPage user={user} />;
}
