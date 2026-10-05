import { initials } from "@/components/app/format";
import { Icon } from "@/components/ui/Icon";

interface WorkspaceRailProps {
  workspaces: { id: string; name: string }[];
  activeId?: string;
  profileOpen?: boolean;
  onSelect?: (workspaceId: string) => void;
  onCreate?: () => void;
  onProfile?: () => void;
}

export function WorkspaceRail({
  workspaces,
  activeId,
  profileOpen,
  onSelect,
  onCreate,
  onProfile,
}: WorkspaceRailProps) {
  return (
    <nav className="rail" aria-label="Workspaces">
      {workspaces.map((workspace) => (
        <button
          key={workspace.id}
          type="button"
          className={workspace.id === activeId ? "rail__ws is-active" : "rail__ws"}
          title={workspace.name}
          aria-label={workspace.name}
          aria-current={workspace.id === activeId ? "true" : undefined}
          onClick={() => onSelect?.(workspace.id)}
        >
          {initials(workspace.name)}
        </button>
      ))}
      <button
        type="button"
        className="rail__ws rail__ws--add"
        title="Create a workspace"
        aria-label="Create a workspace"
        onClick={onCreate}
      >
        <Icon name="plus" />
      </button>
      <div className="rail__spacer" />
      <button
        type="button"
        className={profileOpen ? "rail__ws rail__ws--icon is-on" : "rail__ws rail__ws--icon"}
        title="Profile"
        aria-label="Profile"
        onClick={onProfile}
      >
        <Icon name="settings" />
      </button>
    </nav>
  );
}
