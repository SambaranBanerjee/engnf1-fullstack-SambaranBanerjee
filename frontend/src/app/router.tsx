// frontend/src/app/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { AdminPage } from "../features/analytics/pages/AdminPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { BookingsPage } from "../features/bookings/pages/BookingsPage";
import { ResourcesPage } from "../features/resources/pages/ResourcesPage";
import { TicketDetailsPage } from "../features/tickets/pages/TicketDetailsPage";
import { TicketQueuePage } from "../features/tickets/pages/TicketQueuePage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/tickets" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/tickets",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <TicketQueuePage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/tickets/:id",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <TicketDetailsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/resources",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ResourcesPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/bookings",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <BookingsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute requiredRole="ADMIN">
        <AppLayout>
          <AdminPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/tickets" replace /> },
]);