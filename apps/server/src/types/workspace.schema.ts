import { z } from "zod";

export const new_workspace_schema = z.object({
    name: z.string().min(1, "name is required")
});