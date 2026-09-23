<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

## Component structure

A component lives in its own folder under `components/` and is split into four files.
`index.ts` is the only entry point other code imports.

```
components/Accordion/
├── index.ts            connects logic to view, re-exports under the plain name
├── Accordion.tsx       view — props in, markup out
├── withAccordion.tsx   logic — data fetching, state, handlers
└── interface.ts        prop types for both
```

**logic** — `withAccordion.tsx`

```tsx
export function withAccordion(Component: React.FC<AccordionProps>) {
  function WithAccordion({ className }: WithAccordionProps) {
    return <Component className={className} />;
  }

  return WithAccordion;
}
```

**view** — `Accordion.tsx`

```tsx
import React from "react";

import { AccordionProps } from "./interface";

export function Accordion({ className }: AccordionProps) {
  return <div className={className}>Accordion</div>;
}
```

**interface** — `interface.ts`

```ts
export interface WithAccordionProps {
  className?: string;
}

export interface AccordionProps {
  className?: string;
}
```

**index** — `index.ts`

```ts
import { Accordion } from "./Accordion";
import { withAccordion } from "./withAccordion";

const ConnectedAccordion = withAccordion(Accordion);

export { ConnectedAccordion as Accordion };
```

Keep the view free of data fetching and the logic free of markup, so either can be
read or replaced without the other.

## Comments

Comment only where the code cannot speak for itself — a constraint that is not
visible locally, a deliberate trade-off, or why an obvious approach was rejected.
Do not restate what the code already says, and do not add file headers, section
banners, or per-parameter docs.
