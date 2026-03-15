# Frontend MVP Pages: Dashboard & Seed Repository

## Context
The Content Forest project requires a frontend interface for its MVP. The backend API for managing seeds is ready, but the frontend is currently empty. We need to design and implement the core pages: the Dashboard (Home) and the Seed Repository, following the specific "Anti-Mainstream" aesthetic guidelines provided by the user.

## Problem
- **Missing Interface**: Users cannot interact with the system visually; only API exists.
- **Aesthetic Requirement**: The user demands a unique "Cyber-Organic" look (Anti-SaaS, noise textures, non-standard layout), which standard UI libraries (like unmodified Tailwind/Material) do not provide.
- **Core Functionality**: Users need to view system status (Dashboard) and manage seeds (Repository).

## Solution
Implement the frontend using Nuxt 3 + Tailwind CSS (heavily customized).

### Key Features
1.  **Dashboard (Home)**:
    - High-level overview of the "Forest" (Seeds, Fruits, Evolution).
    - Visual representation of system activity.
    - Quick actions (Plant a Seed).
2.  **Seed Repository**:
    - List view of all seeds with status indicators.
    - Detail view for individual seeds (Markdown rendering).
    - Create/Edit/Archive functionality.
3.  **Aesthetic System**:
    - **Theme**: Dark mode with noise textures and organic accent colors (Neon Green/Amber).
    - **Typography**: Serif headings + Monospace body.
    - **Layout**: Asymmetric, broken grid, "natural" spacing.

## Out of Scope
- Fruit generation interface (will be handled in a separate change).
- User authentication (MVP assumes single user or local admin).
- Complex data visualization (will use simple stats for now).

## Success Metrics
- Users can view a list of seeds fetched from the backend.
- Users can create a new seed via the UI.
- The interface adheres to the "Anti-Mainstream" design guidelines (no default Tailwind look).
