---
name: JobMatch AI Dashboard System
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f4'
  surface-container: '#f0edee'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e5e2e3'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464c'
  inverse-surface: '#303031'
  inverse-on-surface: '#f3f0f1'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#575e70'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#141b2b'
  on-primary-container: '#7d8497'
  inverse-primary: '#c0c6db'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#261906'
  on-tertiary-container: '#968065'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce2f7'
  primary-fixed-dim: '#c0c6db'
  on-primary-fixed: '#141b2b'
  on-primary-fixed-variant: '#404758'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#f9debf'
  tertiary-fixed-dim: '#dcc2a4'
  on-tertiary-fixed: '#261906'
  on-tertiary-fixed-variant: '#55442d'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e5e2e3'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 32px
  gutter: 24px
  card-padding: 20px
  section-gap: 48px
---

## Brand & Style
The design system is rooted in high-performance enterprise aesthetics, prioritizing clarity, speed, and precision. It leverages a **Minimalist Modern** style that draws from the "Utility-First" movement seen in developer-centric SaaS platforms. The visual narrative avoids decorative elements in favor of functional data density and logical grouping. 

The system evokes a sense of "quiet intelligence"—it does not compete for the user's attention but provides a frictionless stage for complex AI-driven matching data. The interface feels lightweight and rigorous, utilizing intentional whitespace to prevent cognitive overload in data-heavy environments.

## Colors
This design system utilizes a monochrome-first palette to maintain an executive, professional tone. 

- **Primary & Text:** The core of the system is `#111827` (Ink), used for primary headings and critical UI elements to ensure maximum legibility and authority.
- **Backgrounds:** A layered approach uses Pure White (`#FFFFFF`) for primary content cards and "Surface" elements, while Soft Gray (`#F9FAFB`) is reserved for the global application background and sidebar to create subtle depth.
- **Accents:** Data visualization and status indicators rely on Slate (`#475569`) and varying shades of gray. This avoids the "Christmas tree effect" of multi-colored dashboards, keeping the user focused on the relevance of the matching AI scores.
- **Borders:** Subtle hairlines (`#E5E7EB`) are used instead of heavy shadows to define structure.

## Typography
The system uses **Inter** as the primary typeface for its exceptional legibility and systematic feel. For specific data points or AI match scores, **JetBrains Mono** is introduced sparingly to provide a "technical" edge.

A strict hierarchy is maintained through weight rather than size alone. Headings use tight letter-spacing for a modern "Linear-like" feel, while body text is given generous line-height to ensure readability in long-form candidate descriptions. Small labels use uppercase styling to differentiate them from interactive body text.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains at a fixed width (240px), while the main content area expands dynamically to fill the viewport, capped at a maximum width of 1600px to maintain line-length readability.

- **Rhythm:** A 4px baseline grid ensures consistent vertical alignment.
- **Margins:** High-level dashboard views utilize a generous 32px outer margin to create a "gallery" feel for data cards.
- **Grids:** A 12-column system is used for dashboard layouts, typically grouping content into spans of 4 (thirds) or 6 (halves).
- **Responsive:** On mobile, margins shrink to 16px and column spans collapse to a single column, with the sidebar transitioning to a bottom bar or hidden drawer.

## Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** and **Minimalist Shadows** rather than dramatic 3D effects.

- **Level 0 (Background):** `#F9FAFB` – The canvas upon which all elements sit.
- **Level 1 (Cards/Surfaces):** `#FFFFFF` – Primary containers. They feature a 1px border (`#E5E7EB`) and a very soft, diffused shadow: `0 1px 3px 0 rgba(0, 0, 0, 0.05)`.
- **Level 2 (Dropdowns/Modals):** Elevated surfaces that use a more pronounced shadow to indicate focus: `0 10px 15px -3px rgba(0, 0, 0, 0.1)`.
- **Interactables:** Buttons and input fields appear flat until hovered, at which point they gain a subtle inner-glow or a slightly darker border to signify tactility.

## Shapes
The shape language is defined by "The Standard Radius." All primary components like cards, buttons, and inputs utilize a **8px (0.5rem)** corner radius. 

This specific radius provides a balance between the "sharp" professional look of traditional enterprise software and the "soft" approachable feel of modern consumer SaaS. Secondary elements like tags or "match badges" may use a fully pill-shaped (rounded-full) geometry to distinguish them from structural layout blocks.

## Components
- **Buttons:** Primary buttons are solid `#111827` with white text. Secondary buttons use a white background with a gray border. Both utilize a 8px radius and horizontal padding that is 2x the vertical padding.
- **Input Fields:** Minimalist design with a 1px border. Focus states are indicated by a 1px solid black border—avoiding blue glow to stay within the neutral palette.
- **Cards:** The foundation of the dashboard. Cards must have a white background, 8px radius, and a subtle border. Headers within cards should have a thin bottom-divider to separate titles from content.
- **Sidebar Navigation:** A "Low-Chrome" approach. Transparent backgrounds for inactive items, with a light gray (`#F3F4F6`) background and bold text for active states. Icons should be stroke-based (2px weight) and monochromatic.
- **Match Score Badge:** A specialized component for this dashboard. It uses a circular progress ring or a bold numerical display using the Monospace font, wrapped in a subtle slate-tinted container to indicate AI-driven confidence levels.
- **Data Tables:** Borderless rows with 1px dividers. Header rows use the `label-caps` typography style for clear distinction.