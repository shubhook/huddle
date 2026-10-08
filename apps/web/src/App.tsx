import { useEffect, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import {
  inviteCodeFromHash,
  navigateTo,
  useHashAuthNotice,
  useHashRoute,
  useHashWorkspaceId,
} from "@/lib/hashRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { JoinPage } from "@/pages/JoinPage";
import { LandingPage } from "@/pages/LandingPage";
import { SigninPage } from "@/pages/SigninPage";
import { SignupPage } from "@/pages/SignupPage";
import { WorkspaceSetupPage } from "@/pages/WorkspaceSetupPage";
import "./index.css";
import {
  type CurrentUser,
  getApiErrorMessage,
  getCurrentUser,
  isUnauthorized,
  joinWorkspace,
  listWorkspaces,
  logout,
  signin,
  signup,
  type WorkspaceSummary,
} from "./lib/api";
import {
  cachedUser,
  cachedWorkspaces,
  cacheUser,
  cacheWorkspaces,
  clearCache,
} from "./lib/cache";
import { onSessionEnded } from "./lib/ws";

/** What the server means by each code it puts in #/signin/<code> after a GitHub attempt. */
const GITHUB_SIGNIN_NOTICES: Record<string, string> = {
  github_denied: "GitHub sign-in was cancelled.",
  invalid_state: "That GitHub sign-in expired. Please try again.",
  no_verified_email:
    "Your GitHub account has no verified email. Verify one on GitHub, then try again.",
  email_in_use:
    "An account with that email already exists. Sign in with your password instead.",
  github_failed: "GitHub sign-in failed. Please try again.",
};

/** An invite opened while signed out, resumed after sign-in. */
const PENDING_INVITE_KEY = "huddle.pendingInvite";

function takePendingInvite(): string | null {
  try {
    const token = sessionStorage.getItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return token;
  } catch {
    return null;
  }
}

/** After signing in, finish a pending invite or go where the caller wanted. */
function continueAfterAuth(fallback: () => void) {
  const invite = takePendingInvite();
  if (invite) window.location.hash = `/join/${encodeURIComponent(invite)}`;
  else fallback();
}

export function App() {
  const route = useHashRoute();
  const authNotice = useHashAuthNotice();
  const workspaceId = useHashWorkspaceId();
  // Start from what the last visit saw, so a returning user lands in the app
  // at once. The session check below confirms or replaces it.
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>(cachedWorkspaces);
  const [signinError, setSigninError] = useState<string | undefined>();
  const [signupError, setSignupError] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(cachedUser);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch((error) => {
        // Only a refused session signs the user out. When the server is
        // unreachable a cached user stays on screen and the socket shows offline.
        if (isUnauthorized(error)) {
          clearCache();
          setCurrentUser(null);
        }
      })
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => {
    if (currentUser) cacheUser(currentUser);
  }, [currentUser]);

  // The server ends a socket when its session expires or the user signs out
  // elsewhere. Dropping the user here sends them to sign-in via the effect below.
  useEffect(
    () =>
      onSessionEnded(() => {
        clearCache();
        setCurrentUser(null);
      }),
    [],
  );

  useEffect(() => {
    if (route === "/signin" && authNotice) {
      setSigninError(
        GITHUB_SIGNIN_NOTICES[authNotice] ?? "Sign-in failed. Please try again.",
      );
    }
  }, [route, authNotice]);

  const needsSession = route === "/app" || route === "/workspace/create";
  useEffect(() => {
    if (needsSession && sessionChecked && !currentUser) {
      navigateTo("/signin");
    }
  }, [needsSession, sessionChecked, currentUser]);

  // A signed-in user has no use for the landing page. /auth/me only succeeds
  // with an unexpired token on a live session, so currentUser is the signal.
  useEffect(() => {
    if (route === "/" && currentUser) {
      navigateTo("/app", { replace: true });
    }
  }, [route, currentUser]);

  // The URL carries the workspace id (#/app/<id>) so a refresh keeps it. When it
  // is missing or not one of the user's workspaces, fall back to their first
  // one, or to workspace creation if they have none.
  useEffect(() => {
    if (route !== "/app" || !currentUser) return;
    let cancelled = false;

    // Open the last known workspace now rather than after the list arrives.
    const known = cachedWorkspaces()[0];
    if (!workspaceId && known) {
      navigateTo("/app", { workspaceId: known.id, replace: true });
      return;
    }

    listWorkspaces()
      .then((list) => {
        if (cancelled) return;
        setWorkspaces(list);
        cacheWorkspaces(list);
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

  if (route === "/signup") {
    return (
      <SignupPage
        onSignIn={() => navigateTo("/signin")}
        error={signupError}
        onSubmit={async (values) => {
          try {
            await signup(values.username, values.email, values.password);
            setCurrentUser(await getCurrentUser());
            continueAfterAuth(() => navigateTo("/workspace/create"));
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
            continueAfterAuth(() => navigateTo("/app"));
          } catch (error) {
            setSigninError(getApiErrorMessage(error, "Invalid email or password"));
          }
        }}
      />
    );
  }

  if (route === "/join") {
    if (!sessionChecked) return null;
    return (
      <JoinPage
        signedIn={currentUser !== null}
        onSignIn={() => {
          const token = inviteCodeFromHash();
          try {
            if (token) sessionStorage.setItem(PENDING_INVITE_KEY, token);
          } catch {
            // Storage disabled: the user can open the link again after signing in.
          }
          navigateTo("/signin");
        }}
        onJoin={async (token) => {
          const { workspaceId: joinedWorkspaceId } = await joinWorkspace(token);
          navigateTo("/app", { workspaceId: joinedWorkspaceId });
        }}
      />
    );
  }

  if (route === "/workspace/create") {
    if (!sessionChecked || !currentUser) return null;
    return (
      <WorkspaceSetupPage
        onDone={(newWorkspaceId) => navigateTo("/app", { workspaceId: newWorkspaceId })}
      />
    );
  }

  if (route === "/app") {
    // The outline of the app, not a blank page, while the session or the
    // workspace to open is still being worked out.
    if (!currentUser || !workspaceId) return <AppShell />;

    return (
      <DashboardPage
        key={currentUser.id}
        user={currentUser}
        workspaces={workspaces}
        workspaceId={workspaceId}
        onSelectWorkspace={(id) => navigateTo("/app", { workspaceId: id })}
        onCreateWorkspace={() => navigateTo("/workspace/create")}
        onAvatarChange={(avatarId) =>
          setCurrentUser((current) => (current ? { ...current, avatarId } : current))
        }
        onLogout={async () => {
          try {
            await logout();
          } finally {
            clearCache();
            setCurrentUser(null);
            navigateTo("/signin");
          }
        }}
      />
    );
  }

  // Hold the landing page until the session check settles so signed-in users
  // don't see it flash before the redirect above.
  if (!sessionChecked || currentUser) return null;

  return (
    <LandingPage
      onOpenApp={() => navigateTo("/app")}
      onGetStarted={() => navigateTo("/signup")}
    />
  );
}

export default App;
