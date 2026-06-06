export interface GithubUser {
    id: string;
    login: string;
    email: string;
    name: string | null;
    avatar_url: string;
}

export interface GitHubEmail {
    email: string;
    primary: boolean;
    verified: boolean;
    visibility: string | null;
}