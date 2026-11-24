import { useState, type FormEvent } from "react";
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
import type { Booking } from "../../../types/booking";
import type {
  Resource,
  ResourceAvailabilityResponse,
  ResourceType,
} from "../../../types/resource";
import {
  formatLocalDateTime,
  localDateAndTimeToUtcIso,
} from "../../../utils/date";
import { queryKeys } from "../../../utils/queryKeys";
import { useAuth } from "../../auth/hooks/useAuth";

const TIME_SLOTS_30M = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

function defaultTomorrowStr(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function ResourcesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "">("");
  const [minCapacity, setMinCapacity] = useState("");
  const [page, setPage] = useState(1);

  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState(defaultTomorrowStr);
  const [startSlot, setStartSlot] = useState("10:00");
  const [endSlot, setEndSlot] = useState("11:00");
  const [purpose, setPurpose] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: queryKeys.resources.list({ search, typeFilter, minCapacity, page }),
    queryFn: () =>
      apiRequest<PaginatedResponse<Resource>>("/api/resources", {
        query: {
          search,
          type: typeFilter,
          minCapacity: minCapacity ? Number(minCapacity) : undefined,
          page,
          limit: 10,
        },
      }),
  });

  const activeResourceId =
    selectedResourceId || resourcesQuery.data?.data[0]?.id || "";

  const fromUtc = localDateAndTimeToUtcIso(bookingDate, "00:00");
  const toUtc = localDateAndTimeToUtcIso(bookingDate, "23:30");

  const availabilityQuery = useQuery({
    queryKey: queryKeys.resources.availability(activeResourceId, fromUtc, toUtc),
    queryFn: () =>
      apiRequest<ResourceAvailabilityResponse>(
        `/api/resources/${activeResourceId}/availability`,
        { query: { from: fromUtc, to: toUtc } },
      ),
    enabled: Boolean(activeResourceId && bookingDate),
  });

  const createBookingMutation = useMutation({
    mutationFn: () =>
      apiRequest<Booking>("/api/bookings", {
        method: "POST",
        body: {
          resourceId: activeResourceId,
          startTime: localDateAndTimeToUtcIso(bookingDate, startSlot),
          endTime: localDateAndTimeToUtcIso(bookingDate, endSlot),
          purpose,
          ticketId: ticketId.trim() ? ticketId.trim() : null,
        },
      }),
    onSuccess: (created) => {
      setBookingFeedback(`Booking request created (status: ${created.status}).`);
      setBookingError(null);
      setPurpose("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      void availabilityQuery.refetch();
    },
    onError: (err) => {
      setBookingError(err instanceof Error ? err.message : "Could not create booking");
      setBookingFeedback(null);
    },
  });

  const handleBookingSubmit = (e: FormEvent) => {
    e.preventDefault();
    setBookingFeedback(null);
    setBookingError(null);
    createBookingMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Resources &amp; Slot Booking</h1>
        <p className="text-sm text-slate-400">
          Inspect 30-minute availability slots and reserve labs, rooms, or diagnostic equipment.
        </p>
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          label="Search resource name"
          name="search"
          placeholder="e.g. War Room, Lab..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Type"
          name="type"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as ResourceType | "");
            setPage(1);
          }}
        >
          <option value="">All Types</option>
          <option value="ROOM">ROOM</option>
          <option value="LAB">LAB</option>
          <option value="EQUIPMENT">EQUIPMENT</option>
        </Select>
        <Input
          label="Minimum Capacity"
          name="minCapacity"
          type="number"
          min={1}
          max={500}
          value={minCapacity}
          onChange={(e) => {
            setMinCapacity(e.target.value);
            setPage(1);
          }}
        />
      </section>

      {resourcesQuery.isLoading ? (
        <LoadingState label="Loading resources..." />
      ) : resourcesQuery.isError ? (
        <ErrorState
          message={resourcesQuery.error.message}
          onRetry={() => void resourcesQuery.refetch()}
        />
      ) : !resourcesQuery.data || resourcesQuery.data.data.length === 0 ? (
        <EmptyState
          title="No resources found"
          description="Try broadening your search or capacity filter."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {resourcesQuery.data.data.map((res) => {
              const isSelected = res.id === activeResourceId;
              return (
                <div
                  key={res.id}
                  className={`rounded-xl border p-4 transition ${
                    isSelected
                      ? "border-indigo-500 bg-slate-900"
                      : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-white">{res.name}</h2>
                      <Badge label={res.type} tone="info" />
                      {isAdmin && (
                        <Badge
                          label={res.isActive ? "ACTIVE" : "INACTIVE"}
                          tone={res.isActive ? "success" : "danger"}
                        />
                      )}
                    </div>
                    <Button
                      variant={isSelected ? "primary" : "secondary"}
                      type="button"
                      onClick={() => setSelectedResourceId(res.id)}
                    >
                      {isSelected ? "Selected" : "Select Slot"}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Capacity: {res.capacity} · {res.description || "No description"}
                  </p>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2 text-sm text-slate-400">
              <span>
                Page {resourcesQuery.data.page} of {Math.max(1, resourcesQuery.data.totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={page >= resourcesQuery.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Availability & Booking Form */}
          <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 h-fit">
            <h2 className="text-base font-semibold text-white">Reserve Time Slot</h2>

            {bookingFeedback && (
              <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-200">
                {bookingFeedback}
              </div>
            )}
            {bookingError && <ErrorState message={bookingError} />}

            <form onSubmit={handleBookingSubmit} className="space-y-3">
              <Input
                label="Date (Local)"
                name="date"
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Start (30m)"
                  name="startSlot"
                  value={startSlot}
                  onChange={(e) => setStartSlot(e.target.value)}
                >
                  {TIME_SLOTS_30M.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Select
                  label="End (30m)"
                  name="endSlot"
                  value={endSlot}
                  onChange={(e) => setEndSlot(e.target.value)}
                >
                  {TIME_SLOTS_30M.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                label="Purpose (5–200 chars)"
                name="purpose"
                required
                minLength={5}
                maxLength={200}
                placeholder="Live reproduction of payment bug..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
              <Input
                label="Linked Ticket ID (optional UUID)"
                name="ticketId"
                placeholder="Optional ticket UUID"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
              />
              <Button
                type="submit"
                disabled={!activeResourceId || createBookingMutation.isPending}
                className="w-full"
              >
                {createBookingMutation.isPending ? "Submitting..." : "Request Booking"}
              </Button>
            </form>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <h3 className="text-xs font-semibold uppercase text-slate-400">
                Occupied Slots on {bookingDate}
              </h3>
              {availabilityQuery.isLoading ? (
                <p className="text-xs text-slate-400">Checking availability...</p>
              ) : !availabilityQuery.data || availabilityQuery.data.bookings.length === 0 ? (
                <p className="text-xs text-emerald-400">No active overlapping bookings on this date.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {availabilityQuery.data.bookings.map((b, i) => (
                    <li
                      key={`${b.startTime}-${i}`}
                      className="rounded bg-slate-950 px-2.5 py-1.5 flex items-center justify-between"
                    >
                      <span>
                        {formatLocalDateTime(b.startTime)} – {formatLocalDateTime(b.endTime)}
                      </span>
                      <Badge label={b.status} tone="warn" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}