// frontend/src/types/resource.ts
export type ResourceType = "ROOM" | "LAB" | "EQUIPMENT";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AvailabilitySlotBooking {
  startTime: string;
  endTime: string;
  status: "PENDING" | "APPROVED";
}

export interface ResourceAvailabilityResponse {
  resourceId: string;
  from: string;
  to: string;
  bookings: AvailabilitySlotBooking[];
}