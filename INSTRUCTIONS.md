Title: Generate CRM Segment Filter AST for EventPilot

Purpose
- Produce a JSON AST for the CRM Segments API that selects people based on iteration-aware involvement (participant or volunteer) with clear, composable logic.
- Target audience: an LLM that receives a natural-language request and returns the AST payload to POST.

Endpoint
- Method: POST
- Path: /api/events/:eventId/crm/segments
- Headers: Authorization: Bearer <token>, X-Instance: <currentInstanceId>
- Body: { filter: <AST>, debug?: boolean }
- Response: { crmPersons: [...], total }
- Introspection: QUERY /api/events/:eventId/crm/segments returns the zod schema via zodex.

Concepts
- Person: a CRM person belonging to the event (non-deleted).
- Iteration: an Event Instance (occurrence) of the event.
  - current: resolved from the X-Instance header.
  - previous: the nearest instance that started before current.
  - specific: by instanceId.
  - year: a calendar year (UTC Jan 1–Dec 31). Allowed only if exactly one instance exists in that year for the event; otherwise the API returns 400 and you must use name or specific.
  - name: resolve by exact instance name. Allowed only if exactly one instance matches; otherwise the API returns 400 and you must use specific.
- Roles:
  - participant: finalized registration within an iteration; optional tier and period filters.
  - volunteer: volunteer registration within an iteration; optional minimum shifts.
  - upsell purchase: registration contains one or more upsell items within an iteration; optional filter to a specific upsell by id or name.
  - email activity: existence of inbound/outbound email(s) within a rolling time window.
- Universe: All non-deleted CRM people for the event. NOT logic operates relative to this universe.

AST Schema (informal summary)
- Root: filter: Group | Involvement | Transition | Upsell | Email Activity

1) Involvement
{
  type: "involvement",
  role: "participant" | "volunteer",
  iteration: { type: "current" | "previous" | "specific" | "year" | "name", instanceId?, year?, name? },
  exists: boolean (default true),
  participant?: { tierId?: string, tierName?: string, periodId?: string, periodName?: string },
  volunteer?: { minShifts?: number }
}

2) Transition
{
  type: "transition",
  from: Involvement (exists=true),
  to:   Involvement (exists=true)
}

3) Upsell
{
  type: "upsell",
  iteration: { type: "current" | "previous" | "specific" | "year" | "name", instanceId?, year?, name? },
  exists?: boolean (default true),
  upsellItemId?: string,
  upsellItemName?: string
}

4) Email Activity
{
  type: "email",
  direction?: "outbound" | "inbound" | "either" (default "outbound"),
  withinDays: number,  // e.g. 21 for 3 weeks
  exists?: boolean (default true)
}

5) Group
{
  type: "group",
  op: "and" | "or" (default "and"),
  not?: boolean,
  conditions: [ Group | Involvement | Transition, ... ]
}

Behavioral Rules
- participant selections require finalized registrations and exclude deleted records.
- volunteer selections require a volunteer registration linked to the person; minShifts filters by number of shifts on that registration.
- upsell selections require a finalized registration with at least one upsell in the target iteration; optional narrowing to a specific upsell by name or id.
- email selections evaluate activity within a rolling window from now back N days.
- previous requires a current instance in the header; if no previous exists, that subquery yields an empty set.
- exists=false for Involvement returns the set difference relative to the universe.
- Group.not negates the composed group relative to the universe.
- Transition returns the intersection of the people who satisfy both from and to.

Mapping Guidance (NL → AST)
- Identify role(s) (participant/volunteer).
- Identify iteration(s): use current/previous unless a specific instanceId is provided.
  - The LLM may use { type: "year", year: 2024 } if the event has exactly one instance in that year; otherwise prefer { type: "name", name: "<instance name>" } or { type: "specific", instanceId }.
- Identify attribute filters when present:
  - participant tier by name or id (e.g., "Half Marathon" → participant.tierName).
  - participant period by name or id (e.g., "Last Minute" → participant.periodName).
  - volunteer minimum shifts (if mentioned; otherwise omit).
  - upsell purchases (e.g., "VIP T-Shirt" → upsell.upsellItemName) within an iteration; omit item to include any upsell.
  - email cadence (e.g., "haven't emailed in 3 weeks" → { type: "email", direction: "outbound", withinDays: 21, exists: false }).
