export interface GithubUser {
    /** GitHub sends a number. Store it as a string. */
    id: number | string;
    login: string;
    email: string | null;
    name: string | null;
    avatar_url: string;
}

export interface GitHubEmail {
    email: string;
    primary: boolean;
    verified: boolean;
    visibility: string | null;
}
