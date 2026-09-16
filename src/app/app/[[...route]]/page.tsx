import { redirect } from 'next/navigation';
import { V5OrganizerHome } from '@/components/v5/app/V5OrganizerHome';
import { V5PlayerHome } from '@/components/v5/app/V5PlayerHome';
import { V5WorkspaceRoute } from '@/components/v5/app/V5WorkspaceRoute';
import { isV5WorkspaceKind } from '@/components/v5/app/v5-workspaces';

export default async function AppWorkspacePage({
  params,
}: {
  params: Promise<{ route?: string[] }>;
}) {
  const { route = [] } = await params;
  const [workspaceValue, ...sectionParts] = route;

  if (!workspaceValue) {
    redirect('/app/player');
  }

  if (!isV5WorkspaceKind(workspaceValue)) {
    redirect('/app/player');
  }

  if (workspaceValue === 'player' && sectionParts.length === 0) {
    return <V5PlayerHome />;
  }

  if (workspaceValue === 'organizer' && sectionParts.length === 0) {
    return <V5OrganizerHome />;
  }

  return <V5WorkspaceRoute workspace={workspaceValue} section={sectionParts.join('/')} />;
}
