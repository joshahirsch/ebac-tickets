import { redirect } from "next/navigation";

// Settings landing → default to the Projects tab. The layout enforces access.
export default function SettingsPage() {
  redirect("/settings/projects");
}
