import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Button,
  ErrorState,
  Input,
  LoadingState,
  Select,
} from "../../../components/ui/primitives";
import { apiRequest } from "../../../services/api";
import type { PaginatedResponse } from "../../../types/api";
import type { AdminStatsResponse } from "../../../types/booking";
import type { Resource, ResourceType } from "../../../types/resource";
import { queryKeys } from "../../../utils/queryKeys";

export function AdminPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>("ROOM");
  const [capacity, setCapacity] = useState("10");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const adminStatsQuery = useQuery({
    queryKey: queryKeys.stats.admin,
    queryFn: () => apiRequest<AdminStatsResponse>("/api/admin/stats"),
  });

  const allResourcesQuery = useQuery({
    queryKey: queryKeys.resources.list({ adminAll: true }),
    queryFn: () =>
      apiRequest<PaginatedResponse<Resource>>("/api/resources", {
        query: { page: 1, limit: 50 },
      }),
  });

  const createResourceMutation = useMutation({
    mutationFn: () =>
      apiRequest<Resource>("/api/resources", {
        method: "POST",
        body: {
          name,
          type,
          capacity: Number(capacity),
          description: description.trim() || null,
        },
      }),
    onSuccess: () => {
      setFormError(null);
      setName("");
      setDescription("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.admin });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to create resource"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (res: Resource) =>
      apiRequest<Resource>(`/api/resources/${res.id}`, {
        method: "PATCH",
        body: { isActive: !res.isActive },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.admin });
    },
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createResourceMutation.mutate();
  };

  const categoryChartData = adminStatsQuery.data
    ? Object.entries(adminStatsQuery.data.ticketStats.byCategory).map(
        ([label, count]) => ({ label, count }),
      )
    : [];

  const bookingStatusChartData = adminStatsQuery.data
    ? Object.entries(adminStatsQuery.data.bookingsByStatus).map(
        ([label, count]) => ({ label, count }),
      )
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Console &amp; Analytics</h1>
        <p className="text-sm text-slate-400">
          Manage resources, inspect booking/ticket metrics, and review top-utilized rooms and labs.
        </p>
      </div>

      {adminStatsQuery.isLoading ? (
        <LoadingState label="Loading admin analytics..." />
      ) : adminStatsQuery.isError ? (
        <ErrorState message={adminStatsQuery.error.message} />
      ) : (
        adminStatsQuery.data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">Active Resources</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {adminStatsQuery.data.activeResources}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">Model Agreement Rate</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">
                  {adminStatsQuery.data.ticketStats.modelAgreementRate}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">Pending Bookings</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {adminStatsQuery.data.bookingsByStatus.PENDING}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-white">Tickets by Category</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-white">Bookings by Status</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingStatusChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )
      )}

      {/* Create & Toggle Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3 h-fit"
        >
          <h2 className="text-base font-semibold text-white">Add Resource</h2>
          {formError && <ErrorState message={formError} />}
          <Input
            label="Name (3–60 chars)"
            name="name"
            required
            minLength={3}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
          >
            <option value="ROOM">ROOM</option>
            <option value="LAB">LAB</option>
            <option value="EQUIPMENT">EQUIPMENT</option>
          </Select>
          <Input
            label="Capacity (1–500)"
            name="capacity"
            type="number"
            required
            min={1}
            max={500}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <Input
            label="Description (optional)"
            name="description"
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={createResourceMutation.isPending} className="w-full">
            {createResourceMutation.isPending ? "Creating..." : "Create Resource"}
          </Button>
        </form>

        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <h2 className="text-base font-semibold text-white">Manage Resources</h2>
          {allResourcesQuery.data?.data.map((res) => (
            <div
              key={res.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
            >
              <div>
                <span className="font-medium text-white">{res.name}</span>{" "}
                <Badge label={res.type} tone="info" />{" "}
                <Badge
                  label={res.isActive ? "ACTIVE" : "INACTIVE"}
                  tone={res.isActive ? "success" : "danger"}
                />
                <p className="text-xs text-slate-400 mt-0.5">Capacity: {res.capacity}</p>
              </div>
              <Button
                variant="secondary"
                type="button"
                disabled={toggleActiveMutation.isPending}
                onClick={() => toggleActiveMutation.mutate(res)}
              >
                {res.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}