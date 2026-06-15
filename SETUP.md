# Velora AI Local Setup Guide

Welcome to the local development setup for Velora AI. Follow this step-by-step guide to get both the frontend and backend running locally on your machine.

**Estimated Setup Time**: 15 minutes

---

## Prerequisites
Before you start, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended, current project uses v22)
- [npm](https://www.npmjs.com/) (Node package manager)

---

## Step 1: External Services Setup
Velora AI integrates with several cloud providers. Set up accounts and gather credentials from the following services:

1. **MongoDB Atlas**
   - **Purpose**: Database for storing users, payments, transaction history, and website metadata.
   - **Action**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free tier cluster. Copy the connection URI string.
2. **Firebase Project**
   - **Purpose**: Client authentication flow and Admin SDK validation.
   - **Action**: Create a project in [Firebase Console](https://console.firebase.google.com/).
     - Go to Project Settings and add a Web App to get your **Firebase SDK config** details.
     - Go to Service Accounts, click **Generate New Private Key**, and download the JSON credentials file.
3. **OpenRouter**
   - **Purpose**: API proxy to run DeepSeek, Gemini, and other models for AI website generation.
   - **Action**: Sign up at [OpenRouter](https://openrouter.ai/), deposit a small balance or use free-tier models, and generate an API key.
4. **Razorpay**
   - **Purpose**: Payment processing and credit purchases.
   - **Action**: Create a dashboard account at [Razorpay](https://razorpay.com/), switch to **Test Mode**, and generate a Test API Key ID and Secret.

---

## Step 2: Configure Environment Variables
Copy and rename the `.env.example` templates in both frontend and backend directories:

### Backend Configuration
1. Navigate to `/backend`.
2. Copy the template:
   ```bash
   cp .env.example .env
   ```
3. Edit `backend/.env` with your collected credentials. Refer to the comments in [backend/.env.example](file:///d:/AI%20Website%20Builder%20with%20MERN%20Stack/backend/.env.example) for exact details.

### Frontend Configuration
1. Navigate to `/frontend`.
2. Copy the template:
   ```bash
   cp .env.example .env
   ```
3. Edit `frontend/.env` with your client-side credentials. Refer to [frontend/.env.example](file:///d:/AI%20Website%20Builder%20with%20MERN%20Stack/frontend/.env.example) for exact details. Note that all client variables must be prefixed with `VITE_`.

---

## Step 3: Install Dependencies and Start Development Servers
Start both the backend API and frontend React application.

### Start the Backend
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the API server in development mode:
   ```bash
   npm run dev
   ```
   *The server runs on http://localhost:8000.*

### Start the Frontend
1. Open a new terminal window/tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The React App runs on http://localhost:5173.*

---

## Testing Verification
Verify the configuration by running the integration tests.

### Run Backend Tests
Ensure your `.env` contains testing values (mock values are sufficient for local tests because they mock external networks):
```bash
cd backend
npm test
```

### Run Frontend Tests
Verify the component structure:
```bash
cd frontend
npm test
```
