# AutoCore Mobile Auth QA

## Scope
- Splash boot and auth restore
- Email/password sign-in
- Password reset
- Firestore profile hydration
- Company and RBAC gating
- Logout and relaunch

## Manual Matrix

### 1. Cold launch with valid session
- Precondition: user already signed in once on the device.
- Expectation:
  - native splash stays visible during bootstrap
  - app restores Firebase session automatically
  - profile, company, and memberships hydrate without showing login
  - user lands in authenticated shell

### 2. Cold launch without session
- Precondition: fresh install or after logout.
- Expectation:
  - app routes to `Login`
  - no protected shell is visible behind auth
  - version string is visible at the bottom

### 3. Invalid credentials
- Steps:
  - enter invalid email format
  - enter valid email with wrong password
- Expectation:
  - inline validation blocks malformed email / short password
  - Firebase auth errors map to product-safe Russian copy
  - sign-in button stays disabled while loading

### 4. Offline login attempt
- Precondition: disable network on simulator/device.
- Expectation:
  - offline warning is shown
  - sign-in and password reset actions stay disabled
  - no uncaught error or blank screen

### 5. Password reset request
- Steps:
  - open `ForgotPassword`
  - submit a valid account email
- Expectation:
  - success alert confirms the reset email was sent
  - link back to login works

### 6. Logout and relaunch
- Steps:
  - sign in
  - trigger logout from authenticated shell or account tab
  - terminate and relaunch the app
- Expectation:
  - local auth state clears
  - app opens on login screen
  - previous profile/company state does not leak

### 7. Firestore user without company
- Precondition: `users/{uid}` exists but `companyId` is null.
- Expectation:
  - login succeeds
  - authenticated shell shows “Нужно выбрать компанию”
  - app does not crash or loop

### 8. Inactive employee membership
- Precondition: `companies/{companyId}/employees/{uid}.isActive = false`.
- Expectation:
  - login succeeds
  - authenticated shell shows restricted access state
  - role/company snapshot still renders for debugging

### 9. Hydration failure / missing permissions
- Precondition: remove Firestore read access or break employee/company docs.
- Expectation:
  - session does not hard-crash
  - profile error card is rendered
  - logout remains available
