# Healthcare Clinic API Bruno Collection

Import this folder into Bruno and select the `local` environment.

1. Start the server with `npm run dev` from `server/`.
2. Run `Register user`, then `Login and get JWT`.
3. Copy the login response token into `environments/local.bru` as `token`.
4. Set `patientId` and `treatmentId` to IDs from your database.
5. For `Upload patient document`, place a permitted file beside the request or update the `@file(...)` path.

Supported upload types are PDF, JPEG, PNG, and text files up to 10 MB.
