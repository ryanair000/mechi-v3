import { after } from "next/server";
import { buildGamerCvPdf } from "@/lib/passport-cv-pdf";
import {
  capturePassportProductEvent,
  passportAnalyticsRequestSeed,
} from "@/lib/passport-analytics";
import {
  capturePassportRouteDiagnostic,
  passportResultClass,
} from "@/lib/passport-diagnostics";
import { getPassportCompetitiveResume } from "@/lib/passport-resume";
import { normalizePassportUsername } from "@/lib/passport";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const startedAt = Date.now();
  const requestSeed = passportAnalyticsRequestSeed(request);
  const username = normalizePassportUsername((await params).username);
  const resume = await getPassportCompetitiveResume(username);
  if (!resume) {
    after(() =>
      capturePassportRouteDiagnostic({
        routeName: "passport_cv_pdf",
        requestId: requestSeed,
        operation: "pdf",
        responseStatus: 404,
        durationMs: Date.now() - startedAt,
        resultClass: "not_found",
        cacheState: "private_no_store",
      }),
    );
    return Response.json({ error: "Gamer CV not found" }, { status: 404 });
  }
  const pdf = buildGamerCvPdf(resume, new URL(request.url).origin);
  after(() =>
    capturePassportProductEvent({
      event: "passport_cv_downloaded",
      actorKind: "anonymous",
      source: "api.passport.cv.pdf",
      properties: { format: "pdf" },
      dedupeSeed: requestSeed,
    }),
  );
  const response = new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resume.identity.username}-gamer-cv.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
  after(() =>
    capturePassportRouteDiagnostic({
      routeName: "passport_cv_pdf",
      requestId: requestSeed,
      operation: "pdf",
      responseStatus: response.status,
      durationMs: Date.now() - startedAt,
      resultClass: passportResultClass(response.status),
      cacheState: "private_no_store",
    }),
  );
  return response;
}
