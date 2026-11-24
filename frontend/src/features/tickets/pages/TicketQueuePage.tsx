// frontend/src/features/tickets/pages/TicketQueuePage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
} from "../../../components/ui/primitives";
import type {
  TicketCategory,
  TicketFilters,
  TicketPriority,
  TicketStatus,
} from "../../../types/ticket";
import { formatLocalDateTime } from "../../../utils/date";
import {
  useImportTickets,
  useTicketsList,
  useTicketStats,
} from "../hooks/useTickets";

export function TicketQueuePage() {
  const [filters, setFilters] = useState<TicketFilters>({
    status: "",
    category: "",
    priority: "",
    q: "",
    page: 1,
    limit: 10,
  });
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const statsQuery = useTicketStats();
  const ticketsQuery = useTicketsList(filters);
  const importMutation = useImportTickets();

  const handleSampleReimport = async () => {
    setImportFeedback(null);
    const res = await importMutation.mutateAsync([
      {
        externalId: "FEED-SYNC-101",
        subject: "Urgent payment failed on invoice #402",
        body: "Customer reports payment charge failed during checkout.",
      },
      {
        externalId: "FEED-SYNC-102",
        subject: "My package has not arrived",
        body: "Shipment tracking has not updated for 5 days.",
      },
    ]);
    setImportFeedback(
      `Imported: ${res.importedCount}, Updated: ${res.updatedCount}, Skipped Overrides: ${res.skippedOverrideCount} (Total: ${res.total})`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Ticket Triage</h1>
          <p className="text-sm text-slate-400">
            Filter tickets, inspect classifications, and review audit trails.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void handleSampleReimport()}
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? "Syncing Feed..." : "Re-Import Sample Feed"}
        </Button>
      </div>

      {importFeedback && (
        <div className="rounded-xl border border-emerald-800/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          {importFeedback}
        </div>
      )}

      {/* Top Stats Strip */}
      {statsQuery.isLoading ? (
        <LoadingState label="Loading ticket metrics..." />
      ) : statsQuery.isError ? (
        <ErrorState
          message={statsQuery.error.message}
          onRetry={() => void statsQuery.refetch()}
        />
      ) : (
        statsQuery.data && (
          <section aria-label="Ticket statistics" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Open Tickets</p>
              <p className="text-2xl font-bold text-white mt-1">
                {statsQuery.data.byStatus.OPEN}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Urgent Queue</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">
                {statsQuery.data.byPriority.URGENT}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Reviewed Tickets</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {statsQuery.data.reviewedCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Model Agreement Rate</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">
                {statsQuery.data.modelAgreementRate}%
              </p>
            </div>
          </section>
        )
      )}

      {/* Filter Bar */}
      <section aria-label="Ticket filters" className="rounded-xl border border-slate-800 bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          label="Search (subject or body)"
          name="q"
          placeholder="Search tickets..."
          value={filters.q ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))
          }
        />
        <Select
          label="Status"
          name="status"
          value={filters.status ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: e.target.value as TicketStatus | "",
              page: 1,
            }))
          }
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </Select>
        <Select
          label="Category"
          name="category"
          value={filters.category ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              category: e.target.value as TicketCategory | "",
              page: 1,
            }))
          }
        >
          <option value="">All Categories</option>
          <option value="BILLING">BILLING</option>
          <option value="BUG">BUG</option>
          <option value="FEATURE_REQUEST">FEATURE_REQUEST</option>
          <option value="LOGIN">LOGIN</option>
          <option value="DELIVERY">DELIVERY</option>
        </Select>
        <Select
          label="Priority"
          name="priority"
          value={filters.priority ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              priority: e.target.value as TicketPriority | "",
              page: 1,
            }))
          }
        >
          <option value="">All Priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </Select>
      </section>

      {/* Ticket List */}
      {ticketsQuery.isLoading ? (
        <LoadingState label="Loading tickets..." />
      ) : ticketsQuery.isError ? (
        <ErrorState
          message={ticketsQuery.error.message}
          onRetry={() => void ticketsQuery.refetch()}
        />
      ) : !ticketsQuery.data || ticketsQuery.data.data.length === 0 ? (
        <EmptyState
          title="No matching tickets"
          description="Try clearing or adjusting your active search and filter criteria."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ticketsQuery.data.data.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {ticket.externalId}
                        {ticket.isHumanOverride ? " · Override" : ""}
                        {ticket.isReviewed ? " · Reviewed" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={ticket.category} tone="info" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={ticket.priority}
                        tone={
                          ticket.priority === "URGENT"
                            ? "danger"
                            : ticket.priority === "HIGH"
                              ? "warn"
                              : "neutral"
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={ticket.status}
                        tone={ticket.status === "RESOLVED" ? "success" : "neutral"}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatLocalDateTime(ticket.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {ticketsQuery.data.page} of {Math.max(1, ticketsQuery.data.totalPages)} ({ticketsQuery.data.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))
                }
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={(filters.page ?? 1) >= ticketsQuery.data.totalPages}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}