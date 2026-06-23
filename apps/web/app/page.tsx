import { redirect } from "next/navigation";

// The coach product currently has a single surface: the dashboard.
// Later, this root can become a team picker / marketing landing page.
export default function Home() {
  redirect("/dashboard");
}
