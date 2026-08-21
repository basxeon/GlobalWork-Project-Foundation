# GlobalWork OS -- Project Foundation

> Internal Operations System for Visa & Work Permit Agencies (SME
> Edition)

## Vision

Build an internal operations platform to replace the current workflow of
using OneDrive, PDF readers, Word, and Excel.

### Primary Goal (V1)

-   Reduce repetitive work
-   Keep all case information in one place
-   Allow 2--3 staff members to collaborate efficiently
-   Prepare the foundation for a future Vertical SaaS

------------------------------------------------------------------------

# Development Strategy

**Do NOT build a SaaS first.**

Build an **Internal Operations System** that solves the real business
problem.

Roadmap:

    Current Workflow
    OneDrive
        ↓
    PDF
        ↓
    Copy & Paste
        ↓
    Word / Excel
        ↓
    Government Forms

    ↓

    GlobalWork OS

    Cases
    Documents
    PDF Viewer
    OCR
    Tasks
    Timeline
    Dashboard

------------------------------------------------------------------------

# Phase 0 -- Planning (1 Week)

## Deliverables

-   Vision
-   Business Process
-   Domain Model
-   Database Design
-   UI Wireframes
-   API Design
-   Development Standards

### Documents

    docs/
    ├── 01-Vision.md
    ├── 02-Business-Process.md
    ├── 03-Domain-Model.md
    ├── 04-Database.md
    ├── 05-UI-Wireframe.md
    ├── 06-API.md
    ├── 07-Roadmap.md
    └── 08-Coding-Standard.md

No coding in this phase.

------------------------------------------------------------------------

# Phase 1 -- MVP (4 Weeks)

## Goal

Replace OneDrive + PDF workflow.

## Modules

### WP001 -- Foundation

-   Next.js
-   NestJS
-   PostgreSQL
-   Docker Compose
-   Authentication

### WP002 -- Company

-   Company
-   Contact
-   Basic CRUD

### WP003 -- Applicant

-   Applicant Profile
-   Passport Information
-   Visa Information

### WP004 -- Cases

-   Create Case
-   Update Status
-   Search
-   Timeline

### WP005 -- Documents

-   Upload
-   PDF Preview
-   Version History

### WP006 -- Tasks

-   Assign Task
-   Due Date
-   Status
-   Checklist

### WP007 -- Dashboard

-   My Tasks
-   Open Cases
-   Waiting Customer
-   Completed Today

------------------------------------------------------------------------

# Phase 2 -- OCR & AI (2 Weeks)

### WP008 -- OCR

-   Read Passport
-   Read Documents

### WP009 -- AI Extraction

Extract:

-   Name
-   Passport Number
-   Nationality
-   Date of Birth
-   Expiry Date

Auto-fill the Applicant profile.

------------------------------------------------------------------------

# Phase 3 -- Productivity (2 Weeks)

### WP010 -- Timeline

Activity history.

### WP011 -- Notifications

-   New upload
-   Missing document
-   Due soon

### WP012 -- Calendar

Appointments and reminders.

------------------------------------------------------------------------

# MVP Database

    users
    companies
    applicants
    cases
    documents
    tasks
    timeline

------------------------------------------------------------------------

# Tech Stack

Frontend

-   Next.js
-   Tailwind CSS
-   shadcn/ui

Backend

-   NestJS

Database

-   PostgreSQL

Storage

-   MinIO

AI

-   OpenAI

OCR

-   Azure AI Document Intelligence

Deployment

-   Docker Compose

------------------------------------------------------------------------

# Definition of Done

Each Work Package must include:

-   Business Requirement
-   Database Changes
-   REST API
-   Frontend UI
-   Unit Tests
-   Manual Testing
-   Documentation

------------------------------------------------------------------------

# Success Criteria

The MVP is successful when:

-   Staff no longer use OneDrive as the primary workspace.
-   A case can be completed from a single browser tab.
-   Passport information is extracted automatically.
-   Tasks are assigned and tracked inside the system.
-   Daily work starts from the Dashboard.

------------------------------------------------------------------------

# Future Roadmap

After internal adoption:

-   Customer Portal
-   Workflow Engine
-   Multi-company
-   Billing
-   Analytics
-   AI Copilot
-   Multi-tenant SaaS


---

# Updated Architecture Decisions (2026-07-30)

## Guiding Principles

- Build for SME first (2–10 users).
- Optimize daily operations before building SaaS.
- Every feature should reduce manual work.
- Keep the architecture simple but extensible.

---

# Updated Storage Architecture

GlobalWork OS must support multiple storage providers through a single abstraction layer.

```
Frontend
    │
    ▼
Backend (NestJS)
    │
StorageService
    │
 ├── Local Drive
 ├── SFTP Server (NAS)
 ├── SMB / NFS Share (NAS)
 ├── MinIO (Future)
 └── Amazon S3 (Future)
```

Business modules must never access the filesystem directly.

---

## Storage Provider

The administrator can configure the storage backend from System Settings.

Supported providers:

- Local Drive
- SFTP Server
- SMB / NFS Share
- MinIO (Future)
- Amazon S3 (Future)

The active provider can be changed without modifying business logic.

---

## Storage Profiles

The system should support multiple storage profiles.

Example:

- Main Storage
- Backup Storage
- Archive Storage

Each profile contains:

- Name
- Provider Type
- Host
- Port
- Username
- Root Path
- Enabled
- Default

---

## StorageService Interface

Every storage driver must implement:

- upload()
- download()
- delete()
- move()
- copy()
- exists()
- createDirectory()
- getMetadata()

Business modules must use StorageService only.

---

## Recommended Deployment (SME)

```
Docker Compose

frontend
backend
postgres
redis

Storage
    ├── Local Drive
    └── NAS (SFTP or SMB)
```

The application runs in Docker while documents are stored outside containers.

---

## UI Design Strategy

Before implementation, create high-fidelity UI mockups for every page.

Required screens:

1. Login
2. Dashboard
3. Case List
4. Case Workspace
5. Document Viewer
6. Applicant Profile
7. Task Board
8. Calendar
9. Settings
10. Storage Settings

These mockups become the UI source of truth for development.

---

## Codex Development Rules

Codex must:

- Never hardcode storage paths.
- Never access fs directly from business modules.
- Always use StorageService.
- Follow UI mockups exactly.
- Implement one Work Package at a time.
- Do not redesign UI without updating mockups first.

---

## New Work Packages

WP008A - Storage Provider Framework

- StorageService
- Local Driver
- SFTP Driver
- SMB Driver
- Unit Tests

WP008B - Storage Management UI

- Storage Settings
- Test Connection
- Storage Profiles
- Default Provider

