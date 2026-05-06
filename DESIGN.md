# Content Forest Design System

## 1. Design Direction

Content Forest uses a **Quiet Command Workspace** style inspired by Raycast: fast, focused, keyboard-friendly, compact, and calm. The product should feel like a professional creative operating system for growing content trees, not a marketing-heavy AI tool or a traditional admin dashboard.

Primary references:

- Raycast: command-first productivity, compact panels, polished dark surfaces, fast actions.
- Linear: restrained density, crisp hierarchy, quiet status language.
- tldraw / node editors: canvas-first interaction and spatial work.

## 2. Product Personality

- **Fast**: every major workflow should feel immediate, especially create, search, command, select, and retry.
- **Focused**: the active seed, selected node, and growth input should always be visually clear.
- **Calm**: avoid decorative noise, oversized gradients, and playful illustrations.
- **Precise**: node states, actions, and feedback must be crisp and unambiguous.
- **Creative but technical**: the interface should support creative exploration while retaining professional tool discipline.

## 3. Visual Style

### 3.1 Theme

Use a **dark-first workspace** with subtle contrast, similar in spirit to Raycast. Light mode may be added later, but first-phase design should prioritize a polished dark command workspace.

Recommended palette:

- App background: near-black charcoal.
- Canvas background: dark graphite with subtle dot grid.
- Primary surfaces: dark gray panels with low-contrast borders.
- Elevated surfaces: slightly lighter dark panels with restrained shadow.
- Text primary: soft white.
- Text secondary: muted gray.
- Accent: cool blue or violet-blue for active command focus.
- Growth accent: restrained green/cyan for successful growth.
- Danger: muted red for failed or eliminated states.

Avoid:

- Forest-green dominated themes.
- Neon cyberpunk palettes.
- Heavy gradients.
- Large decorative nature motifs.
- Beige/cream editorial palettes.

### 3.2 Shape

- Default radius: 8px or less.
- Node cards: 6-8px radius.
- Buttons: 6px radius.
- Modals and command panels: 8px radius.
- Avoid pill-heavy UI unless representing tags.

### 3.3 Borders and Shadows

- Use 1px borders to define structure.
- Shadows should be subtle and used only for overlays, command panels, floating input, and selected node detail.
- Prefer contrast and spacing over heavy shadow.

## 4. Layout Principles

### 4.1 App Shell

The product should use a compact app shell:

- Left sidebar for primary navigation: Seeds, Generators, Nutrients, Archived.
- Main area for page content or seed workspace canvas.
- Right side panel or drawer for details.
- Bottom floating growth input in seed workspace.

The seed workspace should feel full-bleed. Do not wrap the canvas in a decorative card.

### 4.2 Canvas

The canvas is the main stage for a seed's content tree.

- Use a dark dot grid or subtle grid for spatial orientation.
- Nodes should be readable at rest and distinct when selected.
- The selected node should have a clear focus ring or border.
- Growth animation should happen near the source node.
- Eliminated fruit remains visible but visually subdued.

### 4.3 Panels

Panels should be compact, structured, and scannable.

- Use clear section headers.
- Keep headings small inside panels.
- Avoid hero-sized typography inside tools.
- Use tabs only when a panel contains clearly separate views.

## 5. Core Components

### 5.1 Command Panel

Command panels are used for quick actions, search, resource selection, and shortcuts.

Rules:

- Prefer keyboard-first interaction.
- Show icon + label + shortcut when relevant.
- Keep options compact.
- Highlight selected row clearly.
- Avoid long explanatory text in command lists.

### 5.2 Floating Growth Input

The growth input is the core command surface.

It should include:

- Text input for growth intent.
- Resource references such as nutrient mentions.
- Generator selector.
- Fruit count control.
- Mutation rate control.
- Submit action.

Behavior:

- Appears after selecting a seed or fruit.
- Anchored near bottom center of workspace.
- Shows the current source node context.
- Restores last failed growth input when retrying.
- Must not obscure the selected node detail panel.

### 5.3 Tree Node

Nodes represent seeds and fruits.

Node variants:

- Seed node: root, visually stable and slightly stronger.
- Candidate fruit: neutral.
- Selected fruit: growth accent border.
- Eliminated fruit: muted opacity or dashed border.
- Growing node: animated border or pulse.
- Failed growth source: muted red status mark.

Node content:

- Title or short summary.
- Type indicator: seed or fruit.
- Small status indicator.
- Optional gene tag preview.

Do not overload nodes with full content. Full Markdown content belongs in detail panels.

### 5.4 Detail Panel

The detail panel shows selected seed or fruit information.

Seed detail:

- Title.
- Markdown content.
- Archive/restore actions.
- Growth entry point.

Fruit detail:

- Markdown content.
- Selection state actions.
- Gene tags.
- Source context.
- Publication and feedback entry points.
- Edit content action.

### 5.5 Markdown Viewer

Markdown is the main content display format.

Rules:

- Use a consistent Markdown renderer everywhere.
- Style headings compactly.
- Preserve readable line height.
- Code blocks must be clear and copyable if needed.
- Links and attachments must be visibly distinct.

## 6. Interaction Principles

### 6.1 Keyboard First

The product should gradually support keyboard-first operation:

- Open command panel.
- Search resources.
- Submit growth.
- Select node.
- Open detail.
- Trigger common actions.

Do not block mouse-first usage, but design workflows so keyboard operation feels natural.

### 6.2 Feedback

Every user action must provide visible feedback:

- Growth started.
- Fruit generated.
- Growth failed.
- Fruit selected.
- Fruit eliminated.
- Content edited.
- Seed archived.
- Gene suggestion confirmed.

Feedback should be calm and local. Avoid loud global toasts for every small action.

### 6.3 Loading and Failure

Long-running growth must be shown on the source node.

Rules:

- The source node shows growing animation.
- The same source node cannot start another growth while locked.
- Other nodes remain usable.
- If no fruit is generated, show failed state on source node.
- Retry restores the last failed input.

## 7. Content and Copy

Tone:

- Short.
- Direct.
- Productive.
- Calm.

Use terms consistently:

- Seed
- Fruit
- Branch Growth
- Natural Selection
- Nutrients
- Generator
- Gene Tags

Chinese UI terms:

- 种子
- 果实
- 枝化生长
- 物竞天择
- 营养库
- 生成器
- 基因标签

Avoid explaining the product philosophy inside the UI. The interface should help users act, not teach the concept repeatedly.

## 8. Accessibility and Responsiveness

- Text must meet readable contrast on dark backgrounds.
- Interactive targets should be easy to hit.
- Focus states must be visible.
- Keyboard navigation should not trap users.
- The canvas should remain usable on laptop-sized screens.
- Mobile support is not first-phase priority, but layouts should not catastrophically break.

## 9. Implementation Rules

- All frontend development must read this file before creating UI.
- New UI should match this design direction unless a documented exception is approved.
- Do not introduce a separate visual language inside a module.
- Do not create decorative cards inside cards.
- Do not use large marketing hero patterns inside the app workspace.
- Do not use visible instructional text to explain obvious controls.
- Prefer icons for common actions, with tooltips where needed.
- Keep UI density high enough for repeated professional use.

