export type ActivePassportViewer = {
  id: string;
};

export type PassportViewerAccess = {
  credential_presented: boolean;
  viewer_id: string | null;
  blocked: boolean;
  friend_view: boolean;
};

type PassportViewerAccessDependencies = {
  getActiveViewer: () => Promise<ActivePassportViewer | null>;
  hasBlock: (viewerId: string, targetId: string) => Promise<boolean>;
  areFriends: (viewerId: string, targetId: string) => Promise<boolean>;
};

export async function resolvePassportViewerAccess(
  targetId: string,
  credentialPresented: boolean,
  dependencies: PassportViewerAccessDependencies
): Promise<PassportViewerAccess> {
  const viewer = await dependencies.getActiveViewer();
  if (!viewer) {
    return {
      credential_presented: credentialPresented,
      viewer_id: null,
      blocked: false,
      friend_view: false,
    };
  }

  if (viewer.id === targetId) {
    return {
      credential_presented: credentialPresented,
      viewer_id: viewer.id,
      blocked: false,
      friend_view: false,
    };
  }

  if (await dependencies.hasBlock(viewer.id, targetId)) {
    return {
      credential_presented: credentialPresented,
      viewer_id: viewer.id,
      blocked: true,
      friend_view: false,
    };
  }

  return {
    credential_presented: credentialPresented,
    viewer_id: viewer.id,
    blocked: false,
    friend_view: await dependencies.areFriends(viewer.id, targetId),
  };
}
