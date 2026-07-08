import { redirect } from "next/navigation";

// The app is dashboard-first; middleware handles the auth gate.
export default function RootPage() {
  redirect("/dashboard");
}
