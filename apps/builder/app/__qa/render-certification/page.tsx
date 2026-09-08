import { notFound } from "next/navigation";
import RenderCertificationHarness from "./render-certification-harness";

export default function RenderCertificationPage() {
  if (process.env.MICIRQL_QA_RENDER_CERTIFIER !== "1") notFound();
  return <RenderCertificationHarness />;
}
