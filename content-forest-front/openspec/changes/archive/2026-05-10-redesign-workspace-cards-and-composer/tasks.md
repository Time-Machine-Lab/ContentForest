## 1. Scope Guard

- [x] 1.1 Review `app/pages/seeds/[seedId]/workspace.vue` and identify only the node card, growth composer, dropdown menu, resource popover, and referenced resource chip sections to edit.
- [x] 1.2 Confirm no changes are needed for topbar actions, canvas drag/zoom, tree layout calculation, branch paths, right detail panel, natural selection API calls, backend API contracts, or SQL schemas.

## 2. Node Card Visual Redesign

- [x] 2.1 Refactor the node card template structure only as needed to support the preview-inspired visual hierarchy while preserving existing click, pointer, drag, active, placeholder, seed, fruit, selection, growing, and failed state bindings.
- [x] 2.2 Update node card CSS to use compact dark workspace surfaces, restrained borders, state chips, subtle hover/focus states, and distinct seed/fruit/candidate/selected/eliminated/growing variants.
- [x] 2.3 Ensure growing and placeholder card feedback remains visible but does not obscure node titles, status labels, click targets, or drag behavior.
- [x] 2.4 Add or preserve reduced-motion handling for node hover and growing animations.

## 3. Growth Composer And Dropdown Menus

- [x] 3.1 Refactor the bottom growth composer markup and CSS so source node, generator selector, fruit count selector, mutation rate, referenced resources, textarea, detail action, and submit action remain visually clear.
- [x] 3.2 Rebuild the generator menu as a bounded floating menu with maximum height, internal scrolling, active item styling, hover/focus states, and selection behavior that continues updating `selectedGeneratorId`.
- [x] 3.3 Rebuild the fruit count menu as a bounded compact floating menu with maximum height, internal scrolling, active item styling, and selection behavior that continues updating `fruitCount`.
- [x] 3.4 Verify dropdown menus stay near the composer and do not alter topbar, canvas layout, right detail panel, or tree layout behavior.

## 4. Resource Reference Interaction

- [x] 4.1 Rebuild the `@` resource candidate popover as a separate bounded floating panel that does not overlap the textarea, referenced resource chips, or composer footer actions.
- [x] 4.2 Preserve resource filtering from existing `resourceOptions` and `filteredResourceOptions`, including nutrient and gene visual distinction.
- [x] 4.3 Add a `removeResource` local handler that removes a referenced resource by `kind` and `id` from `referencedResources`.
- [x] 4.4 Add remove buttons to referenced resource chips in the composer and growth detail reference display where applicable, with accessible labels and visible hover/focus states.
- [x] 4.5 Ensure removing referenced resources updates the later `POST /api/growth-tasks` payload by excluding removed resources from `nutrientRefs` and `geneRefs`.
- [x] 4.6 Ensure resources restored from failed input remain removable before retrying or starting a new growth task.

## 5. Verification

- [x] 5.1 Run existing workspace-related frontend tests and update focused tests if snapshots or static assertions depend on old node/composer markup.
- [x] 5.2 Add or update tests covering referenced resource removal and payload mapping for `nutrientRefs` and `geneRefs`.
- [x] 5.3 Manually verify `/seeds/{seedId}/workspace` in the browser: card states, generator dropdown scrolling, fruit dropdown selection, resource popover placement, reference add/remove, and growth detail display.
- [x] 5.4 Confirm implementation does not introduce API changes, SQL changes, route changes, topbar changes, right detail panel changes, or tree layout behavior changes.
