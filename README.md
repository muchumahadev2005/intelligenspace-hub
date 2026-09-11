# 🚀 IntelligenSpace Hub

Autonomous AI Fleets, Multi-Model Routing, and Enterprise Voice Telephony Operations Platform.

---

## ⚡ Quick Start with Docker

Anyone who downloads or clones this repository can run the entire platform (Frontend, Backend API, and Cloud Database Connection) with a single command:

### 1. Clone the repository
```bash
git clone https://github.com/muchumahadev2005/intelligenspace-hub.git
cd intelligenspace-hub
```

### 2. Start all services
```bash
docker compose up --build
```

That's it! Docker will automatically:
- Build the **Node.js API backend** on port `3001`.
- Run database migrations automatically against **Neon PostgreSQL**.
- Build and serve the **TanStack Start / Nitro frontend** on port `8080`.

### 3. Open in your browser
- **Web Application**: [http://localhost:8080](http://localhost:8080)
- **API Health Check**: [http://localhost:3001/health](http://localhost:3001/health)
- **API Base URL**: `http://localhost:3001/api/v1`

---

## 🛠️ Tech Stack

- **Frontend**: TanStack Start, React 19, Tailwind CSS, Lucide Icons, Recharts, Radix UI.
- **Backend**: Hono Web Framework, `@hono/node-server`, Node.js.
- **Database**: Serverless PostgreSQL hosted on **Neon** (`pg` pooler with SSL).
- **AI Routing**: Multi-model routing across 13+ flagship engines via OpenRouter.
- **Containerization**: Docker & Docker Compose with multi-stage Alpine builds.

---

## 🔑 Demo Credentials

To test the application immediately after booting:
- **Email**: `demo@intelligenspace.io`
- **Password**: `demo1234`
- **Admin Access**: Log in with `mahadevmuchu9977@gmail.com` to access the Admin Console.
