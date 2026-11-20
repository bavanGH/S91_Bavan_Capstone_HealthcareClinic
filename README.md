# CareFlow - Healthcare Clinic Management

CareFlow is a web application for organizing clinic patient records and treatment histories. This project was developed as an internship capstone.

## 1. Project Title

**CareFlow: Healthcare Clinic Patient and Treatment Management System**

## 2. Problem Statement

Small clinics need a practical way to keep patient details and treatment records together. When this information is difficult to find or is spread across separate records, clinic staff can spend extra time locating a patient's history and maintaining up-to-date records.

## 3. Proposed Solution

CareFlow provides a browser-based interface for authorized users to manage patient profiles and treatment records in one application. It includes patient search, treatment history, and patient document attachments, backed by an Express API and MongoDB.

## 4. Technology Stack

- **Frontend:** React, Vite, JavaScript, and CSS
- **Backend:** Node.js and Express REST API
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens (JWT), password hashing with bcrypt, and optional Google OAuth
- **AI writing assistance:** Google Gemini through the server-side Google GenAI SDK
- **Tests:** Vitest for frontend utility tests and Node.js built-in test runner for backend service tests
- **Containers and web serving:** Docker, Docker Compose, and Nginx
- **Deployment configuration:** Netlify for the frontend and Render for the backend

## 5. Architecture Overview

The application uses a simple three-part architecture:

```text
React frontend -> Express REST API -> MongoDB
```

The React application calls the API for authentication and clinic records. Express handles requests and reads or writes data in MongoDB through Mongoose. In the Docker setup, Nginx serves the frontend and proxies API and health-check requests to the backend. Uploaded document files are stored by the backend, while their metadata is kept in MongoDB.

The backend can also call Gemini for a narrowly scoped writing suggestion. Gemini only suggests wording for clinician-written notes; it does not make diagnoses, treatment recommendations, or other medical decisions. The clinician remains responsible for reviewing and submitting the note.

## 6. Key Implemented Features

- Register and sign in with a username and password; passwords are hashed and successful sign-in returns an expiring JWT.
- Optional Google sign-in when OAuth credentials are configured.
- View a patient dashboard and search patients by name, patient ID, phone number, or email.
- Create, update, and deactivate patient records.
- View a patient's profile and treatment history.
- Create, view, and edit treatment records, including diagnosis, treatment plan, medications, notes, date, department, and status.
- Upload and list patient documents. Supported uploads are PDF, JPEG, PNG, and plain text files up to 10 MB.
- Request an optional Gemini wording suggestion for a clinician-written notes draft. The user must confirm that the draft is de-identified, and the suggestion is not saved unless the clinician accepts it and submits the treatment form.
- Health-check endpoint at `/health`.

## 7. Installation Instructions

### Prerequisites

- Node.js and npm
- MongoDB running locally, or access to a MongoDB deployment
- Docker Engine or Docker Desktop with the Docker Compose plugin if using the container method

There is no root-level npm package; install dependencies separately in `client` and `server`.

### Install dependencies

From the repository root, install each application's dependencies:

```powershell
cd server
npm ci
cd ..\client
npm ci
cd ..
```

## 8. Environment Setup

The backend loads environment variables from `server/.env` during local development. From the repository root in PowerShell, copy the example file:

```powershell
Copy-Item .\server\.env.example .\server\.env
```

Then set values appropriate for your environment. Do not commit `.env` files or share secrets.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. The backend has a local MongoDB fallback; Docker Compose requires this variable. |
| `JWT_SECRET` | Secret used to sign and verify application tokens. Set a strong, private value. Docker Compose requires it. |
| `PORT` | Backend listening port; defaults to `5000`. |
| `CLIENT_URL` | Frontend origin used for authentication redirects; defaults to the local Vite origin during backend development. |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | Optional OAuth callback URL. Configure it to match the Google OAuth application when Google sign-in is enabled. |
| `GEMINI_API_KEY` | Optional server-side key for Gemini notes suggestions. |
| `VITE_API_URL` | Optional frontend API base URL. Vite development uses its configured proxy, so this is not needed for the local development setup below. Set it to the backend origin when building the separately deployed frontend. |

For Docker Compose, create a root `.env` file containing your own `MONGODB_URI` and `JWT_SECRET`. Add the Google OAuth or Gemini variables only if you intend to use those optional integrations. Never put actual credentials in this README or in source control.

Gemini receives only the clinician-written draft submitted for wording assistance. Do not include patient names, IDs, diagnoses, or medical-record details in the draft; the application requires confirmation that it is de-identified.

## 9. Running the Project

### Run locally with npm

First, make sure MongoDB is available and configure `server/.env`. Start the backend and frontend in separate terminals from the repository root.

**Terminal 1 - backend:**

```powershell
cd server
npm run dev
```

**Terminal 2 - frontend:**

```powershell
cd client
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`). Vite proxies `/api` and `/health` requests to the backend at `http://localhost:5000`.

### Run with Docker Compose

Create the root `.env` file described above, then run from the repository root:

```sh
docker compose up --build
```

Open `http://localhost:8080`. To check the services and API health:

```sh
docker compose ps
curl http://localhost:8080/health
```

Stop the containers with `docker compose down`. The Compose configuration uses a named volume for uploaded documents so they persist when containers are recreated.

## 10. Testing Instructions

Run the frontend and backend tests from their respective directories:

```sh
cd client
npm run test
```

```sh
cd server
npm test
```

Additional available checks:

```sh
# From client/
npm run lint
npm run build

# From server/
npm run check
```

The Bruno collection in `bruno/healthcare-clinic-api` is also available for manually exercising API requests.

## 11. Deployment Links

- **Frontend (Netlify):** [https://healthcare-clinic-frontend.netlify.app/](https://healthcare-clinic-frontend.netlify.app/)
- **Backend API (Render):** [https://s91-bavan-capstone-healthcareclinic-1dx4.onrender.com](https://s91-bavan-capstone-healthcareclinic-1dx4.onrender.com)

Set `VITE_API_URL` in the Netlify site environment to point to the backend API. Deployment environment variables should be configured in the hosting provider; do not commit their values.

## 12. Folder Structure

```text
.
├── bruno/
│   └── healthcare-clinic-api/   # Bruno API requests and local environment
├── client/
│   ├── public/                  # Static assets
│   └── src/
│       ├── assets/              # Frontend assets
│       └── utils/               # Frontend utilities and Vitest tests
├── server/
│   ├── src/
│   │   ├── config/              # Database connection
│   │   ├── middleware/          # Authentication middleware
│   │   ├── models/              # Mongoose models
│   │   └── services/            # Backend services and Node.js tests
│   └── .env.example             # Backend environment variable template
├── compose.yaml                 # Docker Compose services and upload volume
├── netlify.toml                 # Netlify frontend build configuration
├── render.yaml                  # Render backend service configuration
└── README.md
```

The `client` and `server` folders each contain their own `package.json`, lockfile, and Dockerfile. The frontend Docker image uses Nginx to serve the built app and proxy API requests.

## 13. Future Improvements

Possible areas for future work, not claims about current functionality:

- Add automated API and end-to-end tests for complete user workflows.
- Add role-based permissions and an audit trail for access to sensitive records.
- Use managed, access-controlled object storage and define document retention and backup policies.
- Add deployment monitoring and production-specific security and operational checks.

## 14. Contributors

Contributor names are not listed here to avoid guessing. See the [repository contributor history on GitHub](https://github.com/bavanGH/S91_Bavan_Capstone_HealthcareClinic/graphs/contributors) for verified contributor information.