- Compose with AND/OR; use exists=false or group.not for NOT cases.
- Prefer readable structure (small groups with clear subconditions); avoid redundant nesting.

Examples
1) Volunteered last iteration AND not involved this iteration
{
  "filter": {
    "type": "group",
    "op": "and",
    "conditions": [
      {
        "type": "involvement",
        "role": "volunteer",
        "iteration": { "type": "previous" },
        "exists": true
      },
      {
        "type": "involvement",
        "role": "volunteer",
        "iteration": { "type": "current" },
        "exists": false
      }
    ]
  }
}

2) Did Half Marathon last iteration AND signed up for Full this iteration (participant tiers by name)
{
  "filter": {
    "type": "group",
    "op": "and",
    "conditions": [
      {
        "type": "involvement",
        "role": "participant",
        "iteration": { "type": "previous" },
        "exists": true,
        "participant": { "tierName": "Half Marathon" }
      },
      {
        "type": "involvement",
        "role": "participant",
        "iteration": { "type": "current" },
        "exists": true,
        "participant": { "tierName": "Full Marathon" }
      }
    ]
  }
}

3) Transition form (equivalent to #2) using a Transition node
{
  "filter": {
    "type": "transition",
    "from": {
      "type": "involvement",
      "role": "participant",
      "iteration": { "type": "previous" },
      "participant": { "tierName": "Half Marathon" },
      "exists": true
    },
    "to": {
      "type": "involvement",
      "role": "participant",
      "iteration": { "type": "current" },
      "participant": { "tierName": "Full Marathon" },
      "exists": true
    }
}
}

4) Bought any upsell this iteration
{
  "filter": {
    "type": "upsell",
    "iteration": { "type": "current" },
    "exists": true
  }
}

5) Did NOT buy the "VIP T-Shirt" upsell this iteration
{
  "filter": {
    "type": "upsell",
    "iteration": { "type": "current" },
    "upsellItemName": "VIP T-Shirt",
    "exists": false
  }
}

6) Haven't emailed in 3 weeks (outbound)
{
  "filter": {
    "type": "email",
    "direction": "outbound",
    "withinDays": 21,
    "exists": false
  }
}

7) Power user: 2+ volunteer shifts in last 2 iterations AND no participant registration this iteration
- Note: The API currently supports current/previous/specific. To target two iterations, either issue two requests or provide two specific instanceIds. Example using previous and a specific:
{
  "filter": {
    "type": "group",
    "op": "and",
    "conditions": [
      {
        "type": "group",
        "op": "or",
        "conditions": [
          { "type": "involvement", "role": "volunteer", "iteration": { "type": "previous" }, "volunteer": { "minShifts": 2 }, "exists": true },
          { "type": "involvement", "role": "volunteer", "iteration": { "type": "specific", "instanceId": "<olderInstanceId>" }, "volunteer": { "minShifts": 2 }, "exists": true }
        ]
      },
      { "type": "involvement", "role": "participant", "iteration": { "type": "current" }, "exists": false }
    ]
  }
}

Do’s
- Use iteration.type = "current" or "previous" when the user references this/last iteration.
- Prefer participant.tierName when the user names a tier; use tierId only when explicitly provided.
- Use exists=false or a NOT group for negation.
- Keep JSON minimal; omit optional blocks when not needed.

Don’ts
- Do not assume or invent instanceIds.
- Do not invent years; only use explicit numeric years if the user states them.
- Do not include unrelated fields.
- Do not return SQL or prose; only the JSON payload.

Notes
- If previous cannot be resolved (no header or no prior instance), that subcondition evaluates to an empty set.
- If a tierName or periodName is provided but no matching tier/period exists for the resolved instances, the API returns 400.
- If iteration.type = "year" matches multiple instances, the API returns 400 instructing to use name/specific. If iteration.type = "name" matches 0 or multiple, the API returns 400.
- The server evaluates set logic in-memory for clarity; performance is acceptable for ~10k people.
