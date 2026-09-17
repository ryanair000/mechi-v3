import { after, NextRequest, NextResponse } from "next/server";
import { getPassportData, normalizePassportUsername } from "@/lib/passport";
import {
  capturePassportProductEvent,
  passportAnalyticsRequestSeed,
} from "@/lib/passport-analytics";
import {
  capturePassportRouteDiagnostic,
  passportDiagnosticRequestId,
  passportResultClass,
  type PassportRouteResultClass,
} from "@/lib/passport-diagnostics";
import { resolvePassportRequestViewerAccess } from "@/lib/passport-viewer-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const startedAt = Date.now();
  const diagnosticRequestId = passportDiagnosticRequestId(request);
  const diagnostic = (
    response: NextResponse,
    resultClass?: PassportRouteResultClass,
    subjectId?: string | null,
  ) => {
    after(() =>
      capturePassportRouteDiagnostic({
        routeName: "passport_public_api",
        requestId: diagnosticRequestId,
        subjectId,
        operation: "public_projection",
        responseStatus: response.status,
        durationMs: Date.now() - startedAt,
        resultClass: resultClass ?? passportResultClass(response.status),
        cacheState: response.headers.get("cache-control")?.includes("private")
          ? "private_no_store"
          : "public_revalidate",
      }),
    );
    return response;
  };
  const { username } = await params;
  const normalizedUsername = normalizePassportUsername(username);
  if (!normalizedUsername) {
    return diagnostic(
      NextResponse.json(
        { error: "Invalid Gamer Passport username" },
        { status: 400 },
      ),
      "invalid",
    );
  }

  let passport = await getPassportData(normalizedUsername);
  if (!passport) {
    return diagnostic(
      NextResponse.json({ error: "Gamer Passport not found" }, { status: 404 }),
      "not_found",
    );
  }
  const viewerAccess = await resolvePassportRequestViewerAccess(
    request,
    passport.identity.user_id,
  );
  if (viewerAccess.blocked) {
    return diagnostic(
      NextResponse.json({ error: "Gamer Passport not found" }, { status: 404 }),
      "restricted",
      passport.identity.user_id,
    );
  }
  if (viewerAccess.friend_view) {
    passport = await getPassportData(normalizedUsername, { friendView: true });
  }
  if (!passport)
    return diagnostic(
      NextResponse.json({ error: "Gamer Passport not found" }, { status: 404 }),
      "not_found",
    );

  const requestSeed = passportAnalyticsRequestSeed(request);
  after(() =>
    capturePassportProductEvent({
      event: "passport_public_viewed",
      subjectUserId: passport!.identity.user_id,
      actorKind: viewerAccess.friend_view
        ? "friend"
        : viewerAccess.viewer_id
          ? "member"
          : "anonymous",
      source: "api.passport.public",
      properties: {
        access: passport!.access,
        viewer_kind: viewerAccess.friend_view
          ? "friend"
          : viewerAccess.viewer_id
            ? "member"
            : "anonymous",
      },
      dedupeSeed: requestSeed,
    }),
  );

  return diagnostic(
    NextResponse.json(
      { passport },
      {
        headers: {
          "Cache-Control": viewerAccess.credential_presented
            ? "private, no-store"
            : "public, max-age=0, must-revalidate",
        },
      },
    ),
    undefined,
    passport.identity.user_id,
  );
}
