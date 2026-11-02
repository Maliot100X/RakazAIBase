import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

/** Password sign-in removed from UX; sign-in happens via Farcaster/wallet panels in-place. */
export default function LoginPage() {
  redirect("/vault");
}
