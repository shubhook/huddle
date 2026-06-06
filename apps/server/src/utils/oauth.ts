import * as arctic from "arctic";
import { env } from "./env";

export const github = new arctic.GitHub(
    env.githubClientId, 
    env.githubSecret, 
    env.githubRedirectUri
);