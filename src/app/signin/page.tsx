import { redirect } from "next/navigation";
import { auth, githubEnabled } from "@/auth";
import { SignInPanel } from "@/components/SignInPanel";

// Server component: if already signed in, skip straight to the app. Otherwise
// render the sign-in panel (guest one-click; GitHub only when configured).
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  const { from } = await searchParams;
  const callbackUrl = from && from.startsWith("/") ? from : "/";
  if (session) redirect(callbackUrl);

  return <SignInPanel githubEnabled={githubEnabled} callbackUrl={callbackUrl} />;
}
