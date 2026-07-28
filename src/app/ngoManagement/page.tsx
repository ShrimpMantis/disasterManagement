import { redirect } from "next/navigation";

/** Legacy route — redirect to the unified relief coordination workspace. */
export default function NGOManagementRedirectPage() {
  redirect("/relief-coordination?tab=directory");
}
