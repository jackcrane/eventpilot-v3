import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

// Adapter to present legacy volunteer fields as v2 pages and persist back
export const useVolunteerRegistrationFormV2 = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/builder` : null;

  const fetcher = (url) => authFetch(url).then((r) => r.json());
  const { data, error, isLoading } = useSWR(key, fetcher);

  // Map legacy -> v2
  const pages = (() => {
    const legacyFields = data?.fields ?? [];

    // Convert legacy types to v2-consumer-friendly ones
    const mapType = (t) => {
      switch (t) {
        case "shortAnswer":
          return "textarea"; // old multi-line
        case "boolean":
          return "checkbox"; // old boolean toggle
        case "phone":
          return "text"; // map legacy phone to text in v2 builder
        default:
          return t; // text, email, dropdown, richtext passthrough
      }
    };

    // Split legacy list into pages by synthetic pagebreak markers
    const result = [];
    let currentPage = {
      id: "volunteer-page-0",
      name: "Registration",
      order: 0,
      fields: [],
    };
    let pageIndex = 0;

    legacyFields
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((f, idx) => {
        const isPageBreak =
          f?.eventpilotFieldType === "pagebreak" || f?.type === "pagebreak";
        if (isPageBreak) {
          // start a new page using this marker's label as the name
          if (currentPage.fields.length > 0 || result.length === 0) {
            if (result.length === 0 && currentPage.fields.length === 0) {
              // Set the first page's name instead of creating an empty page upfront
              currentPage.name = f.label || `Page ${pageIndex + 1}`;
            } else {
              result.push(currentPage);
              pageIndex += 1;
              currentPage = {
                id: `volunteer-page-${pageIndex}`,
                name: f.label || `Page ${pageIndex + 1}`,
                order: pageIndex,
                fields: [],
              };
            }
          } else {
            // If first field is a pagebreak, just set the first page name
            currentPage.name = f.label || `Page ${pageIndex + 1}`;
          }
          return;
        }

        // Normal field mapping
        const mapped = {
          id: f.id,
          type: mapType(f.type),
          fieldType:
            f.eventpilotFieldType && f.eventpilotFieldType !== "pagebreak"
              ? f.eventpilotFieldType
              : null,
          label: f.label ?? "",
          placeholder: f.placeholder ?? "",
          description: f.description ?? "",
          markdown: f.type === "richtext" ? f.description ?? "" : null,
          prompt: f.prompt ?? undefined,
          required: Boolean(f.required),
          defaultValue: Boolean(f.defaultValue),
          options: (f.options || []).map((o, oIdx) => ({
            id: o.id,
            label: o.label,
            value: o.label,
            order: o.order ?? oIdx,
          })),
          order: f.order ?? idx,
        };
        currentPage.fields.push(mapped);
      });

    // Push the last page
    result.push(currentPage);

    // Remove any empty leading pages (edge cases)
    const pruned = result.filter((p) => p.fields.length > 0 || result.length === 1);

    // Reassign orders
    return pruned.map((p, i) => ({ ...p, order: i }));
  })();

  // Persist v2 -> legacy
  const updatePages = async ({ pages }) => {
    // Flatten pages into legacy list with synthetic pagebreak markers.
    const legacyType = (t) => {
      switch ((t || "").toLowerCase()) {
        case "textarea":
          return "shortAnswer";
        case "checkbox":
          return "boolean";
        default:
          return t;
      }
    };

    const flattened = [];
    let order = 0;
    pages
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((page, pIdx) => {
        // Insert a pagebreak marker to persist page name and boundary
        flattened.push({
          type: "pagebreak",
          label: page.name || `Page ${pIdx + 1}`,
          placeholder: null,
          description: null,
          required: false,
          defaultValue: false,
          prompt: null,
          order: order++,
          options: [],
          autocompleteType: null,
          eventpilotFieldType: "pagebreak",
        });

        (page.fields || [])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .forEach((f, fIdx) => {
            flattened.push({
              ...(f.id ? { id: f.id } : {}),
              type: legacyType(f.type),
              label: f.label ?? "",
              placeholder: f.placeholder ?? null,
              description:
                (f.type === "richtext" ? f.markdown ?? "" : f.description ?? null),
              required: Boolean(f.required),
              defaultValue: Boolean(f.defaultValue),
              prompt: f.prompt ?? null,
              order: order++,
              options: (f.options || []).map((o, oIdx) => ({
                ...(o.id ? { id: o.id } : {}),
                label: o.label,
                order: o.order ?? oIdx,
              })),
              autocompleteType: null,
              eventpilotFieldType: f.fieldType ?? null,
            });
          });
      });

    const fields = flattened;

    const res = await authFetch(key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) throw new Error("Failed to update volunteer form");
    await mutate(key);
    return true;
  };

  return {
    pages,
    loading: isLoading,
    error,
    updatePages,
  };
};
