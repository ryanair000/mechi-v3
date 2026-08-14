import { after, NextRequest } from "next/server";
import { getPassportData, normalizePassportUsername } from "@/lib/passport";
import {
  capturePassportProductEvent,
  passportAnalyticsRequestSeed,
} from "@/lib/passport-analytics";
import {
  capturePassportRouteDiagnostic,
  passportResultClass,
} from "@/lib/passport-diagnostics";
import { getPassportCardPresentation } from "@/lib/passport-card-data";
import { createPassportCardResponse } from "@/lib/passport-card-response";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: rawUsername } = await params;
  const requestSeed = passportAnalyticsRequestSeed(request);
  const startedAt = Date.now();
  let diagnosticSubjectId: string | null = null;
  const response = await createPassportCardResponse(
    request,
    normalizePassportUsername(rawUsername),
    {
      loadPassport: getPassportData,
      loadPresentation: getPassportCardPresentation,
      captureGenerated: (event) => {
        diagnosticSubjectId = event.subjectUserId;
        after(() =>
          capturePassportProductEvent({
            event: "passport_card_generated",
            subjectUserId: event.subjectUserId,
            actorKind: "anonymous",
            source: "api.passport.cards",
            properties: {
              format: event.format,
              delivery: event.delivery,
              render_state: event.renderState,
            },
            dedupeSeed: requestSeed,
          }),
        );
      },
    },
  );
  const state = response.headers.get("x-passport-card-state");
  after(() =>
    capturePassportRouteDiagnostic({
      routeName: "passport_card",
      requestId: requestSeed,
      subjectId: diagnosticSubjectId,
      operation: request.nextUrl.searchParams.get("format") ?? "horizontal",
      responseStatus: response.status,
      durationMs: Date.now() - startedAt,
      resultClass: passportResultClass(response.status, state),
      cacheState: state,
    }),
  );
  return response;
}
