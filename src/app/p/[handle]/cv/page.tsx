import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { PassportResumeView } from "@/components/PassportResumeView";
import { capturePassportProductEvent } from "@/lib/passport-analytics";
import {
  capturePassportRouteDiagnostic,
  startPassportRouteTimer,
} from "@/lib/passport-diagnostics";
import { normalizePassportUsername } from "@/lib/passport";
import { getPassportCompetitiveResume } from "@/lib/passport-resume";

export const dynamic = "force-dynamic";
export default async function GamerCvPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const elapsedMs = startPassportRouteTimer();
  const handle = decodeURIComponent((await params).handle);
  const username = handle.startsWith("@")
    ? normalizePassportUsername(handle)
    : "";
  const resume = username ? await getPassportCompetitiveResume(username) : null;
  if (!resume) notFound();
  const requestHeaders = await headers();
  const requestSeed =
    requestHeaders.get("x-request-id") ??
    requestHeaders.get("x-vercel-id") ??
    randomUUID();
  after(() =>
    capturePassportProductEvent({
      event: "passport_cv_viewed",
      actorKind: "anonymous",
      source: "page.passport.cv",
      properties: { surface: "public_cv" },
      dedupeSeed: requestSeed,
    }),
  );
  after(() =>
    capturePassportRouteDiagnostic({
      routeName: "passport_cv_page",
      requestId: requestSeed,
      operation: "render",
      responseStatus: 200,
      durationMs: elapsedMs(),
      resultClass: "success",
      cacheState: "private_no_store",
    }),
  );
  return (
    <div className="min-h-screen bg-[#071018] text-white">
      <PassportResumeView resume={resume} />
    </div>
  );
}
