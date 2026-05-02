# Reclaim — Production Deployment Plan

**Version:** 1.0
**Date:** 2026-05-01
**Project:** Reclaim — AI-Native Expense Reimbursement Platform (UM Hackathon 2026)

---

## 1. Document Overview

### Background

Reclaim is an AI-native expense reimbursement platform built for UM Hackathon 2026. The platform automates compliance evaluation of employee expense claims using three LangGraph agentic pipelines (Policy Agent, Document Agent, Compliance Agent). It provides two user-facing portals: an Employee Portal for claim submission and an HR Portal for policy management, triage, and final decisions.

This deployment plan covers the initial production release of the full Reclaim stack — FastAPI backend, Next.js frontend, and PostgreSQL+pgvector database — onto a self-managed VPS orchestrated via Dokploy.

### Objectives

A successful deployment is defined by the following outcomes:

- All three containerized services (database, backend, frontend) pass their health checks and remain stable.
- The `/health` endpoint returns `{"status": "healthy", "database": "connected"}`.
- Zero application downtime during updates via Dokploy's rolling container replacement.
- All runtime secrets are injected via Dokploy's Environment UI — no secrets committed to version control.
- The Cloudflare-proxied domain is live and HTTPS-terminated.
- LangSmith tracing is active and capturing agent execution traces.
- UFW firewall is configured to accept traffic exclusively from Cloudflare IP ranges on ports 80/443.
- Application-level rate limiting is active on all AI-heavy endpoints.

### Scope

**In scope:**
- PostgreSQL 16 + pgvector database container (`ankane/pgvector:v0.5.1`)
- FastAPI backend container (Python 3.13, `uv.Dockerfile`)
- Next.js 16 frontend container (Node 22 Alpine, multi-stage build)
- Dokploy deployment configuration and Autodeploy webhook
- Cloudflare DNS proxying and SSL
- UFW firewall hardening
- Application-level rate limiting via `slowapi`
- LangSmith observability integration

**Out of scope for this release:**
- Distributed Redis-based rate limiting
- Automated PostgreSQL volume backups to S3/MinIO
- Multi-node Docker Swarm high-availability cluster
- HashiCorp Vault secret management

---

## 2. Roles & Responsibilities

