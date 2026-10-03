import { useEffect, useMemo, useState } from "react";

import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { InviteLinkPanel } from "@/components/workspace/InviteLinkPanel";
import { JoinWorkspaceScreen } from "@/components/workspace/JoinWorkspaceScreen";
import {
  navigateTo,
  useHashRoute,
  useHashWorkspaceId,
} from "@/lib/hashRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { LandingPage } from "@/pages/LandingPage";
import { SigninPage } from "@/pages/SigninPage";
import { SignupPage } from "@/pages/SignupPage";
import "./index.css";
import {
  createInvite,
  createWorkspace,
  type CurrentUser,
  getApiErrorMessage,
  getCurrentUser,
  joinWorkspace,
  listWorkspaces,
  logout,
  signin,
  signup,
  type WorkspaceSummary,
} from "./lib/api";
import { onSessionEnded } from "./lib/ws";

export function App() {
  const route = useHashRoute();
  const workspaceId = useHashWorkspaceId();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [inviteToken, setInviteToken] = useState("");
  const [workspaceStep, setWorkspaceStep] = useState<"create" | "invite" | null>(
    null,
  );
  const [signinError, setSigninError] = useState<string | undefined>();
  const [signupError, setSignupError] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const inviteUrl = useMemo(() => {
    const origin =
      typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/#/join/${inviteToken}`;
  }, [inviteToken]);

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setSessionChecked(true));
  }, []);

  // The server ends a socket when its session expires or the user signs out
  // elsewhere. Dropping the user here sends them to sign-in via the effect below.
  useEffect(() => onSessionEnded(() => setCurrentUser(null)), []);

  useEffect(() => {
    if (route === "/app" && sessionChecked && !currentUser) {
      navigateTo("/signin");
    }
  }, [route, sessionChecked, currentUser]);

  // The URL carries the workspace id (#/app/<id>) so a refresh keeps it. When it
  // is missing or not one of the user's workspaces, fall back to their first
  // one, or to workspace creation if they have none.
  useEffect(() => {
    if (route !== "/app" || !currentUser) return;
    let cancelled = false;

    listWorkspaces()
      .then((list) => {
        if (cancelled) return;
        setWorkspaces(list);
        if (list.some((workspace) => workspace.id === workspaceId)) return;

        const fallback = list[0];
        if (fallback) {
          navigateTo("/app", { workspaceId: fallback.id, replace: true });
        } else {
          navigateTo("/workspace/create", { replace: true });
        }
      })
      .catch(() => {
        // Leave the dashboard empty. A 401 is handled by the session check.
      });

    return () => {
      cancelled = true;
    };
  }, [route, currentUser, workspaceId]);

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );

  if (route === "/signup") {
    return (
      <SignupPage
        onSignIn={() => navigateTo("/signin")}
        error={signupError}
        onSubmit={async (values) => {
          try {
            await signup(values.username, values.email, values.password);
            setCurrentUser(await getCurrentUser());
            navigateTo("/workspace/create");
          } catch (error) {
            setSignupError(
              getApiErrorMessage(
                error,
                "Could not create account. Email may already be in use.",
              ),
            );
          }
        }}
      />
    );
  }

  if (route === "/signin") {
    return (
      <SigninPage
        onSignUp={() => navigateTo("/signup")}
        error={signinError}
        onSubmit={async (values) => {
          try {
            await signin(values.email, values.password);
            setCurrentUser(await getCurrentUser());
            navigateTo("/app");
          } catch (error) {
            setSigninError(
              getApiErrorMessage(error, "Invalid email or password"),
            );
          }
        }}
      />
    );
  }

  if (route === "/join") {
    return (
      <JoinWorkspaceScreen
        onSignIn={() => navigateTo("/signin")}
        onSubmit={async (inviteCode) => {
          const { workspaceId: joinedWorkspaceId } =
            await joinWorkspace(inviteCode);
          navigateTo("/app", { workspaceId: joinedWorkspaceId });
        }}
      />
    );
  }

  if (route === "/app") {
    if (!sessionChecked || !currentUser) return null;

    return (
      <>
        <DashboardPage
          username={currentUser.username}
          workspaceName={activeWorkspace?.name ?? ""}
          workspaceId={workspaceId}
          onLogout={async () => {
            await logout();
            setCurrentUser(null);
            navigateTo("/signin");
          }}
          onWorkspaceClick={() => setWorkspaceStep("create")}
        />
        <CreateWorkspaceModal
          open={workspaceStep === "create"}
          step={1}
          onClose={() => setWorkspaceStep(null)}
          onContinue={async ({ workspaceName: name }) => {
            const { workspaceId: newWorkspaceId } = await createWorkspace(name);
            const { token } = await createInvite(newWorkspaceId);
            setWorkspaceName(name);
            setInviteToken(token);
            setWorkspaceStep("invite");
            navigateTo("/app", { workspaceId: newWorkspaceId });
          }}
        />
        {workspaceStep === "invite" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/20 p-4 backdrop-blur-[2px]">
            <InviteLinkPanel
              workspaceName={workspaceName}
              inviteUrl={inviteUrl}
              onContinue={() => setWorkspaceStep(null)}
            />
          </div>
        )}
      </>
    );
  }

  if (route === "/workspace/create") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        {workspaceStep === "invite" ? (
          <InviteLinkPanel
            workspaceName={workspaceName}
            inviteUrl={inviteUrl}
            onContinue={() => navigateTo("/app")}
          />
        ) : (
          <CreateWorkspaceModal
            open
            step={1}
            onContinue={async ({ workspaceName: name }) => {
              const { workspaceId: newWorkspaceId } =
                await createWorkspace(name);
              const { token } = await createInvite(newWorkspaceId);
              setWorkspaceName(name);
              setInviteToken(token);
              setWorkspaceStep("invite");
              navigateTo("/app", { workspaceId: newWorkspaceId });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <LandingPage
      onSignIn={() => navigateTo("/signin")}
      onGetStarted={() => navigateTo("/signup")}
      onQuickStart={() => navigateTo("/signup")}
    />
  );
}

export default App;
