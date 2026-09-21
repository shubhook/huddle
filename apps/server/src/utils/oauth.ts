import * as arctic from "arctic";
import { env, isGithubOAuthConfigured } from "./env";

export const github = isGithubOAuthConfigured
    ? new arctic.GitHub(
          env.githubClientId,
          env.githubSecret,
          env.githubRedirectUri,
      )
    : null;
