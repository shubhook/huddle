declare global {
    namespace Express {
        interface Request {
            userId: string
            /** The Session row behind the JWT. Set by requireAuth. */
            sessionId: string
            userRole: string
        }
    }
}

export {};