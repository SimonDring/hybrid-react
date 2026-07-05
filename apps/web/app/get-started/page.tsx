import { Suspense } from "react";
import { TeamSetup } from "@/components/dashboard/TeamSetup";

/* Coach team setup — found a team + share its join code. Sits OUTSIDE the
   /dashboard coach-gate (a new coach isn't a coach until they found a team);
   the proxy still requires a signed-in session to reach it. */
export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-canvas px-4 py-12">
      <Suspense fallback={null}>
        <TeamSetup />
      </Suspense>
    </div>
  );
}
