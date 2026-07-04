<div align="center">

# 🌱 PasumaiCholai
### Empowering Agriculture Through Digital Innovation

**A robust, scalable, and multi-role monolithic platform connecting farmers, consumers, and agricultural experts.**

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/)
[![AWS](https://img.shields.io/badge/AWS-Integrated-orange.svg)](https://aws.amazon.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 🌟 Features

### 👨‍🌾 For Farmers
*   **Digital Marketplace:** Directly list and sell crops to consumers at competitive prices.
*   **AI Chatbot Assistant:** Multilingual crop advisory and disease identification using AI.
*   **Real-time Expert Consultation:** Live WebSocket-based chat with agricultural officers.
*   **Smart Pricing Intelligence:** Access to government-recommended crop prices to prevent exploitation.

### 🛒 For Consumers
*   **Direct Sourcing:** Buy fresh produce directly from local farmers without middlemen.
*   **Secure Payments:** Integrated with Stripe and Razorpay for seamless, secure transactions.
*   **Order Tracking:** Live status tracking from farm to doorstep.

### 🏛️ For Administrators & Delivery
*   **Role-Based Access Control (RBAC):** Tailored dashboards for Admins, Taluk Admins, and Delivery Personnel.
*   **Grievance Redressal System:** End-to-end ticketing and tracking for agricultural complaints.
*   **Logistics & Mapping:** Integrated Leaflet maps for precise farm location tracking.

---

## 🏛️ Architecture Overview

PasumaiCholai utilizes a **Monolithic Client-Server Architecture** optimized for rapid iteration, leveraging standard REST APIs alongside WebSockets for real-time capabilities.

```mermaid
graph LR
    A[React Client] -->|REST / HTTPS| B(Nginx Reverse Proxy)
    A -->|WebSocket / WSS| B
    B --> C{Express.js Server}
    C -->|Mongoose| D[(MongoDB)]
    C -->|AWS SDK| E[AWS S3, Polly, SNS]
    C -->|API| F[OpenAI / Stripe]
```

### 🛠️ Tech Stack

**Frontend**
*   **Core:** React 19, Vite, TypeScript
*   **State Management:** Zustand, React Context
*   **Routing:** React Router v7
*   **Styling:** TailwindCSS, Framer Motion
*   **Mapping:** Leaflet

**Backend**
*   **Core:** Node.js, Express.js, TypeScript
*   **Database:** MongoDB, Mongoose
*   **Real-time:** Socket.io
*   **Authentication:** JWT, bcryptjs

**Infrastructure & DevOps**
*   **Containerization:** Docker, Docker Compose
*   **Server:** AWS EC2, Nginx
*   **Cloud Services:** AWS (S3, SNS, Polly, Comprehend)

---

## 📂 Folder Structure

```text
pasumaicholai/
├── client/                 # Frontend React Application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── dashboards/     # Role-specific dashboard views
│   │   ├── features/       # Complex domain-specific modules (AI, Marketplace, Chat)
│   │   ├── routes/         # RBAC routing logic
│   │   └── store/          # Zustand global state stores
│   └── vite.config.ts      # Vite bundler configuration
│
├── server/                 # Backend Node.js Application
│   ├── src/
│   │   ├── chat/           # WebSocket logic for expert chat
│   │   ├── controllers/    # Express route handlers
│   │   ├── models/         # Mongoose schemas
│   │   ├── modules/        # Isolated sub-domains (e.g. crop-pricing)
│   │   ├── routes/         # API endpoint definitions
│   │   └── server.ts       # Application entry point
│   ├── Dockerfile          # Production Docker image configuration
│   └── .env.example        # Environment variable templates
│
└── docker-compose.production.yml # Orchestration for deployment
```

---

## 🚀 Installation & Local Development

### Prerequisites
*   Node.js (v18+)
*   MongoDB (Local instance or Atlas URI)
*   Docker & Docker Compose (optional, for prod-like setup)

### 1. Clone the repository
```bash
git clone https://github.com/codesbysaravana/pasumaicholai.git
cd pasumaicholai
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your local MongoDB URI and API keys
npm run dev
```
*The server will start on `http://localhost:5000`.*

### 3. Frontend Setup
```bash
cd ../client
npm install
cp .env.example .env
npm run dev
```
*The client will start on `http://localhost:5173`.*

---

## ⚙️ Environment Variables

### Server (`server/.env`)
| Variable | Description | Required | Example |
|---|---|---|---|
| `NODE_ENV` | Environment mode | Yes | `development` / `production` |
| `PORT` | API Server Port | Yes | `5000` |
| `MONGODB_URI` | MongoDB Connection String | Yes | `mongodb://localhost:27017/pasumai` |
| `JWT_SECRET` | Secure string for token signing | Yes | `super_secret_key_123` |
| `AWS_ACCESS_KEY_ID`| AWS Credentials | No | `AKIAIOSFODNN7EXAMPLE` |
| `STRIPE_SECRET_KEY`| Stripe Gateway Key | No | `sk_test_...` |

### Client (`client/.env`)
| Variable | Description | Required | Example |
|---|---|---|---|
| `VITE_API_BASE_URL` | Backend URL for Axios calls | Yes | `http://localhost:5000/api/v1` |

---

## 🚢 Deployment Guide

PasumaiCholai is optimized for Dockerized deployment on AWS EC2 behind an Nginx reverse proxy.

1.  **Server Provisioning:** Launch an AWS EC2 instance (Ubuntu).
2.  **Clone & Configure:** Clone the repository and configure production `.env` files.
3.  **Deploy via Docker Compose:**
    ```bash
    docker-compose -f docker-compose.production.yml up -d --build
    ```
4.  **Reverse Proxy Setup:** Map Nginx to route external port 80/443 traffic to the Docker container bound to `127.0.0.1:5001`.
5.  **SSL:** Secure the domain using Certbot (`sudo certbot --nginx`).

*Refer to `deployment.md` for detailed rollback and troubleshooting steps.*

---

## 🔐 Security Best Practices

*   **Authentication:** Stateless JWTs with strict role-based verification in middleware.
*   **Data Protection:** Bcrypt password hashing; input sanitization via Mongoose schemas.
*   **Infrastructure:** Application runs inside isolated Docker networks; external access is exclusively routed through SSL-terminated Nginx proxy.

---

## 📈 Future Roadmap

*   **Short-term:** Integrate comprehensive unit (Jest) and E2E (Playwright) testing suites. Implement `express-rate-limit` for API protection.
*   **Mid-term:** Migrate the monolith to a microservices architecture (separating Chat, Marketplace, and Core) to scale WebSocket connections horizontally.
*   **Long-term:** Introduce Redis caching for heavily read resources (Crop Prices, Schemes) to reduce database load and improve response times.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
