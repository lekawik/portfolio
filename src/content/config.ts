import { defineCollection, z } from "astro:content";

const media = z.array(z.object({
    path: z.string(),
    alt: z.string(),
    type: z.enum(["image", "video"]).optional(),
    caption: z.string().optional(),
    poster: z.string().optional(),
}));

export const collections = {
    // Explorations: an article (intro) with tabbed parts. Not products: questions,
    // rigs, measurements, dead ends, and what was learned.
    explorations: defineCollection({
        schema: z.object({
            title: z.string(),
            techs: z.array(z.string()),
            description: z.string(),
            order: z.number(),
            period: z.string(),
            takeaways: z.array(z.string()),
            images: media,
        })
    }),
    explorationParts: defineCollection({
        schema: z.object({
            parent: z.string(),
            tab: z.string(),
            order: z.number(),
            images: media.optional(),
            islands: z.array(z.enum(["soundstage-walk", "uwb-trilateration"])).optional(),
        })
    }),
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
