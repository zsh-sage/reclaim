### Phase 1: Frontend Auth Setup & Dependencies
**Goal:** Set up the necessary tools for form handling, API requests, and state management.

1.  **Dependencies:** Install libraries for form validation, icons, and API calls.
    *   `npm install react-hook-form @hookform/resolvers zod lucide-react`
    *   *(Optional but recommended for speed)* Initialize `shadcn/ui` to quickly scaffold accessible form components (Button, Input, Card, Label, Form).
2.  **API Utility (`frontend/lib/api.ts`):** Create a centralized Axios or native `fetch` wrapper configured with the backend base URL (`NEXT_PUBLIC_API_URL`). This utility should automatically attach the JWT token (from `localStorage` or cookies) to the `Authorization` header for future requests.
3.  **Auth Context (`frontend/context/AuthContext.tsx`):** Create a React Context to manage global authentication state.
    *   State: `user` (details & role), `token`, `isLoading`.
    *   Methods: `login(email, password)`, `logout()`, `checkAuth()`.
    *   Wrap the application with `<AuthProvider>` in `app/layout.tsx`.

### Phase 2: The Login UI (`app/login/page.tsx`)
**Goal:** Build a clean, responsive, and accessible login interface.

1.  **Layout:** A centered, full-height flexbox layout with a subtle background (matching the "GLM SMART" enterprise aesthetic).
2.  **Login Card Component:**
    *   **Header:** System Logo/Title ("GLM SMART") and a brief subtitle ("Sign in to your account").
    *   **Form:**
        *   Email Input (type="email", required).
        *   Password Input (type="password", required).
    *   **Submit Button:** Full width, with a loading spinner state during API calls.
    *   **Error Handling:** A dedicated area to display invalid credentials or network errors returned from the FastAPI backend.
3.  **Form Logic:** Use `react-hook-form` with `zod` schema validation to ensure the email is valid and the password is not empty before submitting to the backend.

### Phase 3: Integration & Routing
**Goal:** Connect the UI to the FastAPI backend and handle post-login navigation.

1.  **Login Action:** On form submit, call the `login` method from `AuthContext`.
    *   Send a `POST` request to `http://localhost:8000/api/v1/auth/login` using `application/x-www-form-urlencoded` (as required by FastAPI's `OAuth2PasswordRequestForm`).
    *   On success: Store the `access_token` in `localStorage` (or an HTTP-only cookie for better security), fetch the user's profile (`/api/v1/auth/me`), and update the Context state.
2.  **Role-Based Redirection:** After a successful login, inspect the user's `role`:
    *   If `role === 'HR'`, redirect to `/hr/dashboard`.
    *   If `role === 'Employee'`, redirect to `/employee/submit`.
3.  **Route Protection (`frontend/middleware.ts`):** Implement Next.js middleware to check for the presence of the auth token.
    *   Redirect unauthenticated users trying to access `/hr/*` or `/employee/*` back to `/login`.
    *   Redirect authenticated users trying to access `/login` to their respective dashboards.