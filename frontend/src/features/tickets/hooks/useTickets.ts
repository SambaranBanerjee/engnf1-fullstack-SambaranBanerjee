import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../../services/api";
import type { PaginatedResponse } from "../../../types/api";
import type {
  ImportTicketsResponse,
  Ticket,
  TicketCategory,
  TicketDetailResponse,
  TicketFilters,
  TicketPriority,
  TicketStatsResponse,
  TicketStatus,
} from "../../../types/ticket";
import { queryKeys } from "../../../utils/queryKeys";

export function useTicketsList(filters: TicketFilters) {
  return useQuery({
    queryKey: queryKeys.tickets.list(filters),
    queryFn: () =>
      apiRequest<PaginatedResponse<Ticket>>("/api/tickets", {
        query: {
          status: filters.status,
          category: filters.category,
          priority: filters.priority,
          q: filters.q,
          page: filters.page ?? 1,
          limit: filters.limit ?? 10,
        },
      }),
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: queryKeys.stats.tickets,
    queryFn: () => apiRequest<TicketStatsResponse>("/api/stats"),
  });
}

export function useTicketDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => apiRequest<TicketDetailResponse>(`/api/tickets/${id}`),
    enabled: Boolean(id),
  });
}

export function useImportTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      tickets: Array<{ externalId: string; subject: string; body: string }>,
    ) =>
      apiRequest<ImportTicketsResponse>("/api/tickets/import", {
        method: "POST",
        body: { tickets },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.tickets });
    },
  });
}

export interface UpdateTicketPayload {
  id: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigneeId?: string | null;
  agentHeader?: string;
}

export function useUpdateTicketOptimistic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTicketPayload) => {
      const headers: Record<string, string> = {};
      if (payload.agentHeader && payload.agentHeader.trim()) {
        headers["X-Agent"] = payload.agentHeader.trim();
      }
      return apiRequest<TicketDetailResponse>(`/api/tickets/${payload.id}`, {
        method: "PATCH",
        headers,
        body: {
          category: payload.category,
          priority: payload.priority,
          status: payload.status,
          assigneeId: payload.assigneeId,
        },
      });
    },
    onMutate: async (payload) => {
      const detailKey = queryKeys.tickets.detail(payload.id);
      await queryClient.cancelQueries({ queryKey: detailKey });
      await queryClient.cancelQueries({ queryKey: queryKeys.tickets.all });

      const previousDetail =
        queryClient.getQueryData<TicketDetailResponse>(detailKey);
      const previousLists = queryClient.getQueriesData<PaginatedResponse<Ticket>>({
        queryKey: queryKeys.tickets.all,
      });

      const applyOptimisticPatch = (current: Ticket): Ticket => {
        const categoryChanged =
          payload.category !== undefined && payload.category !== current.category;
        const movingFromOpen =
          current.status === "OPEN" &&
          payload.status !== undefined &&
          payload.status !== "OPEN";

        return {
          ...current,
          category: payload.category ?? current.category,
          priority: payload.priority ?? current.priority,
          status: payload.status ?? current.status,
          assigneeId:
            payload.assigneeId !== undefined ? payload.assigneeId : current.assigneeId,
          isHumanOverride: categoryChanged ? true : current.isHumanOverride,
          isReviewed:
            categoryChanged || movingFromOpen ? true : current.isReviewed,
          updatedAt: new Date().toISOString(),
        };
      };

      if (previousDetail) {
        queryClient.setQueryData<TicketDetailResponse>(detailKey, {
          ...previousDetail,
          ticket: applyOptimisticPatch(previousDetail.ticket),
        });
      }

      for (const [key, listData] of previousLists) {
        if (!listData) continue;
        queryClient.setQueryData<PaginatedResponse<Ticket>>(key, {
          ...listData,
          data: listData.data.map((t) =>
            t.id === payload.id ? applyOptimisticPatch(t) : t,
          ),
        });
      }

      return { previousDetail, previousLists };
    },
    onError: (_err, payload, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.tickets.detail(payload.id),
          context.previousDetail,
        );
      }
      if (context?.previousLists) {
        for (const [key, snapshot] of context.previousLists) {
          queryClient.setQueryData(key, snapshot);
        }
      }
    },
    onSuccess: (serverData, payload) => {
      queryClient.setQueryData<TicketDetailResponse>(
        queryKeys.tickets.detail(payload.id),
        serverData,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.tickets });
    },
    onSettled: (_data, _err, payload) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.detail(payload.id),
      });
    },
  });
}