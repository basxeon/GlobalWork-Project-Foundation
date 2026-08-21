# GlobalWork OS UI Design System

This document is the source of truth for the GlobalWork OS frontend visual system. It governs presentation and interaction only; it does not change domain rules or API behavior.

## Product character

The interface is calm, professional, modern, warm, spacious, and suitable for daily office work. Prefer clear hierarchy and restrained separators over decorative cards, heavy shadows, gradients, glass effects, or bright colors.

## Design tokens

All application styles must use the variables in `apps/web/src/app/design-tokens.css`. Feature CSS must not introduce duplicate hardcoded colors.

### Colors and surface hierarchy

| Purpose | Token | Value |
| --- | --- | --- |
| Application canvas | `--app-bg` | `#F5F5F4` |
| Document/workspace canvas | `--document-bg` | `#FAFAF9` |
| Elevated interactive surface | `--surface` | `#FFFFFF` |
| Primary text | `--text-primary` | `#1C1917` |
| Secondary text | `--text-secondary` | `#57534E` |
| Muted text | `--text-muted` | `#78716C` |
| Border | `--border` | `#E7E5E4` |
| Strong border | `--border-strong` | `#D6D3D1` |
| Primary accent | `--primary` | `#4F46E5` |
| Primary hover | `--primary-hover` | `#4338CA` |
| Primary subtle | `--primary-subtle` | `#EEF2FF` |
| Success | `--success` / `--success-bg` | `#15803D` / `#F0FDF4` |
| Warning | `--warning` / `--warning-bg` | `#B45309` / `#FFFBEB` |
| Danger | `--danger` / `--danger-bg` | `#B91C1C` / `#FEF2F2` |
| Info | `--info` / `--info-bg` | `#1D4ED8` / `#EFF6FF` |

The application canvas is always warm stone. Document and workspace regions use the warmer off-white document surface. Pure white is reserved for interactive or elevated surfaces such as tables, forms, cards, toolbars, dialogs, explorers, and inspectors.

## Typography

Use only the local/system stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

- Page title: 28/34px, weight 600.
- Section title: 18/26px, weight 600.
- Card title: 15/22px, weight 600.
- Body: 14/22px, weight 400.
- Small: 13/18px, weight 400.
- Label: 12/16px, weight 500.

Use text size, weight, and spacing to establish hierarchy. Do not compensate with oversized headings or heavy borders.

## Spacing, radius, and elevation

Use only the named 4, 8, 12, 16, 20, 24, 32, 40, and 48px spacing tokens. Main content uses 32px desktop padding, 24px laptop padding, 20px tablet padding, and 16px mobile padding.

- Small radius: 6px.
- Medium radius: 10px.
- Large radius: 14px.
- Dialog radius: 16px.
- Small shadow: `0 1px 2px rgba(28, 25, 23, 0.05)`.
- Floating shadow: `0 8px 30px rgba(28, 25, 23, 0.09)`.

Standard surfaces use borders, not shadows. Use the floating shadow only for temporary layers such as dialogs.

## Application shell and page layouts

The desktop sidebar is 232px wide, uses the document background, and has a subtle right border. Active navigation uses the primary subtle background and indigo text. The signed-in user remains at the bottom.

The following routes are physically separate and must remain separate:

- `/dashboard`
- `/projects`
- `/projects/:id`
- `/contacts`
- `/companies`
- `/tasks`
- `/documents`
- `/users`
- `/settings`

Do not recreate the legacy all-in-one page or permanent right-side Project detail panel. Data-heavy pages and Project workspaces may use the full available width up to the shared content maximum.

## Components

### Buttons

- Primary: indigo surface, white text, 38px default height.
- Secondary: white surface, strong neutral border, primary text.
- Ghost: transparent surface with warm-neutral hover.
- Danger: danger color or subtle danger treatment depending on severity.
- Small buttons: 32–34px; large buttons: 42px.

Buttons use a 6px radius and visible focus ring. Disable controls while a request is pending.

### Forms

Inputs use a white background, strong neutral border, 8px radius, and 38–40px height. Labels use secondary text at 12–13px with medium weight. Focus uses the indigo border and shared focus ring. Missing Form Data uses the warning background; danger styling is reserved for invalid values.

### Tables and lists

Tables use a white surface, off-white header, compact readable rows, and subtle horizontal separators. Row hover uses the document background. Avoid dark headers, zebra stripes, and per-cell borders. At narrow widths, allow the table container to scroll rather than compressing columns into unreadable widths — apply `.table-scroll` alongside `.data-panel` so the scrolling happens inside the panel and never at page level.

Data tables carry a `.result-count` line above them stating how many rows are shown out of the total.

Column headers that can be sorted use `SortHeader` with the `useSort` hook (`app/components/sortable.tsx`). Empty values always sort last in both directions. Lists whose primary job is "what is due next" — Projects and Tasks — default to due date ascending.

