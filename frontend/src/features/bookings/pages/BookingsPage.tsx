import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
} from "../../../components/ui/primitives";
import { apiRequest } from "../../../services/api";
import type { PaginatedResponse } from "../../../types/api";
import type { Booking, BookingStatus } from "../../../types/booking";
import { formatLocalDateTime } from "../../../utils/date";
import { queryKeys } from "../../../utils/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";

export function BookingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const myBookingsQuery = useQuery({
    queryKey: queryKeys.bookings.mine({ statusFilter }),
    queryFn: () =>
      apiRequest<PaginatedResponse<Booking>>("/api/bookings/mine", {
        query: { status: statusFilter, page: 1, limit: 20 },
      }),
  });

  const allBookingsQuery = useQuery({
    queryKey: queryKeys.bookings.adminAll({ statusFilter }),
    queryFn: () =>
      apiRequest<PaginatedResponse<Booking>>("/api/bookings", {
        query: { status: statusFilter, page: 1, limit: 20 },
      }),
    enabled: isAdmin,
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats.admin });
  };

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<Booking>(`/api/bookings/${id}/cancel`, { method: "PATCH" }),
    onSuccess: () => {
      setActionError(null);
      invalidateAll();
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Cancel failed"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<Booking>(`/api/bookings/${id}/approve`, { method: "PATCH" }),
    onSuccess: () => {
      setActionError(null);
      invalidateAll();
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiRequest<Booking>(`/api/bookings/${id}/reject`, {
        method: "PATCH",
        body: { note },
      }),
    onSuccess: () => {
      setActionError(null);
      invalidateAll();
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Reject failed"),
  });

  const handleCancelWithConfirm = (id: string) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      cancelMutation.mutate(id);
    }
  };

  const statusTone = (status: BookingStatus) => {
    if (status === "APPROVED") return "success";
    if (status === "REJECTED" || status === "CANCELLED") return "danger";
    return "warn";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-sm text-slate-400">
            Track your reservations and manage booking lifecycle states.
          </p>
        </div>
        <div className="w-48">
          <Select
            label="Filter by Status"
            name="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "")}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>
        </div>
      </div>

      {actionError && <ErrorState message={actionError} />}

      {/* My Bookings */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">My Bookings</h2>
        {myBookingsQuery.isLoading ? (
          <LoadingState label="Loading your bookings..." />
        ) : myBookingsQuery.isError ? (
          <ErrorState
            message={myBookingsQuery.error.message}
            onRetry={() => void myBookingsQuery.refetch()}
          />
        ) : !myBookingsQuery.data || myBookingsQuery.data.data.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Visit Resources to request a 30-minute time slot."
          />
        ) : (
          <div className="space-y-3">
            {myBookingsQuery.data.data.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge label={b.status} tone={statusTone(b.status)} />
                    <span className="text-sm font-medium text-white">{b.purpose}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatLocalDateTime(b.startTime)} – {formatLocalDateTime(b.endTime)}
                  </p>
                  {b.decisionNote && (
                    <p className="text-xs text-rose-300">Note: {b.decisionNote}</p>
                  )}
                </div>
                {(b.status === "PENDING" || b.status === "APPROVED") && (
                  <Button
                    variant="danger"
                    type="button"
                    disabled={cancelMutation.isPending}
                    onClick={() => handleCancelWithConfirm(b.id)}
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Admin Booking Decisions */}
      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">All Bookings (Admin Decisions)</h2>
          {allBookingsQuery.isLoading ? (
            <LoadingState label="Loading all bookings..." />
          ) : allBookingsQuery.isError ? (
            <ErrorState message={allBookingsQuery.error.message} />
          ) : !allBookingsQuery.data || allBookingsQuery.data.data.length === 0 ? (
            <EmptyState
              title="No bookings in system"
              description="Bookings created by users will appear here for review."
            />
          ) : (
            <div className="space-y-3">
              {allBookingsQuery.data.data.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Badge label={b.status} tone={statusTone(b.status)} />
                      <span className="ml-2 text-sm font-medium text-white">{b.purpose}</span>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatLocalDateTime(b.startTime)} – {formatLocalDateTime(b.endTime)}
                      </p>
                    </div>
                  </div>

                  {b.status === "PENDING" && (
                    <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-800">
                      <Button
                        type="button"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(b.id)}
                      >
                        Approve
                      </Button>
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          label="Rejection Note (required to reject)"
                          name={`reject-${b.id}`}
                          placeholder="Reason for rejection (5–200 chars)..."
                          value={rejectNotes[b.id] ?? ""}
                          onChange={(e) =>
                            setRejectNotes((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }
                        />
                      </div>
                      <Button
                        variant="danger"
                        type="button"
                        disabled={rejectMutation.isPending}
                        onClick={() =>
                          rejectMutation.mutate({
                            id: b.id,
                            note: rejectNotes[b.id] ?? "",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}