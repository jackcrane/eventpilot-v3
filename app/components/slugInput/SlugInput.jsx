// SlugInput.js
import React, { useState, useEffect } from "react";
import { Input, Badge, Spinner } from "tabler-react-2";
import { useSlugChecker } from "../../hooks/useSlugChecker";

export const SlugInput = ({ value, onChange, type = "event" }) => {
  const [raw, setRaw] = useState(value || "");

  // Sync raw → value, but only when they really differ
  // useEffect(() => {
  //   if (value != null && value !== raw) {
  //     setRaw(value);
  //   }
  // }, [value, raw]);

  const generateSlug = (val) =>
    val
      .toLowerCase()
      .replaceAll(" ", "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 30);

  const slug = generateSlug(raw);
  const { slugPresent, loading } = useSlugChecker({ slug, type });
  const rawValid = /^[a-z0-9-]{4,30}$/.test(raw);
  const available = rawValid && !slugPresent;

  // Only propagate when slug/value really change (or clear it)
  useEffect(() => {
    if (available && !loading && slug !== value) {
      onChange(slug);
    }
    if ((!available || !rawValid) && value !== null) {
      onChange(null);
    }
  }, [slug, available, loading, rawValid, value, onChange]);

  let badgeText = loading
    ? "Loading..."
    : !rawValid
    ? "Invalid"
    : available
    ? "Available"
    : "Unavailable";

  return (
    <>
      <label className="form-label required">
        Slug{" "}
        <Badge
          soft
          color={
            loading ? "default" : rawValid && available ? "success" : "danger"
          }
          style={{ fontSize: "0.6rem" }}
        >
          {badgeText}
        </Badge>
      </label>

      <Input
        placeholder="Enter slug"
        value={raw}
        onChange={(e) => setRaw(e)}
        variant={
          raw.length > 0 && (!rawValid || (!loading && rawValid && !available))
            ? "danger"
            : undefined
        }
        hint={`Slug is required and must be at least 3 characters long. It cannot be longer than 30 characters and can only contain lowercase letters, numbers, and hyphens. Slugs are used to generate URLs and emails for your events, so be sure to choose something that is memorable, easy to spell, and reflects your event well. You can change this slug later, but it will break existing links and emails, so we recommend not changing it.`}
      />
    </>
  );
};