A row exposes at most its one or two routine actions as buttons. Every other action, and always the destructive one, goes into the `RowMenu` overflow menu (`app/components/row-menu.tsx`); a daily-use list must not be one mis-click away from a delete confirmation. The menu renders in a portal so the panel's clipping cannot cut it off.

### Dates and urgency

Never render a stored date directly, and never call `toLocaleDateString()`. Format through `useDateFormat()` from the app shell, which applies the workspace `dateFormat` setting; the underlying helpers live in `lib/format.ts`. Date-only values are split into calendar parts rather than parsed as instants, so a due date cannot shift a day across timezones.

A due date in an operational list uses `.due-cell` with a `data-due` attribute of `overdue`, `today`, `soon`, `later`, or `none`, and shows the short `dueLabel` note beneath it. Completed or cancelled records use `none` — finished work is never coloured as urgent. "Today" is the viewer's local calendar day, never the UTC day.

### Dialogs

Dialogs use a white surface, 16px radius, subtle floating shadow, clear title, short explanation, and consistently aligned actions. Delete confirmation keeps Cancel separate from the destructive action. Browser `alert()` and `confirm()` are not part of the product UI.

### Status badges

Badges are compact pills and must retain readable text labels:

- To do/open: warm neutral.
- In progress/info: info background and text.
- Done/completed: success background and text.
- Warning: warning background and text.
- Cancelled/error: danger background and text.

### Loading and empty states

Use stable skeleton blocks for loading regions where possible. Empty states contain a concise title, one short explanation, and at most one relevant action. Do not add decorative illustrations.

## Workspace rules

### Dashboard

The Dashboard contains a greeting and primary action, compact work metrics, Need Attention, Recent Projects, and Quick Actions. Use cards only where they provide real grouping.

The metric row is the single place the counts appear; Need Attention lists the items themselves and must not restate the same numbers as a second row of tiles. Attention groups render only when they have items, and an all-clear day collapses to one short sentence instead of a column of "No ..." lines. Quick Actions offers only actions with no other route — never the header's primary button or a link the sidebar already provides.

### Projects and Project Workspace

The Projects table spans the available workspace and preserves Project CRUD. Clicking a row navigates to `/projects/:id`. The Project Workspace owns Overview, Tasks, Documents, and Form Data tabs, with a restrained underline for the active tab.

Overview uses a two-column desktop hierarchy and stacks on smaller screens. Project status, Contact, Company, dates, edit, and delete actions remain in the page header or summary surfaces.

### Documents

Desktop uses a three-pane layout: explorer, large preview, and passport/form inspector. The preview receives the most width. The toolbar is sticky and retains previous/next, zoom, fit-width, fit-page, and download controls. The panes stack at smaller widths.

### Form Data

Form Data uses a document background with white Applicant/Employment, Company, and Missing Data sections. Desktop fields use two columns; narrow screens use one. Copy and save actions remain visible, and missing values use warning styling.

### Tasks

Task rows are compact and scannable. The current operational UI exposes Open, In Progress, and Completed. Checklist progress is stated directly, and the inspector stacks below the list on smaller screens.

The global Task page uses compact filter tabs above one operational table. Status changes, edit, completion, delete confirmation, and Project navigation stay in the row actions; destructive actions never occur directly from a filter or badge.

### Global Document library

The global Document page uses the shared table pattern with search plus Project, category, and upload-date filters. Preview reuses the existing Document Workspace instead of creating a second viewer. Display name and category use a focused dialog; delete remains soft and requires confirmation.

### Settings

Settings uses a vertical section navigation on wide screens and a wrapping compact navigation on smaller screens. General, Profile, and Security remain task-focused forms. Storage and System are read-only operational summaries and are visible only to Admin users.

## Responsive behavior

- Desktop (1440px+): full sidebar and multi-column workspaces.
- Laptop (1024–1439px): 24px main padding; workspace widths remain flexible.
- Tablet (768–1023px): compact horizontal navigation, 20px main padding, stacked complex workspace panes where needed.
- Mobile (<768px): 16px main padding, single-column forms, scrollable navigation and data tables, stacked actions, and no unusably narrow form columns.

The UI must not introduce page-level horizontal overflow. Temporary viewport overrides used for testing must be reset after verification.

## Usage rules

- Reuse shared tokens and primitives before adding feature-specific styles.
- Render dates through the shared workspace formatter. Timestamp calendar dates,
  greetings, due filters, and urgency labels use the persisted workspace
  timezone; date-only fields remain unchanged calendar values.
- Keep business logic and API behavior out of visual components.
- Do not hide obsolete UI with CSS; remove it from the component tree.
- Preserve authentication, Admin user management, Project/Contact/Company management, Task/checklist workflows, Documents/passport review, Dashboard attention, Form Data, direct-route refresh, and logout.
