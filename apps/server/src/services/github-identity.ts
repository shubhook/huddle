import type { User } from "../generated/prisma/client";
import { prisma } from "../db";

export interface GithubProfile {
    githubId: string;
    login: string;
    /** Must be a primary, verified address from GitHub. Never a public profile email. */
    email: string;
}

export type GithubResolution =
    | { user: User }
    /** The email belongs to an account that was not made through this GitHub identity. */
    | { conflict: "email_in_use" };

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === "P2002";

/** GitHub logins are already close to our username rules, but keep only what the schema allows. */
function baseUsername(login: string): string {
    const cleaned = login.replace(/[^\w.-]/g, "").slice(0, 28);
    return cleaned.length >= 1 ? cleaned : "user";
}

async function uniqueUsername(login: string): Promise<string> {
    const base = baseUsername(login);

    for (const candidate of [base, ...Array.from({ length: 8 }, (_, i) => `${base}-${i + 2}`)]) {
        if (!(await prisma.user.findUnique({ where: { username: candidate } }))) return candidate;
    }

    return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Finds or creates the user for a GitHub login.
 *
 * Matching on email alone was the old behavior and it let someone take over an account:
 * signup does not verify email, so an attacker could register victim@example.com with a
 * password they chose, wait for the victim to click "Sign in with GitHub", and the victim
 * would land inside the attacker's account. Now:
 *
 *  - A known GitHub id always logs into its own account.
 *  - An email that belongs to a password account, or to another GitHub id, is refused.
 *    Nobody proved they own that address, so it is not handed to a GitHub login.
 *  - A GitHub-only account from before githubId existed is linked. It has no password, and
 *    only a verified GitHub email could have created it, so only its owner can reach this branch.
 */
export async function resolveGithubUser(profile: GithubProfile, retried = false): Promise<GithubResolution> {
    const byGithubId = await prisma.user.findUnique({ where: { githubId: profile.githubId } });
    if (byGithubId) return { user: byGithubId };

    const email = profile.email.trim().toLowerCase();
    const byEmail = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

    if (byEmail) {
        // The same GitHub identity found through its email, which happens when two first
        // logins race and the loser reads the row the winner just wrote. Not a conflict.
        if (byEmail.githubId === profile.githubId) return { user: byEmail };

        if (byEmail.hashedPassword !== null || byEmail.githubId !== null) {
            return { conflict: "email_in_use" };
        }

        const linked = await prisma.user.update({
            where: { id: byEmail.id },
            data: { githubId: profile.githubId },
        });
        return { user: linked };
    }

    try {
        const user = await prisma.user.create({
            data: {
                githubId: profile.githubId,
                email,
                username: await uniqueUsername(profile.login),
            },
        });
        return { user };
    } catch (err) {
        // Two first-time logins racing each other. The loser re-reads what the winner wrote.
        if (isUniqueViolation(err) && !retried) return resolveGithubUser(profile, true);
        throw err;
    }
}
