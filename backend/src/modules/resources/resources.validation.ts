import { z } from "zod";

export const RESOURCE_TYPES = ["ROOM", "LAB", "EQUIPMENT"] as const;

export const createResourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Resource name must be at least 3 characters")
    .max(60, "Resource name must be at most 60 characters"),
  type: z.enum(RESOURCE_TYPES),
  capacity: z.coerce
    .number()
    .int("Capacity must be an integer")
    .min(1, "Capacity must be at least 1")
    .max(500, "Capacity must be at most 500"),
  description: z
    .string()
    .trim()
    .max(300, "Description must be at most 300 characters")
    .nullable()
    .optional(),
});

export const updateResourceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Resource name must be at least 3 characters")
      .max(60, "Resource name must be at most 60 characters")
      .optional(),
    type: z.enum(RESOURCE_TYPES).optional(),
    capacity: z.coerce
      .number()
      .int("Capacity must be an integer")
      .min(1, "Capacity must be at least 1")
      .max(500, "Capacity must be at most 500")
      .optional(),
    description: z
      .string()
      .trim()
      .max(300, "Description must be at most 300 characters")
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.type !== undefined ||
      data.capacity !== undefined ||
      data.description !== undefined ||
      data.isActive !== undefined,
    { message: "At least one field must be provided to update a resource" },
  );

export const listResourcesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(RESOURCE_TYPES).optional(),
  minCapacity: z.coerce.number().int().min(1).max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const isoDateStringSchema = z
  .string()
  .trim()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Timestamp must be a valid ISO date string",
  });

export const availabilityQuerySchema = z
  .object({
    from: isoDateStringSchema,
    to: isoDateStringSchema,
  })
  .refine((data) => new Date(data.to).getTime() > new Date(data.from).getTime(), {
    message: "'to' must be later than 'from'",
  })
  .refine(
    (data) => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return (
        new Date(data.to).getTime() - new Date(data.from).getTime() <=
        sevenDaysMs
      );
    },
    { message: "Availability range cannot exceed 7 days" },
  );

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;