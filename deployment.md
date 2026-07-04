PasumaiCholai AWS Deployment & Infrastructure Overhaul
This plan details the strategy for deploying the PasumaiCholai application onto your existing AWS infrastructure alongside the MicroOps project, ensuring 100% isolation, zero downtime for MicroOps, and minimal AWS costs.

User Review Required
IMPORTANT

MicroOps Isolation Guarantee: This plan uses isolated Docker networks, unique host ports (e.g., 5001 instead of 5000), and separate Nginx virtual hosts (conf.d/pasumaicholai.conf) to guarantee that MicroOps remains completely untouched.

AWS Audit: Since I do not have direct access to your AWS account, I will provide a PowerShell/Bash script to audit your AWS infrastructure. Would you like me to execute AWS CLI commands from your local machine to audit automatically, or do you prefer to provide the audit details manually?

Open Questions
WARNING

AI Service: Your .env.example references AI_SERVICE_URL=http://127.0.0.1:8000. Is this an external service, or do we need to deploy a Python/FastAPI service alongside this as well?
MongoDB: Are you currently using MongoDB Atlas (cloud), or do you want to host MongoDB within Docker on the EC2 instance? (Atlas is highly recommended for production to save EC2 CPU/RAM).
Domain Name: What is the target domain name for PasumaiCholai? I will use pasumaicholai.example.com as a placeholder for the Nginx config.
Proposed Changes
1. Project Deployment Analysis & Architecture
Tech Stack:

Frontend: React + Vite, TypeScript, TailwindCSS
Backend: Node.js + Express, Mongoose, Socket.io, AWS SDK (S3, SNS, Polly, Comprehend)
Recommended Architecture:

EC2 Instance: Reuse existing MicroOps EC2 instance.
Frontend: Built into static files (dist) and served directly by the existing host Nginx (maximizes performance, uses 0 RAM).
Backend: Containerized in Docker (pasumaicholai-server), running on an isolated Docker network. Port 5000 mapped to host port 5001 to avoid conflicts.
Nginx Reverse Proxy: A new, completely separate file /etc/nginx/sites-available/pasumaicholai linked to sites-enabled. It will handle SSL termination and route /api to the backend Docker container, and serve frontend static files.
CI/CD: GitHub Actions workflows to build, test, and deploy via SSH to the EC2 instance. Only PasumaiCholai containers will be rebuilt and restarted.
Mermaid Architecture Diagram:

EC2 Instance (Shared)
Docker Network: microops-net
Docker Network: pasumaicholai-net
HTTPS :443
Domain 1
Domain 2
Domain 2 /api
MongoDB URI
AWS SDK
Internet
Host Nginx Reverse Proxy
MicroOps Services
PasumaiCholai Static Frontend
PasumaiCholai Docker API:5001
MongoDB Atlas
AWS Services: S3, SNS
2. AWS Infrastructure & Cost Optimization
To minimize costs, we will:

Reuse EC2 & Elastic IP: No new compute instances. We will pack PasumaiCholai onto the existing instance.
Reuse Host Nginx: Avoids running a secondary Nginx or Traefik proxy, saving RAM.
Database Offloading: Use MongoDB Atlas free/shared tier to save disk I/O and RAM on the EC2 instance, or run a lightweight MongoDB container if data must remain local.
CloudWatch: Avoid expensive CloudWatch agents. We will rely on Docker daemon logging (json-file with size rotation) and basic PM2/Docker stats.
3. Docker Configuration
I will create the following files in the workspace:

[NEW] server/Dockerfile
Multi-stage build for the Node.js backend. Uses node:20-alpine, installs dependencies, builds TypeScript, and runs the compiled output. Optimized for small image size.

[NEW] docker-compose.production.yml
Defines the pasumaicholai-server service. Sets restart policy to unless-stopped, configures logging limits (to prevent disk exhaustion), and assigns it to a dedicated pasumaicholai-net network.

4. Nginx Configuration
[NEW] nginx/pasumaicholai.conf
Production-grade Nginx configuration including:

HTTP to HTTPS redirection
SSL configuration (Let's Encrypt managed)
Gzip compression
Security headers (HSTS, X-Frame-Options)
Location blocks for static frontend and proxy pass for the backend API and WebSockets.
5. CI/CD Pipeline (GitHub Actions)
[NEW] .github/workflows/deploy.yml
A GitHub Actions workflow triggered on push to main:

Checks out code.
Installs dependencies and builds the frontend.
Builds the backend Docker image.
Uses appleboy/ssh-action to connect to EC2.
Pulls latest changes, rebuilds PasumaiCholai images, and restarts only PasumaiCholai containers using docker-compose up -d --build.
6. Environment Templates & Documentation
[NEW] .env.production.example
A structured, documented environment variables template categorized into Server, Database, AWS, external APIs, etc.

[NEW] DEPLOYMENT.md
A comprehensive, step-by-step runbook for the initial server setup, Docker installation, SSL generation, deployment, and rollback procedures.

Verification Plan
Automated Verification
The GitHub Actions pipeline will include basic build and type-check steps before attempting deployment.
Manual Verification
Review the generated docker-compose.production.yml to ensure no port conflicts (e.g., port 5001).
Review the nginx/pasumaicholai.conf to ensure it only listens on the new domain and routes correctly without touching default or MicroOps configs.
Test deployment manually before enabling CI/CD.