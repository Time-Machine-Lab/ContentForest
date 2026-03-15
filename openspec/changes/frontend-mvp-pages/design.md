# Frontend MVP Pages: Design

## Architecture
- **Framework**: Nuxt 3 (SSR + SPA).
- **Styling**: Tailwind CSS (customized config) + CSS Variables for theming.
- **Icons**: Iconify (via `@iconify/vue` or `nuxt-icon`).
- **State**: `useState` (Nuxt) for simple global state; component-level state for forms.

## Design System: Cyber-Organic

### Color Palette
- **Background**: `#121212` (Void Black) + Noise Texture overlay.
- **Surface**: `#1e1e1e` (Dark Grey) with subtle border (`#333`).
- **Primary Accent**: `#4ade80` (Neon Green) - Represents Growth/Life.
- **Secondary Accent**: `#fbbf24` (Amber) - Represents Energy/Harvest.
- **Text**: `#e5e5e5` (Off-white) for headings, `#a3a3a3` (Muted) for body.

### Typography
- **Headings**: `Playfair Display` or `Merriweather` (Serif) - Organic, classic.
- **Body**: `JetBrains Mono` or `Inter` (Sans-Serif/Mono) - Technical, structured.

### Layout Principles
- **Asymmetry**: Avoid perfect centering. Use offset grids.
- **Texture**: No flat colors. Always add noise or gradients.
- **Micro-interactions**: Subtle hover effects (tilt, glow).

## Page Structure

### 1. Dashboard (`/`)
- **Header**: "Content Forest" logo (left), "Evolution Engine" subtitle (right).
- **Hero Section**:
  - "The Forest is Growing." (Large Serif Heading)
  - Quick Stats: Total Seeds, Active Fruits.
  - Call to Action: "Plant New Seed" (Primary Button).
- **Recent Activity**:
  - List of latest 5 generated fruits (mock data for now or fetch if available).
  - List of latest 5 active seeds.

### 2. Seed Repository (`/seeds`)
- **Filter Bar**: All / Active / Archived / Draft.
- **Grid**: Masonry layout of seed cards.
- **Seed Card**:
  - Title (H3 Serif).
  - Tags (Pills).
  - Status Indicator (Glowing dot).
  - Actions: Edit, Archive.

### 3. Seed Detail/Edit (`/seeds/[id]` & `/seeds/new`)
- **Editor**: Simple textarea for Markdown content (Monospace font).
- **Preview**: Rendered Markdown view.
- **Metadata Form**: Title, Tags input.
- **Actions**: Save, Publish.

## Technical Implementation

### Components
- `TheHeader.vue`: Global navigation.
- `TheFooter.vue`: Copyright and version.
- `SeedCard.vue`: Reusable card component.
- `StatsWidget.vue`: Dashboard statistics.
- `BaseButton.vue`: Custom styled button (primary/secondary/ghost).
- `BaseInput.vue`: Custom styled input fields.

### API Integration
- `useFetch('/api/seeds')`: Fetch seed list.
- `useFetch('/api/seeds', { method: 'POST' })`: Create seed.
- `useFetch('/api/seeds/[id]')`: Get seed details.
- `useFetch('/api/seeds/[id]', { method: 'PATCH' })`: Update seed.

### Directory Structure
```
content-forest-front/
├── assets/css/
│   └── main.css        # Global styles (fonts, noise)
├── components/
│   ├── TheHeader.vue
│   ├── SeedCard.vue
│   └── ...
├── layouts/
│   └── default.vue     # Main layout with noise background
├── pages/
│   ├── index.vue       # Dashboard
│   └── seeds/
│       ├── index.vue   # Repository
│       ├── [id].vue    # Detail/Edit
│       └── new.vue     # Create
└── nuxt.config.ts      # Tailwind & Iconify setup
```