| Role | Name | Responsibility |
|---|---|---|
| Deployment Lead | (put primary engineer's name here) | Executes all deployment steps, monitors rollout, triggers rollback if needed |
| QA / Reviewer | (put reviewer's name here) | Signs off on pre-deployment checklist, runs post-deployment functional tests |
| Approver | (put team lead / hackathon judge liaison's name here) | Provides final go/no-go decision before traffic is routed to the new release |

---

## 3. Target Architecture & Environments

### Infrastructure

| Component | Specification |
|---|---|
| VPS Host | (put VPS provider and plan details here — e.g., Hetzner CX21, 2 vCPU / 4 GB RAM) |
| OS | (put OS version here — e.g., Ubuntu 22.04 LTS) |
| Orchestration | Dokploy (self-hosted, running on the VPS) |
| Container Runtime | Docker + Docker Compose |
| Reverse Proxy / SSL | Traefik (managed by Dokploy) + Cloudflare WAF (Orange Cloud DNS proxy) |
| Domain | (put production domain here — e.g., reclaim.yourdomain.com) |

**Service topology (production):**

```
Internet → Cloudflare WAF → VPS (UFW → Traefik → Docker network)
                                      ├── frontend  (port 3000, internal)
                                      ├── backend   (port 8000, internal)
                                      └── db        (port 5432, internal only)
```

In production, no container ports are exposed directly to the host (`expose` only). All inbound HTTP/HTTPS traffic arrives via Cloudflare → Traefik. The database port is never accessible from outside the Docker network.

### Dependencies

| Service | Provider | Purpose |
|---|---|---|
| LLM (text) | OpenRouter → `google/gemini-3.1-flash-lite-preview` | Primary reasoning for compliance and policy agents |
| LLM (vision) | OpenRouter → `qwen/qwen3.5-flash-02-23` | OCR / receipt image extraction |
| Embeddings | OpenRouter → `openai/text-embedding-3-small` | Policy section vector embeddings (1536-dim, stored in pgvector) |
| Observability | LangSmith | LangGraph agent trace capture, token usage monitoring |
| DNS / WAF | Cloudflare | DDoS protection, WAF, HTTPS termination at edge |

### Configuration Management

All runtime secrets and environment-specific values are injected at deploy time through **Dokploy's Environment UI** — never stored in `.env` files committed to the repository. The following variables must be set before deployment:

**Backend environment variables:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@db:5432/smart_reimburse`) |
| `SECRET_KEY` | JWT signing secret — must differ from the default placeholder |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM and embedding calls |
| `CHAT_MODEL` | Primary LLM model ID (e.g., `google/gemini-3.1-flash-lite-preview`) |
| `VISION_MODEL` | Vision model ID for OCR (e.g., `qwen/qwen3.5-flash-02-23`) |
| `EMBEDDING_MODEL` | Embedding model ID (e.g., `openai/text-embedding-3-small`) |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL |
| `FRONTEND_URL` | Production frontend URL for CORS allow-origin |
| `LANGCHAIN_TRACING_V2` | `true` to enable LangSmith tracing |
| `LANGCHAIN_ENDPOINT` | LangSmith ingestion endpoint |
| `LANGCHAIN_API_KEY` | LangSmith API key |
| `LANGCHAIN_PROJECT` | LangSmith project name |

**Frontend environment variables:**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Browser-accessible backend URL (used by client-side fetch) |
| `INTERNAL_API_URL` | Container-internal backend URL (`http://backend:8000`) for server-side requests |

---

## 4. What We Built & Why: Current Production Implementation

This section documents every measure that has been implemented and is live in the current production environment, along with the engineering rationale behind each decision.

### 4.1 Containerized Stack Deployed via Dokploy

**What:** All three application services — FastAPI backend, Next.js frontend, and PostgreSQL+pgvector database — are containerized using Docker and orchestrated through a production-grade `docker-compose.production.yml`. The stack is hosted on a self-managed VPS and deployed via **Dokploy**, a lightweight self-hosted deployment platform built on Docker Swarm.

**Why:** Dokploy occupies a deliberate "Goldilocks zone" between raw VPS management and heavyweight PaaS platforms. Compared to Coolify, Dokploy operates at dramatically lower resource overhead (~350 MB RAM), preserving critical headroom for PostgreSQL's buffer pools and the parallel LangGraph agent execution that is central to Reclaim's AI pipeline. Compared to managing raw Docker commands on a Linux terminal, Dokploy provides a human-maintainable dashboard with one-click visual monitoring, centralized log aggregation, easy SSL certificate provisioning via Traefik, and native Docker Swarm support — without sacrificing underlying infrastructure control.

In production, no container ports are bound to the host machine (all services use `expose` rather than `ports`), meaning the database and backend are never reachable from the public internet — only through Traefik's internal routing.

### 4.2 Continuous Deployment via GitHub SSH Deploy Key + Autodeploy Webhook

**What:** Dokploy is connected to the GitHub repository via a dedicated, **read-only SSH Deploy Key**. Dokploy's Autodeploy feature is enabled, so every push to the `main` branch triggers a webhook that automatically rebuilds the Docker images and performs a **rolling, zero-downtime container replacement** of the live services.

**Why:** Manual deployments are a primary source of human error — wrong environment variables, missed migration steps, or stale containers running outdated images. By establishing a Continuous Deployment (CD) pipeline where `git push` is the single deployment primitive, we eliminate the entire class of "forgot to redeploy" failures. The read-only deploy key is a least-privilege security boundary: it can pull code but cannot push, create branches, or alter repository state, so a compromised VPS cannot tamper with the source of truth.

The rolling update strategy means Dokploy starts the new container, waits for its health check to pass, and only then terminates the old one — preserving availability through the transition.

### 4.3 Runtime Secret Management via Dokploy Environment UI

**What:** All sensitive runtime credentials — PostgreSQL credentials, OpenRouter API keys, LangSmith API key, and the JWT `SECRET_KEY` — are injected exclusively through **Dokploy's Environment UI**. No `.env` files containing real values are committed to the repository. The codebase only contains `.env.example` files with placeholder values.

**Why:** Credentials committed to a Git repository are permanently exposed in history, even if later deleted. By keeping all secrets in Dokploy's internal environment store, the credentials exist only in the server's runtime memory and are never serialized into version control. This is the minimum viable secret management posture for any production system.

### 4.4 Cloudflare Proxied DNS (Orange Cloud WAF)

**What:** The production domain's DNS A record is set to **Proxied** (Cloudflare's "orange cloud" mode), routing all inbound HTTP/HTTPS traffic through Cloudflare's global network before it reaches the VPS.

**Why:** This provides a frontline Web Application Firewall (WAF) at zero marginal cost. Cloudflare absorbs volumetric DDoS attacks, filters known malicious traffic patterns, and terminates HTTPS at the edge — all before a single packet reaches our server. For a hackathon project with limited backend resources, this is especially critical: a DDoS that would saturate the VPS is absorbed by Cloudflare's distributed infrastructure instead.

### 4.5 UFW Firewall: Cloudflare-Only Inbound Traffic

**What:** The VPS firewall (UFW — Uncomplicated Firewall) is configured to **deny all direct public traffic on ports 80 and 443**, with explicit allow rules for each IP range published in Cloudflare's official IP list. All other inbound traffic to those ports is dropped at the kernel level.

**Why:** Cloudflare's WAF only protects traffic that flows through it. Without this firewall rule, a sufficiently motivated attacker who discovers the VPS's raw IP address can bypass Cloudflare entirely by sending HTTP requests directly to the server — completely circumventing DDoS protection, WAF filtering, and rate limiting. This UFW rule enforces a **zero-trust network boundary**: the only path into the application is through Cloudflare.

### 4.6 Application-Level Rate Limiting via slowapi

**What:** Strict per-user rate limits are enforced at the FastAPI application layer using **slowapi** on all AI-intensive endpoints (`/api/v1/reimbursements`, `/api/v1/documents`, `/api/v1/policies`). Requests exceeding the configured threshold receive an HTTP `429 Too Many Requests` response.

**Why:** Reclaim's AI pipeline makes calls to paid external APIs (OpenRouter for LLM and embedding inference) on every claim submission and policy upload. Without rate limiting, a single malicious actor or a runaway client script could spam these endpoints and exhaust the entire OpenRouter credit balance in minutes — taking the platform offline for all users. Rate limiting is therefore **LLM budget protection** as much as it is abuse prevention.

### 4.7 AI Observability via LangSmith

**What:** LangSmith tracing is integrated into all three LangGraph pipelines (Policy Agent, Document Agent, Compliance Agent). When `LANGCHAIN_TRACING_V2=true` is set, every agent run — including individual ReAct tool calls, intermediate reasoning steps, token counts, and latencies — is captured and visible in the LangSmith dashboard.

**Why:** Traditional server monitoring (CPU, memory, HTTP status codes) is blind to AI-specific failure modes. A receipt-auditing agent could complete its HTTP call successfully from the server's perspective while simultaneously hallucinating a compliance judgment, exceeding its tool call budget, or entering a reasoning loop. LangSmith provides granular visibility into the *logic* of each agent execution, enabling us to catch and debug these failures at the prompt and reasoning level — not just at the infrastructure level.

---

## 5. Deployment Strategy

### Methodology

**Rolling container replacement** via Dokploy. When a new image is built, Dokploy brings up the new container, waits for its health check to pass, then terminates the old container. This achieves zero-downtime updates for stateless services (frontend, backend).

The database container is not replaced during application deployments; schema changes are applied via Alembic migrations (`alembic upgrade head`) that run automatically as the first step of the backend container's startup command.

### CI/CD Integration

| Step | Mechanism |
|---|---|
| Code push to `main` | Triggers GitHub webhook to Dokploy |
| Dokploy webhook received | Pulls latest commit via read-only SSH Deploy Key |
| Image build | Dokploy runs `docker compose -f docker-compose.production.yml build` |
| Container replacement | Rolling update: new container starts → health check passes → old container stops |
| Migration | `alembic upgrade head` runs automatically as part of backend container startup |

The SSH Deploy Key stored in Dokploy has **read-only** repository access. It cannot push, create branches, or modify repository state.

---

## 6. Pre-Deployment Checklist

Complete every item before executing a deployment. The QA/Reviewer signs off on this section.

### Infrastructure Readiness

- [ ] VPS has sufficient free memory for all three containers + Dokploy overhead (~350 MB for Dokploy, ~512 MB for Postgres buffer pool, backend headroom for parallel agent execution)
- [ ] Docker and Docker Compose versions are up to date on the VPS
- [ ] Traefik is running and SSL certificates are provisioned for the production domain
- [ ] Cloudflare DNS record is set to **Proxied** (orange cloud) — not DNS-only
- [ ] UFW is configured: ports 80/443 open **only to Cloudflare IP ranges**, all other direct traffic denied
- [ ] Dokploy Autodeploy webhook is active and points to the correct branch (`main`)

### Secret Verification

- [ ] All backend environment variables listed in Section 3 are set in Dokploy's Environment UI
- [ ] `SECRET_KEY` is a cryptographically random string (not the default placeholder)
- [ ] `DATABASE_URL` uses the production credentials (not `admin/password`)
- [ ] No `.env` files with real credentials exist in the repository

### Data Preservation

- [ ] Manual snapshot of the `postgres_data` Docker volume taken before deployment
- [ ] Snapshot stored offsite or verified restorable — (put backup destination here, e.g., Cloudflare R2 bucket path)

### Migration Testing

- [ ] Alembic migration scripts have been dry-run against a staging database matching the current production schema
- [ ] All migration files present in `backend/alembic/versions/` are accounted for

### API Quota Check

- [ ] OpenRouter credit balance confirmed sufficient for expected production load
- [ ] LangSmith project exists and API key is valid
- [ ] Rate limiting middleware (`slowapi`) is deployed and configured on AI endpoints (`/api/v1/reimbursements`, `/api/v1/documents`, `/api/v1/policies`)

### Code Readiness

- [ ] `/test` router (marked DISPOSABLE in `main.py`) is removed or disabled for production
- [ ] `WATCHFILES_FORCE_POLLING` is absent from the production compose file (confirmed)
- [ ] Seed scripts (`seed_demo_employees.py`, `seed_mock_policy.py`, `seed_mock_data.py`) are **not** in the production container startup command (confirmed — production compose omits these)

---

## 7. Future Architecture Roadmap

The following enhancements are deliberately deferred due to the time and budget constraints of the hackathon phase. Each is architected as a concrete next step for when Reclaim moves into a funded, scaling phase. They are not missing features — they are conscious trade-offs acknowledged upfront.

### 7.1 Distributed Redis-Based Rate Limiting

**What:** Deploy a centralized Redis cluster and replace the current in-memory `slowapi` rate limit counters with Redis-backed state shared across all backend container instances.

**Why it matters:** The current rate limiting tracks request counts in the memory of each individual container. This works correctly when only one backend container is running, but breaks under horizontal scale: if two backend replicas exist and a user sends five requests to each, they have effectively sent ten requests against a limit of five — the containers have no shared counter. As Reclaim scales out to multiple backend replicas (see 7.3), in-memory rate limiting becomes trivially bypassable. A centralized Redis store gives every replica a single source of truth for rate limit state, making enforcement globally consistent regardless of how many instances are running.

### 7.2 Automated PostgreSQL Volume Backups to S3/MinIO

**What:** Implement a scheduled job (e.g., a cron container using `pg_dump`) that exports the PostgreSQL database and streams the dump to an external S3-compatible object store such as Cloudflare R2 or a self-hosted MinIO instance. Backups would run on a defined cadence (e.g., daily) with retention policies.

**Why it matters:** Currently, all persistent data — employee records, claim submissions, extracted receipt data, policy embeddings — lives exclusively on the VPS's local disk volume. If the host provider experiences a catastrophic hardware failure, data corruption, or accidental volume deletion, every byte of production data is permanently lost with no recovery path. External backups decouple data durability from the health of a single physical server. For a reimbursement platform handling real financial records, this is not optional at scale — it is a baseline compliance requirement.

### 7.3 High Availability via Multi-Node Docker Swarm

**What:** Evolve the current single-VPS Dokploy deployment into a multi-node **Docker Swarm cluster**, distributing backend and frontend service replicas across at least three physical servers in geographically distinct availability zones. The database would be promoted to a managed, replicated PostgreSQL service (e.g., a primary + read replica configuration).

**Why it matters:** The current architecture has a single point of failure (SPOF): if the VPS's host hypervisor crashes, the network switch fails, or the data center loses power, the entire Reclaim platform goes offline instantly. There is no failover. For a hackathon this is an acceptable trade-off; for a production reimbursement platform processing real employee expense data, it is not. A multi-node Swarm distributes service replicas so that the failure of any single node triggers automatic rescheduling of its containers onto surviving nodes — eliminating the SPOF and providing the redundancy required for meaningful uptime SLAs.

### 7.4 Dynamic Secret Management via HashiCorp Vault

**What:** Migrate all API keys and credentials from Dokploy's internal environment store to **HashiCorp Vault**, configured to issue short-lived, dynamically generated credentials to the backend at runtime. The application would fetch secrets from Vault on startup rather than reading static environment variables.

**Why it matters:** The current model stores secrets as long-lived static strings in Dokploy's internal database, which lives on the same VPS as the application. If the VPS is fully compromised — root access gained by an attacker — all credentials are immediately readable from the environment. Vault solves this by issuing credentials with a short TTL (e.g., 1 hour). Even if an attacker captures a credential from a running process, it expires before they can weaponize it against the upstream API provider. Vault also provides a full audit log of every secret access event — a hard compliance requirement in regulated industries handling financial data.
