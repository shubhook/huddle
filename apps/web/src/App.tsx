import { useMemo, useState } from "react";

import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { InviteLinkPanel } from "@/components/workspace/InviteLinkPanel";
import { JoinWorkspaceScreen } from "@/components/workspace/JoinWorkspaceScreen";
import { navigateTo, useHashRoute } from "@/lib/hashRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { LandingPage } from "@/pages/LandingPage";
import { SigninPage } from "@/pages/SigninPage";
import { SignupPage } from "@/pages/SignupPage";
import "./index.css";
import { signin } from "./lib/api";

export function App() {
  const route = useHashRoute();
  const [workspaceName, setWorkspaceName] = useState("core-infrastructure");
  const [workspaceStep, setWorkspaceStep] = useState<"create" | "invite" | null>(null,);
  const [signinError, setSigninError] = useState<string | undefined>();

  const inviteUrl = useMemo(
    () => `https://huddle.app/join/${workspaceName}`,
    [workspaceName],
  );

  if (route === "/signup") {
    return (
      <SignupPage
        onSignIn={() => navigateTo("/signin")}
        onSubmit={async (values) => {
          console.log("signup", values);
          navigateTo("/workspace/create");
        }}
      />
    );
  }

  if (route === "/signin") {
    return (
      <SigninPage
        onSignUp={() => navigateTo("/signup")}
        onSubmit={async (values) => {
          try {
            const res = await signin(values.email, values.password);
            navigateTo("/app");
          }
          catch(err) {
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
          console.log("join", inviteCode);
          navigateTo("/app");
        }}
      />
    );
  }

  if (route === "/app") {
    return (
      <>
        <DashboardPage
          workspaceName={workspaceName}
          onLogout={() => navigateTo("/signin")}
          onWorkspaceClick={() => setWorkspaceStep("create")}
        />
        <CreateWorkspaceModal
          open={workspaceStep === "create"}
          step={1}
          onClose={() => setWorkspaceStep(null)}
          onContinue={async ({ workspaceName: name }) => {
            setWorkspaceName(name);
            setWorkspaceStep("invite");
          }}
        />
        {workspaceStep === "invite" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/30 p-4 backdrop-blur-[2px]">
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
      <div className="flex min-h-screen items-center justify-center bg-surface-lowest p-4">
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
              setWorkspaceName(name);
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