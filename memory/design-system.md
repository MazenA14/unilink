---
name: design-system
description: UniLink's centralized design token system and how to restyle screens consistently
metadata:
  type: project
---

UniLink (GUC student portal, Expo/React Native) has a centralized design system introduced in a July 2026 UI revamp.

**Direction:** Crimson (`#E11D48`) primary + Indigo (`#4F46E5`) secondary on slate neutrals, with an "elevated & layered" surface model (16–20px corners, tangible shadows).

**Token files:**
- `constants/Colors.ts` — `Colors.light` / `Colors.dark`. All legacy keys preserved (mainFont, secondaryFont, tabColor, cardBackground, grade*, etc.) plus new tokens: `primary/secondary` (+ Dark/Light/Soft/on*), surface tiers (`surface`, `surfaceElevated`, `surfaceSunken`, `surfaceAlt`), `textPrimary/Secondary/Tertiary`, `border/borderStrong/divider`, semantic (`success/warning/info/danger` + `*Soft`), `shadow`, `overlay`.
- `constants/Theme.ts` — `Spacing`, `Radius`, `Type`, `Shadow` (elevation presets: `Shadow.card(colors)`, `.md`, `.lg`, `.glow(color)`), `Layout`, and `withAlpha(hex, opacity)`.

**How to restyle a screen:** read `colors = Colors[colorScheme]`, use `colors.surface` for cards + `Shadow.card(colors)`, `colors.border` for hairlines, text tiers for type. Standard card background is `colors.surface` (was the old `colorScheme === 'dark' ? '#232323' : '#f3f3f3'` pattern — all replaced).

**Invariant:** several untouched screens use `colors.background` as on-primary text color over buttons, so `tint`/`tabColor` stay light in dark mode (rose `#FB7185`) to keep dark text legible. Don't make dark-mode `tint` a saturated dark crimson.

**Navigation architecture (July 2026 UX revamp):** The bottom tab bar was removed (Tabs navigator kept but `tabBarStyle: { display: 'none' }` so screen state is preserved). Primary navigation is now a global slide-in **Sidebar** (`components/navigation/Sidebar.tsx`) opened from a shared **AppBar** (`components/navigation/AppBar.tsx`, hamburger/back + title + notifications). State lives in `contexts/NavigationUIContext.tsx` (`openSidebar`/`closeSidebar` + `openQuickAccess`/`closeQuickAccess`). Both `<Sidebar/>` and a global `<QuickMediaModal/>` are mounted once in `app/_layout.tsx` above the Stack, wrapped in `NavigationUIProvider`. Sidebar routes: tab screens via `router.replace('/(tabs)/x')`, pushed services via `router.push`. Each tab screen renders `<AppBar title=… large />` at top; Dashboard is an overview (next-class hero + stat tiles, no button grid — actions moved to sidebar).

**Constraint honored in revamp:** no logic/parsing/output changes — presentation + navigation structure only. Grade colors kept semantic (traffic scale). Verified the whole app bundles cleanly via `expo export --platform android`.
