import { z } from "zod";

export const signinSchema = z.object({
    username: z.string().min(1, 'username is required'),
    password: z.string().min(1, 'password is required'),
    email:    z.string().min(1, 'email is required')
});

export const signupSchema = z.object({
    password: z.string().min(1, 'password is required'),
    email:    z.string().min(1, 'email is required')
});
