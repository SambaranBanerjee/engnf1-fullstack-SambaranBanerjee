import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  ErrorState,
  Input,
  LoadingState,
  Select,
} from "../../../components/ui/primitives";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "../../../types/ticket";
import { formatLocalDateTime } from "../../../utils/date";
import {
  useTicketDetail,
  useUpdateTicketOptimistic,
} from "../hooks/useTickets";

export function TicketDetailsPage() {
  const { id = "" } = useParams();
  const detailQuery = useTicketDetail(id);
  const updateMutation = useUpdateTicketOptimistic();

  const [draftCategory, setDraftCategory] = useState<TicketCategory | null>(null);
  const [draftPriority, setDraftPriority] = useState<TicketPriority | null>(null);
  const [draftStatus, setDraftStatus] = useState<TicketStatus | null>(null);
  const [agentHeader, setAgentHeader] = useState("");
  const [rollbackNotice, setRollbackNotice] = useState<string | null>(null);

  if (detailQuery.isLoading) {
    return <LoadingState label="Loading ticket details..." />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ErrorState
        message={detailQuery.error?.message || "Ticket not found"}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  const { ticket, events } = detailQuery.data;
  const category = draftCategory ?? ticket.category;
  const priority = draftPriority ?? ticket.priority;
  const status = draftStatus ?? ticket.status;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (updateMutation.isPending) return;
    setRollbackNotice(null);

    try {
      await updateMutation.mutateAsync({
        id: ticket.id,
        category,
        priority,
        status,
        agentHeader: agentHeader || undefined,
      });
      setDraftCategory(null);
      setDraftPriority(null);
      setDraftStatus(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Update rejected by server; reverted to previous state.";
      setRollbackNotice(`Update failed (rolled back): ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/tickets" className="text-sm text-indigo-400 hover:underline">
          ← Back to Ticket Queue
        </Link>
        <span className="text-xs text-slate-400 font-mono">{ticket.externalId}</span>
      </div>

      {rollbackNotice && <ErrorState message={rollbackNotice} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={ticket.category} tone="info" />
              <Badge
                label={ticket.priority}
                tone={ticket.priority === "URGENT" ? "danger" : "warn"}
              />
              <Badge label={ticket.status} />
              {ticket.isHumanOverride && <Badge label="Human Override" tone="warn" />}
              {ticket.isReviewed && <Badge label="Reviewed" tone="success" />}
            </div>

            <h1 className="text-xl font-bold text-white break-words">{ticket.subject}</h1>
            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
              {ticket.body}
            </p>

            <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap gap-4">
              <span>Auto Category: {ticket.autoCategory}</span>
              <span>Created: {formatLocalDateTime(ticket.createdAt)}</span>
              <span>Updated: {formatLocalDateTime(ticket.updatedAt)}</span>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Audit History (ticket_events)</h2>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No audit events recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800 text-sm">
                {events.map((ev) => (
                  <li key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <span className="font-mono text-xs text-indigo-300">{ev.field}</span>:{" "}
                      <span className="text-slate-400">{ev.oldValue ?? "null"}</span> →{" "}
                      <span className="text-slate-100 font-medium">{ev.newValue ?? "null"}</span>
                      <span className="text-xs text-slate-500 ml-2">by {ev.actor}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatLocalDateTime(ev.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-6 h-fit">
          <h2 className="text-base font-semibold text-white mb-4">Agent Review &amp; Update</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <Select
              label="Category"
              name="category"
              value={category}
              onChange={(e) => setDraftCategory(e.target.value as TicketCategory)}
            >
              <option value="BILLING">BILLING</option>
              <option value="BUG">BUG</option>
              <option value="FEATURE_REQUEST">FEATURE_REQUEST</option>
              <option value="LOGIN">LOGIN</option>
              <option value="DELIVERY">DELIVERY</option>
            </Select>

            <Select
              label="Priority"
              name="priority"
              value={priority}
              onChange={(e) => setDraftPriority(e.target.value as TicketPriority)}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </Select>

            <Select
              label="Status"
              name="status"
              value={status}
              onChange={(e) => setDraftStatus(e.target.value as TicketStatus)}
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </Select>

            <Input
              label="X-Agent Identifier (optional)"
              name="xAgent"
              placeholder="e.g. agent-sarah"
              value={agentHeader}
              onChange={(e) => setAgentHeader(e.target.value)}
            />

            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? "Saving..." : "Apply Optimistic Update"}
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}