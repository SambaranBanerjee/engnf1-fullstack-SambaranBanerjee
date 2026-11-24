import { eq } from "drizzle-orm";
import { db } from "../../database/connection.js";
import { tickets } from "../../database/schema/index.js";
import { classifyTicket } from "./classifier.js";
import type { ImportTicketsInput } from "./tickets.validation.js";

export interface ImportSummary {
  importedCount: number;
  updatedCount: number;
  skippedOverrideCount: number;
  total: number;
}

export async function importTicketsIdempotently(
  input: ImportTicketsInput,
): Promise<ImportSummary> {
  let importedCount = 0;
  let updatedCount = 0;
  let skippedOverrideCount = 0;

  await db.transaction(async (tx) => {
    for (const item of input.tickets) {
      const classified = classifyTicket(item.subject, item.body);

      const [existing] = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.externalId, item.externalId))
        .limit(1);

      if (!existing) {
        await tx
          .insert(tickets)
          .values({
            externalId: item.externalId,
            subject: item.subject,
            body: item.body,
            autoCategory: classified.autoCategory,
            category: classified.autoCategory,
            isHumanOverride: false,
            priority: classified.priority,
            status: "OPEN",
            isReviewed: false,
          })
          .onConflictDoNothing({ target: tickets.externalId });

        importedCount += 1;
        continue;
      }

      const contentChanged =
        existing.subject !== item.subject || existing.body !== item.body;

      if (existing.isHumanOverride) {
        // Protect human-overridden category from re-import overwrite
        const categoryWouldChange = existing.category !== classified.autoCategory;
        if (categoryWouldChange) {
          skippedOverrideCount += 1;
        }

        if (contentChanged) {
          await tx
            .update(tickets)
            .set({
              subject: item.subject,
              body: item.body,
              updatedAt: new Date(),
            })
            .where(eq(tickets.id, existing.id));
          updatedCount += 1;
        }
        continue;
      }

      // Not human-overridden: update source fields and re-run classification
      const categoryChanged = existing.category !== classified.autoCategory;
      const priorityChanged = existing.priority !== classified.priority;

      if (contentChanged || categoryChanged || priorityChanged) {
        await tx
          .update(tickets)
          .set({
            subject: item.subject,
            body: item.body,
            category: classified.autoCategory,
            priority: classified.priority,
            updatedAt: new Date(),
          })
          .where(eq(tickets.id, existing.id));
        updatedCount += 1;
      }
    }
  });

  return {
    importedCount,
    updatedCount,
    skippedOverrideCount,
    total: input.tickets.length,
  };
}