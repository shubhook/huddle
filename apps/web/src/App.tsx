import { useEffect, useMemo, useState } from "react";

import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { InviteLinkPanel } from "@/components/workspace/InviteLinkPanel";
import { JoinWorkspaceScreen } from "@/components/workspace/JoinWorkspaceScreen";
import { navigateTo, useHashRoute } from "@/lib/hashRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { LandingPage } from "@/pages/LandingPage";
import { SigninPage } from "@/pages/SigninPage";
import { SignupPage } from "@/pages/SignupPage";
import "./index.css";
import {
  createInvite,
  createWorkspace,
  type CurrentUser,
  getCurrentUser,
  joinWorkspace,
  logout,
  signin,
  signup,
} from "./lib/api";

export function App() {
  const route = useHashRoute();
  const [workspaceName, setWorkspaceName] = useState("core-infrastructure");
  const [workspaceId, setWorkspaceId] = useState("");
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

  useEffect(() => {
    if (route === "/app" && sessionChecked && !currentUser) {
      navigateTo("/signin");
    }
  }, [route, sessionChecked, currentUser]);

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
          } catch {
            setSignupError(
              "Could not create account. Email may already be in use.",
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
          } catch {
            setSigninError("Invalid email or password");
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
          setWorkspaceId(joinedWorkspaceId);
          navigateTo("/app");
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
          workspaceName={workspaceName}
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
            setWorkspaceId(newWorkspaceId);
            setInviteToken(token);
            setWorkspaceStep("invite");
          }}
        />
        {workspaceStep === "invite" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/20 p-4 backdrop-blur-[2px]">
            <InviteLinkPanel
              workspaceName={workspaceName}
              inviteUrl={inviteUrl}
              onContinue={() => {
                setWorkspaceStep(null);
                navigateTo("/app");
              }}
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
              setWorkspaceId(newWorkspaceId);
              setInviteToken(token);
              setWorkspaceStep("invite");
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
