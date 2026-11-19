# Healthcare Clinic Patient Treatment History Management System

## Project Idea

Small healthcare clinics often maintain patient information using paper files or disconnected systems. This makes it difficult to retrieve complete treatment histories and can lead to delays, duplicate tests, and inconsistent patient care.

The **Healthcare Clinic Patient Treatment History Management System** is a centralized web application that allows authorized clinic staff and healthcare professionals to manage patient information and quickly access complete treatment histories.

## Main User Flow

Login → Dashboard → Search Patient → Select Patient → View Patient Profile → View Treatment History → View Treatment Record

The system will also allow authorized users to add new treatment records to a patient's history.

## Live Deployment

- **Frontend:** [CareFlow on Netlify](https://healthcare-clinic-frontend.netlify.app/)
- **Backend API:** [CareFlow API on Render](https://s91-bavan-capstone-healthcareclinic-1dx4.onrender.com)

For the Netlify production environment, set `VITE_API_URL` to
`https://s91-bavan-capstone-healthcareclinic-1dx4.onrender.com` (without a trailing slash).
The local `client/.env` file is ignored and should not be committed.

## Docker

Prerequisites: Docker Engine or Docker Desktop with the Compose plugin. The app
uses the existing MongoDB Atlas database; provide your own Atlas URI and a
strong JWT secret. Create a root `.env` file (ignored by Git) with:

```dotenv
MONGODB_URI=<your MongoDB Atlas URI>
JWT_SECRET=<your strong random secret>
```

`CLIENT_URL` defaults to `http://localhost:8080` and `PORT` is set to `5000`.
The frontend image builds with an empty `VITE_API_URL`, so API requests use the
same-origin Nginx proxy.
Google OAuth is optional; configure `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the root `.env` only if
using Google sign-in. Set the redirect URI to the public frontend origin plus
`/api/auth/google/callback`.

AI notes suggestions are optional. Set `GEMINI_API_KEY` in the ignored root
`.env` for Docker Compose or in `server/.env` for local backend development.
Compose passes it only to the backend. Suggestions use Gemini 3.5 Flash-Lite and
send only the clinician-written notes draft; the form requires confirmation
that it is de-identified. Never include patient names, IDs, diagnoses, or
medical-record details. Suggestions are drafts and are saved only after they
are accepted and the treatment form is submitted. The required placeholder is
documented in `server/.env.example`.

Build and start both services:

```sh
docker compose up --build -d
```

Open `http://localhost:8080`. Verify the API through the frontend proxy:

```sh
docker compose ps
curl http://localhost:8080/health
```

Follow service logs with `docker compose logs -f`; stop the services with
`docker compose down`. The named `uploads` volume persists uploaded documents
when the containers stop.

## Planned Features

- Secure user login
- Dashboard with patient-related information
- Patient search and patient list
- Patient profile management
- Treatment history
- Treatment record details
- Add new treatment records
- Empty and error states
- Simple and easy navigation

## Day-by-Day Development Plan

### Day 1 — Project Setup and UX Planning
- Create and configure the GitHub repository
- Set up the project structure
- Create the Mock UX
- Define the main user flow and screens

### Day 2 — Frontend Setup
- Set up the frontend
- Create the main application layout
- Implement navigation and dashboard structure

### Day 3 — Patient Management
- Create patient search and patient list
- Create patient profile
- Implement patient information management

### Day 4 — Treatment History
- Create treatment history interface
- Display treatment records
- Create treatment record details

### Day 5 — Add Treatment Records
- Create the add treatment record form
- Implement form validation
- Save and display new treatment records

### Day 6 — Backend and Database Integration
- Set up backend APIs
- Connect the application to the database
- Connect patient and treatment data with the frontend

### Day 7 — Testing and Error Handling
- Test the main user workflows
- Handle empty states and error states
- Fix identified issues

### Day 8 — Final Improvements
- Improve usability and navigation
- Review the complete application
- Fix remaining bugs

### Day 9 — Final Testing and Documentation
- Perform final testing
- Update project documentation
- Prepare the project demonstration

## Mock UX Design

The Mock UX represents the planned user interface and main workflows of the application before implementation.

### Main Screens

1. Login
2. Dashboard
3. Patient Search / Patient List
4. Patient Profile
5. Treatment History
6. Treatment Record Details
7. Add New Treatment Record

### Primary Workflow

Clinic staff logs in → searches for a patient → selects the patient → views the patient profile → checks the complete treatment history → opens a treatment record when detailed information is required.

## Repository

This repository contains the development work for the Healthcare Clinic Patient Treatment History Management System.

## Authentication

The server provides username/password registration and login. Passwords are stored as bcrypt hashes, and successful login returns an expiring JWT used to access patient and treatment APIs.

Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `PORT`, and a long random `JWT_SECRET` before starting the server.

- `POST /api/auth/register` creates a user with a password of at least 8 characters.
- `POST /api/auth/login` returns a bearer token.
- `GET /api/auth/google` starts optional Google OAuth login and returns the same application JWT after callback.
- Patient and treatment requests require `Authorization: Bearer <token>`.

To enable Google login, create a Google OAuth web application, add `http://localhost:5000/api/auth/google/callback` as an authorized redirect URI, and set the Google variables in `server/.env`.

Authenticated users can upload PDF, JPEG, PNG, and text documents up to 10 MB from a patient profile. Files are stored in `server/uploads/` and document metadata is linked to the patient in MongoDB.

## Deploy the Backend on Render

The root `render.yaml` defines the backend as a Node web service using `server/` as its root directory. In Render, select **New > Blueprint**, connect this repository, and apply the blueprint.

Set these environment variables in the Render service before testing:

- `MONGODB_URI`: a hosted MongoDB connection string, such as MongoDB Atlas.
- `JWT_SECRET`: a long random signing secret.
- `CLIENT_URL`: `https://healthcare-clinic-frontend.netlify.app`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: optional Google OAuth credentials.
- `GOOGLE_REDIRECT_URI`: `https://s91-bavan-capstone-healthcareclinic-1dx4.onrender.com/api/auth/google/callback` when Google login is enabled.

Render should report `/health` as healthy after deployment. The deployed API base URL is
`https://s91-bavan-capstone-healthcareclinic-1dx4.onrender.com`.

## GitHub Repository Setup

- Main branch: `main`
- Development branch: `feature/repository-setup`
- Repository visibility: Public
- README created as part of the initial Capstone repository setup
