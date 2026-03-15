# Frontend MVP Pages: Implementation Plan

## Phase 1: Setup & Design System
- [ ] 1. **Initialize Tailwind CSS**:
  - Install `@nuxtjs/tailwindcss` (if not present) and `nuxt-icon` or `@iconify/vue`.
  - Configure `tailwind.config.js`:
    - Extend colors with `#4ade80`, `#fbbf24`, `#121212`.
    - Add custom fonts (`Playfair Display`, `JetBrains Mono`).
- [ ] 2. **Global Styles**:
  - Create `assets/css/main.css`.
  - Add noise texture overlay (`.noise-overlay`).
  - Set default font family and background color.
- [ ] 3. **Layout**:
  - Create `layouts/default.vue` with noise background and `TheHeader` slot.

## Phase 2: Core Components
- [ ] 4. **UI Primitives**:
  - Create `components/BaseButton.vue`: Primary (Neon Green), Secondary (Amber), Ghost (Outline).
  - Create `components/BaseInput.vue`: Styled text inputs and textareas.
  - Create `components/TheHeader.vue`: Navigation with logo and links.
  - Create `components/TheFooter.vue`: Copyright and version info.
- [ ] 5. **Feature Components**:
  - Create `components/SeedCard.vue`: Card displaying seed title, tags, status, created_at.
  - Create `components/StatsWidget.vue`: Dashboard stats (Total Seeds, Active Fruits).

## Phase 3: Pages Implementation
- [ ] 6. **Dashboard (`/`)**:
  - Implement `pages/index.vue`.
  - Fetch latest 5 active seeds.
  - Display `StatsWidget` and "Recent Activity".
  - Add "Plant New Seed" CTA.
- [ ] 7. **Seed Repository (`/seeds`)**:
  - Implement `pages/seeds/index.vue`.
  - Fetch all seeds with pagination or infinite scroll.
  - Add filtering by status (All/Active/Archived).
  - Render `SeedCard` grid (Masonry layout if possible).
- [ ] 8. **Create Seed (`/seeds/new`)**:
  - Implement `pages/seeds/new.vue`.
  - Form with Title, Content (Markdown), Tags.
  - Submit to `POST /api/seeds/draft`.
- [ ] 9. **Seed Detail/Edit (`/seeds/[id]`)**:
  - Implement `pages/seeds/[id].vue`.
  - Fetch seed details by ID.
  - Edit mode: Update Title/Content/Tags (`PATCH /api/seeds/[id]`).
  - View mode: Render Markdown content.
  - Actions: Publish, Archive, Delete.

## Phase 4: Integration & Refinement
- [ ] 10. **API Integration**:
  - Verify API endpoints (`/api/seeds`, etc.) work correctly with frontend.
  - Handle loading and error states.
- [ ] 11. **Refinement**:
  - Add page transitions (`page-enter-active`, `page-leave-active`).
  - Polish hover effects and typography.
  - Ensure mobile responsiveness.
