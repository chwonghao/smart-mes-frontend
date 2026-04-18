# SmartMES Frontend Overview

## 1) Tech Stack

- Core framework: React 19 + TypeScript
- Build tool: Vite 7 (`@vitejs/plugin-react`)
- Routing: `react-router-dom` (nested routes + protected routes)
- UI library: Ant Design (`antd`, `@ant-design/icons`)
- Styling: Tailwind CSS v4 + utility classes in JSX
- Charts: Recharts (dashboard visualization)
- HTTP client: Axios (centralized via `src/services/apiClient.ts`)
- Realtime: STOMP over SockJS (`@stomp/stompjs`, `sockjs-client`)
- QR scanning (mobile worker flow): `html5-qrcode`

## 2) Architecture & Folder Structure

- `src/routes`: Router composition (`AppRoutes`) and route protection rules.
- `src/components/layout`: Application shell (`MainLayout`) for authenticated desktop pages.
- `src/components/ProtectedRoute.tsx`: Guard logic for authentication and role-based access.
- `src/pages`: Feature pages grouped by domain:
  - `Auth`: login flow
  - `Dashboard`: KPI/realtime overview
  - `MasterData`: work centers, items, BOM, routing, workers
  - `Production`: work order execution/reporting
  - `Inventory`: stock view and adjustment
  - `System`: logs, users, settings
  - `Mobile`: worker QR scanning/reporting page
- `src/services`: API abstraction layer (per-domain services + shared `apiClient`).
- `src/contexts`: global cross-page state (`SettingContext`).
- `src/hooks`: reusable logic (`useWebSocket` for notification subscription).
- `src/types`: domain types for production/master-data entities.

Architecture pattern is feature-first UI + centralized API client. Pages are mostly container components: fetch data from services, render AntD UI, submit mutations, then refresh local page state.

## 3) Routing System (Main Routes)

Public routes:
- `/login` -> `LoginPage`

Mobile isolated route (outside main layout):
- `/mobile/scan` -> `WorkerScanner` (requires authenticated worker role)

Protected app shell:
- `/` -> `MainLayout` + nested pages

Nested protected routes under `/`:
- `/` (index) -> `Dashboard`
- `/master-data/work-centers` -> `WorkCenterList`
- `/master-data/items` -> `ItemList`
- `/master-data/boms` -> `BOMManagement`
- `/master-data/routings` -> `RoutingManagement`
- `/master-data/workers` -> `WorkerList`
- `/production/work-orders` -> `WorkOrderList`
- `/inventory` -> `InventoryList`
- `/system/logs` -> `SystemLogList`
- `/system/users` -> `UserManagement` (ROLE_ADMIN)
- `/system/settings` -> `SettingsPage` (ROLE_ADMIN)
- `*` -> inline `NotFound`

Access control behavior:
- Access/refresh token are stored as HttpOnly cookies (not readable from JS).
- Role display/routing hint is read from `localStorage` and enforced in `ProtectedRoute`.
- `ROLE_WORKER` is forced to mobile flow (`/mobile/scan`) for non-mobile paths.

## 4) State Management & Data Flow

Global state:
- `SettingContext` stores `settings: Record<string,string>` and exposes `refreshSettings()`.
- Provider is mounted at app root (`App.tsx`), so layout/pages can consume settings (e.g., factory name in sidebar).

Page-level state:
- No Redux/Zustand. State is local via `useState`, `useEffect`, and AntD Form state.
- Typical flow:
  1. Page mounts -> call service/API in `useEffect`.
  2. Save response to local component state.
  3. User submits form/action -> call mutation API.
  4. Show success/error toast (`message`).
  5. Refresh list/detail by refetching data.

Realtime state:
- `useWebSocket(topic)` subscribes STOMP topic and pushes incoming messages into local notification list + unread counter.
- `Dashboard` and `WorkOrderList` also open STOMP subscriptions and trigger `fetchData()` on events.

## 5) API Integration (Frontend <-> Backend)

API base and transport:
- Shared Axios instance in `src/services/apiClient.ts`.
- `baseURL`: `VITE_API_BASE_URL` or fallback `http://localhost:8080/api/v1`.
- Vite dev proxy forwards `/api` and `/ws-mes` to backend localhost.

Authentication:
- Axios is configured with `withCredentials: true`, so HttpOnly cookies are sent automatically.
- Response interceptor handles `401` with refresh flow:
  - If failed request is not an auth endpoint, call `POST /auth/refresh` once.
  - On refresh success, retry original request automatically.
  - On refresh failure, clear client auth state and redirect to `/login`.
- Login stores only user presentation metadata (`fullName`, `role`) in `localStorage`.
- Logout in `MainLayout` calls `POST /auth/logout` before clearing local state.

Response/error handling pattern:
- Interceptor returns `response.data` directly.
- Many pages still use defensive extraction `(res as any).data || res` due to mixed backend/legacy response shape assumptions.
- Errors are surfaced via AntD `message.error` and optional backend message extraction (`error.response?.data?.message`).

Service layer split by bounded context:
- `master-data.service.ts`: work centers, items, BOM, routings, workers
- `production.service.ts`: work orders + progress reporting
- `inventory.service.ts`: inventory read/adjust
- `setting.service.ts`: system settings get/save
- `user.service.ts`: users CRUD/reset password
- `apiClient.ts`: shared auth/error/serialization behavior

Realtime backend integration:
- STOMP + SockJS channels (`/topic/dashboard`, `/topic/alerts`) for dashboard refresh and alert notifications.
- Worker mobile flow integrates camera QR payload parsing, then reports production progress to backend.

## 6) Core Shared Components

Most important reusable infrastructure components:
- `ProtectedRoute`: central auth/role gate and worker redirection.
- `MainLayout`: desktop app shell with sidebar navigation, header profile, notification popover, and `Outlet`.
- `SettingProvider` + `useSettings`: globally available system configuration context.
- `useWebSocket`: reusable realtime notification hook.
- `apiClient`: shared Axios client with auth and centralized error handling.

Notes on `components/common`:
- `src/components/common` is currently empty; shared behavior is concentrated in layout/guard/context/hook/service layers rather than reusable presentational components.

## Backend Interaction Summary (for AI context)

- Frontend follows a service-driven data access model: pages do not call `fetch` directly; they use service functions built on one Axios client.
- Auth transport uses HttpOnly cookie session (access + refresh), with automatic refresh + request retry in Axios interceptor.
- UI role is still localStorage-backed and used for route gating/presentation.
- Realtime is event-triggered refresh (subscribe -> event -> refetch) rather than normalized client cache updates.
- Data contracts are partially inconsistent across pages (`res` vs `res.data`), so defensive parsing is common.
- Business-critical flows coupled to backend:
  - Login/role routing
  - Work order create/report progress
  - Machine down/resolve status
  - Inventory adjust
  - Settings persistence and global display
  - Live alerts via WebSocket topics

## Known Gaps / Technical Notes

- Login redirect currently routes non-worker users to `/` (aligned with dashboard index route), but route guard state can still drift if `localStorage.role` is stale.
- Two guard patterns exist (`PrivateRoute` inside routing file and shared `ProtectedRoute` component), which may create duplicated auth logic.
- Service response handling is not fully normalized yet (`res` vs `res.data` defensive code appears in multiple pages).
- `RoutingList.tsx` appears to be legacy/mock page and is not wired into current route map (active route uses `RoutingManagement.tsx`).
- Route guard still depends on `localStorage.role`; there is no bootstrap `/me` verification step to re-hydrate role from backend after hard refresh.
