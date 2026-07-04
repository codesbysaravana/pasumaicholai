# PasumaiCholai

Welcome to the PasumaiCholai centralized repository. This repository contains both the frontend and backend source code, managed together for a streamlined development and deployment lifecycle.

## Project Structure
- `/client`: Frontend application built with React, Vite, and TailwindCSS.
- `/server`: Backend API built with Node.js, Express, TypeScript, and MongoDB.

## Deployment Strategy
PasumaiCholai is containerized using Docker and is designed to run isolated within its own Docker networks alongside existing infrastructure. CI/CD pipelines automate the testing and deployment to AWS EC2 instances, leveraging a reverse proxy (Nginx) for routing and SSL termination.
