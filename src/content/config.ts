import { defineCollection, z } from "astro:content";

export const collections = {
    projects: defineCollection({
        schema: z.object({
            title: z.string(),
            techs: z.array(z.string()),
            description: z.string(),
            order: z.number(),
            images: z.array(z.object({
                path: z.string(),
                alt: z.string(),
                type: z.enum(["image", "video"]).optional(),
                caption: z.string().optional(),
                poster: z.string().optional(),
            })),
        })
    })
}
