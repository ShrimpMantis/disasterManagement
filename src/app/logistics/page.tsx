import { redirect } from "next/navigation";

/** Legacy route — unified module lives at `/transport`. */
export default function LogisticsRedirectPage() {
  redirect("/transport");
}
