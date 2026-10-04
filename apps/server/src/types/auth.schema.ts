import { z } from "zod";

/** bcrypt only reads the first 72 bytes, so a longer password would be silently cut short. */
const BCRYPT_MAX_BYTES = 72;

const email = z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "email is too long")
    .pipe(z.email("email is not a valid address"));

export const signupSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "username must be at least 3 characters")
        .max(32, "username must be at most 32 characters")
        .regex(/^[\w.-]+$/, "username can only use letters, numbers, dots, dashes and underscores"),
    email,
    password: z
        .string()
        .min(8, "password must be at least 8 characters")
        .refine(
            (value) => Buffer.byteLength(value) <= BCRYPT_MAX_BYTES,
            `password must be at most ${BCRYPT_MAX_BYTES} bytes`,
        ),
});

/**
 * Deliberately lenient. Accounts created before the signup rules existed may have short
 * passwords, and sign-in must not reveal what the rules are. The length cap only bounds
 * the work a request can ask bcrypt to do.
 */
export const signinSchema = z.object({
    email: z.string().trim().toLowerCase().min(1, "email is required").max(254),
    password: z.string().min(1, "password is required").max(1024),
});
