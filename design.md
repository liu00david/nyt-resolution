# Infinite Resolution Jar

## What This Website Is

This website is a single-page, scrollable archive of human resolutions collected in person. Each resolution represents a moment where someone was listened to, acknowledged, and invited to articulate a personal intention.

Resolutions are displayed as circular “marbles” containing readable text. These marbles accumulate vertically in an infinitely scrolling space, where older resolutions live toward the bottom and newer resolutions gather toward the top.

The site is not a feed, dashboard, or real-time stream. It is an archival, contemplative space — a quiet monument to collective intention.

There are no timestamps, no likes, no rankings, and no prioritization. Every resolution is treated equally and remains permanently in place once added.

---

## Design Philosophy

This project follows an archival design stance.

The experience should feel stable, calm, and trustworthy. Users should never feel rushed, interrupted, or manipulated into reacting to new content. The site accumulates meaning over time rather than demanding attention in the moment.

Key principles:

- Permanence over urgency
- Legibility over density
- Calm motion over stimulation
- Exploration over retrieval
- Presence over analytics

---

## Core Experience

- The site consists of a single vertical, infinitely scrolling page
- Each resolution is represented by a circular marble
- Time is encoded spatially:
  - Older resolutions appear lower
  - Newer resolutions appear higher
- The page can be explored simply by scrolling
- No search, filtering, or sorting is provided

Users are encouraged to browse slowly and encounter resolutions organically.

---

## Page Load Behavior (Intro Motion)

On initial page load:

1. The viewport starts at the bottom of the content (oldest resolutions)
2. A gentle upward auto-scroll occurs for approximately 1.2–1.8 seconds
3. The motion eases out naturally and stops near the top (newest resolutions)

Constraints:

- The auto-scroll cancels immediately if the user interacts
- The motion respects `prefers-reduced-motion`
- The motion runs only once per page load
- No snapping or looping is allowed

Purpose: to visually communicate that newer resolutions accumulate above older ones without disorienting the user.

---

## Visual Representation

### Marbles

- Shape: perfect circles
- Size:
  - Desktop: 160–180px diameter
  - Mobile: 120–140px diameter
- All marbles are the same size
- Each marble displays only the resolution text by default

### Resolution Text

- English only (for now)
- Maximum 15 words
- Maximum 3 lines
- Center-aligned
- Font size scales down as needed to fit
- Minimum readable font size:
  - Mobile: 13px
  - Desktop: 14px

If text cannot fit within these constraints, it must be rejected or constrained at input time. Text must never overflow outside the marble.

---

## Layout and Density

- Linear vertical layout
- Infinite height
- Target 12–20 marbles visible on screen at once
- Even vertical spacing between marbles
- Bottom of the page represents older entries

No grids, clustering, random positioning, or reshuffling is allowed.

---

## Interaction Model

### Default State

- All marbles are static
- Resolution text is always readable
- No metadata is shown by default

### Tap / Click to Expand

When a user taps or clicks a marble:

- The marble enlarges to approximately 2–2.5× its original size
- The marble centers in the viewport
- Background content is softly blurred
- The expanded marble displays:
  - Full resolution text
  - Age (number)
  - Location (city, state or city, country)
  - Initials

While expanded:

- Background scrolling is disabled
- No navigation or URL changes occur

Tapping again (or clicking outside the marble):

- Restores the original scale
- Removes the blur
- Restores the previous scroll position

This interaction must work consistently on both desktop and mobile.

---

## Data Model

Each resolution entry contains:

```json
{
  "id": "uuid",
  "resolution": "Short resolution text",
  "initials": "A.B.",
  "age": 29,
  "location": "Brooklyn, NY"
}
Notes:

No timestamps are displayed

Ordering is based solely on insertion order

Entries are immutable once stored

Performance and Rendering
Virtualization (Required)
To ensure smooth performance at scale:

Only render marbles within the viewport plus a small buffer

Recycle DOM nodes for offscreen entries

Prevent DOM size from growing unbounded as the user scrolls

This is required even though the content is text-only.

Constraints
No canvas or WebGL

No heavy images

CSS and JavaScript only

Animations should use CSS or lightweight JS

The site must remain smooth at 500+ marbles

Handling New Marble Entries (Archival Behavior)
Design Stance
New entries are added over time, but the site is not a live feed. New content must never interrupt or redirect the user.

Default Behavior
When a new marble is added:

The marble is inserted at the top of the vertical sequence

The user’s current scroll position is preserved

No automatic scrolling occurs

No aggressive animation is used

If the user is not viewing the top of the page, nothing changes in the visible viewport.

Visual Awareness Indicator (Optional but Recommended)
If new marbles arrive while the user is not at the top:

Display a small, unobtrusive indicator near the top edge

Example text:
"1 new resolution ↑"

Indicator behavior:

Fades in gently

No bounce, pulse, or flashing

No sound

Disappears once the user scrolls back to the top

The indicator is informational only.

Behavior When User Is at the Top
If the user is already at or near the top when a new marble arrives:

The marble appears at the top

Apply a subtle arrival animation:

Fade in

Slight downward settle (approximately 8–12px)

Duration: 300–500ms

No layout shift or snapping occurs

Handling Multiple New Entries
If multiple marbles arrive close together:

Batch them

Insert them together at the top

Show a single indicator (e.g. "3 new resolutions ↑")

Animate the batch once

Initial Load Exception
During initial page load and intro motion:

No arrival animations are triggered

New-entry behavior only applies after the intro completes

Accessibility
Tap targets meet mobile accessibility guidelines

Text contrast must remain sufficient

All motion respects prefers-reduced-motion

Expanded views must be dismissible without precision tapping

Out of Scope
The following are intentionally excluded:

Search or filtering

Maps or geographic visualizations

Timestamps or time labels

Multilingual rendering

User submissions via the site

Likes, reactions, or rankings

Accounts or authentication

Summary
This website is a quiet, accumulating archive of human intentions. It is designed to be read slowly, explored freely, and trusted to remain stable over time.

All implementation decisions should preserve:

Spatial meaning of time

Visual consistency

Emotional restraint

Smooth performance at scale

yaml
Copy code

