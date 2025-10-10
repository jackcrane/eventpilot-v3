import { Fragment, useState } from "react";
import { Row } from "../../util/Flex";
import { ImageUrlField } from "./ImageUrlField";
import { FieldLabel } from "@measured/puck";

const toCamelCase = (prop) =>
  prop
    .trim()
    .replace(/-([a-z0-9])/gi, (_, letter) => letter.toUpperCase())
    .replace(/^\w/, (char) => char.toLowerCase());

const parseInlineStyles = (customCss) => {
  if (typeof customCss !== "string") return null;
  const declarations = customCss
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean);

  if (declarations.length === 0) return null;

  return declarations.reduce((acc, declaration) => {
    const [property, ...valueParts] = declaration.split(":");
    if (!property || valueParts.length === 0) return acc;
    const value = valueParts.join(":").trim();
    if (!value) return acc;
    const key = toCamelCase(property);
    acc[key] = value;
    return acc;
  }, {});
};

const prefixSelectors = (css, scopeId) => {
  if (!scopeId) return css;
  return css.replace(/(^|\})\s*([^{@}][^{]*)\{/g, (match, close, selector) => {
    const normalized = selector.trim();
    if (!normalized) return match;

    const startsWithScope =
      normalized.startsWith(`#${scopeId}`) ||
      normalized.startsWith(`.${scopeId}`) ||
      normalized.startsWith(":") ||
      normalized.startsWith("&");

    if (startsWithScope) {
      return `${close} ${normalized.replace(/^&/, `#${scopeId}`)} {`;
    }

    return `${close} #${scopeId} ${normalized} {`;
  });
};

const resolveCustomCss = (customCss, scopeId) => {
  const trimmed = typeof customCss === "string" ? customCss.trim() : "";
  if (!trimmed) {
    return { inlineStyle: null, styleTag: null };
  }

  const hasBlockSyntax = trimmed.includes("{");

  if (!hasBlockSyntax) {
    return {
      inlineStyle: parseInlineStyles(trimmed),
      styleTag: null,
    };
  }

  const scopedCss = prefixSelectors(trimmed, scopeId);

  return {
    inlineStyle: null,
    styleTag: scopedCss,
  };
};

const applyInlineStyles = (baseStyles, inlineStyle) =>
  inlineStyle ? { ...baseStyles, ...inlineStyle } : baseStyles;

const clampNumber = (value, min, max) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return min;
  return Math.min(Math.max(numeric, min), max);
};

const HEADING_FONT_SIZES = {
  h1: "4rem",
  h2: "3rem",
  h3: "2rem",
  h4: "1.75rem",
  h5: "1.5rem",
  h6: "1.25rem",
};

const OpacitySliderField = ({ field, value, onChange }) => {
  const resolved = clampNumber(value, 0, 1);
  const percentageLabel = `${Math.round(resolved * 100)}%`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <FieldLabel
        label={
          field?.label
            ? `${field.label} (${percentageLabel})`
            : `Media opacity (${percentageLabel})`
        }
        el="label"
        className="website-editor-opacity-field__label"
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={resolved}
        onChange={(event) => {
          const nextValue = clampNumber(event.target.value, 0, 1);
          onChange(nextValue);
        }}
        aria-label={field?.label ?? "Media opacity"}
      />
    </div>
  );
};

const FontWeightSliderField = ({ field, value, onChange }) => {
  const resolved = clampNumber(value, 100, 900);
  const normalized = Math.round(resolved / 50) * 50;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <FieldLabel
        label={
          field?.label
            ? `${field.label} (${normalized})`
            : `Font weight (${normalized})`
        }
        el="label"
        className="website-editor-fontweight-field__label"
      />
      <input
        type="range"
        min={100}
        max={900}
        step={50}
        value={normalized}
        onChange={(event) => {
          const rawValue = clampNumber(event.target.value, 100, 900);
          const snapped = Math.round(rawValue / 50) * 50;
          onChange(snapped);
        }}
        aria-label={field?.label ?? "Font weight"}
      />
    </div>
  );
};

const TOPNAV_STYLES = `
.website-editor-topnav__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
  flex: 1;
}

.website-editor-topnav__brand {
  font-weight: 600;
  font-size: 1.125rem;
  letter-spacing: -0.01em;
}

.website-editor-topnav__toggle {
  margin-left: auto;
  border: none;
  background: transparent;
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.website-editor-topnav__toggle:hover {
  background: rgba(15, 23, 42, 0.06);
}

.website-editor-topnav__toggle-line {
  width: 1.5rem;
  height: 2px;
  background: currentColor;
  display: block;
  position: relative;
}

.website-editor-topnav__toggle-line::before,
.website-editor-topnav__toggle-line::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 2px;
  left: 0;
  background: currentColor;
  transition: transform 0.2s ease;
}

.website-editor-topnav__toggle-line::before {
  top: -6px;
}

.website-editor-topnav__toggle-line::after {
  top: 6px;
}

.website-editor-topnav__links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.website-editor-topnav__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
  color: var(--tblr-primary);
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.1);
  transition: background 0.2s ease, color 0.2s ease;
}

.website-editor-topnav__link:hover {
  color: #fff;
  background: var(--tblr-primary);
}

.website-editor-topnav__links,
.website-editor-topnav__toggle {
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

@media (max-width: 768px) {
  .website-editor-topnav__toggle {
    display: inline-flex;
  }

  .website-editor-topnav__links {
    display: none;
    flex-direction: column;
    width: 100%;
    margin-left: 0;
    padding-top: 0.75rem;
    border-top: 1px solid var(--tblr-border-color);
  }

  .website-editor-topnav__links.is-open {
    display: flex;
  }

  .website-editor-topnav__link {
    width: 100%;
    justify-content: center;
  }
}
`;

const renderCustomStyles = (customCss) =>
  typeof customCss === "string" && customCss.trim().length > 0 ? (
    <style>{customCss}</style>
  ) : null;

const TopNavBlock = ({
  brandLabel = "",
  menuItems = [],
  id,
  customCss,
  horizontalPadding = 16,
}) => {
  const [open, setOpen] = useState(false);
  const navItems = Array.isArray(menuItems) ? menuItems : [];
  const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
  const resolvedPadding = clampNumber(horizontalPadding, 0, 200);

  return (
    <Fragment>
      <style>{TOPNAV_STYLES}</style>
      {renderCustomStyles(styleTag)}
      <nav
        id={id}
        className="website-editor-topnav"
        style={applyInlineStyles(
          {
            padding: `0.75rem ${resolvedPadding}px`,
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            justifyContent: "space-between",
            flexWrap: "wrap",
            width: "100%",
          },
          inlineStyle
        )}
      >
        <div className="website-editor-topnav__header">
          {brandLabel ? (
            <div className="website-editor-topnav__brand">{brandLabel}</div>
          ) : null}
          <button
            type="button"
            className="website-editor-topnav__toggle"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="website-editor-topnav__toggle-line" />
          </button>
        </div>
        <div
          className={`website-editor-topnav__links${open ? " is-open" : ""}`}
        >
          {navItems.map((item, idx) =>
            item?.label ? (
              <a
                key={`${item.label}-${idx}`}
                href={item.href || "#"}
                className="website-editor-topnav__link"
                onClick={() => {
                  if (open) setOpen(false);
                }}
              >
                {item.label}
              </a>
            ) : null
          )}
        </div>
      </nav>
    </Fragment>
  );
};

export const DEFAULT_WEBSITE_DATA = {
  content: [
    {
      id: "default-topnav",
      type: "TopNav",
      props: {
        id: "site-topnav",
        brandLabel: "EventPilot",
        menuItems: [
          { label: "Volunteer", href: "#volunteer" },
          { label: "Register", href: "#register" },
          { label: "Support Others", href: "#support" },
        ],
      },
    },
    {
      id: "default-text",
      type: "TextBlock",
      props: {
        id: "intro-text",
        body: "Build your event website.\n\nDrag components from the sidebar to customize the experience. Saving and publishing will arrive soon.",
      },
    },
  ],
};

export const createWebsiteEditorConfig = () => ({
  categories: {
    Layout: {
      components: [
        "TopNav",
        "Container",
        "TextBlock",
        "ButtonRow",
        "Heading",
        "Spacer",
      ],
    },
    Media: {
      components: ["MediaBanner"],
    },
  },
  components: {
    TextBlock: {
      label: "Text",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "section-text",
        },
        body: {
          type: "textarea",
          label: "Body",
          placeholder: "Share more details about your event.",
        },
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      render: ({ body, id, customCss }) => {
        const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
        return (
          <Fragment>
            {renderCustomStyles(styleTag)}
            <div
              id={id}
              style={applyInlineStyles({ whiteSpace: "pre-wrap" }, inlineStyle)}
            >
              {body || ""}
            </div>
          </Fragment>
        );
      },
    },
    TopNav: {
      label: "Top navigation",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "site-topnav",
        },
        brandLabel: {
          type: "text",
          label: "Brand label",
          placeholder: "Event name",
        },
        menuItems: {
          type: "array",
          label: "Menu buttons",
          of: {
            type: "object",
            label: "Menu item",
            fields: {
              label: { type: "text", label: "Label" },
              href: { type: "text", label: "Link" },
            },
          },
          defaultItem: { label: "Volunteer", href: "#volunteer" },
        },
        horizontalPadding: {
          type: "number",
          label: "Horizontal padding (px)",
          defaultValue: 16,
          min: 0,
          step: 4,
        },
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      defaultProps: {
        horizontalPadding: 16,
      },
      render: (props) => <TopNavBlock {...props} />,
    },
    ButtonRow: {
      label: "Buttons",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "button-row",
        },
        buttons: {
          type: "array",
          label: "Buttons",
          of: {
            type: "object",
            label: "Button",
            fields: {
              label: { type: "text", label: "Label" },
              href: { type: "text", label: "Link" },
            },
          },
          defaultItem: { label: "Learn more", href: "#" },
        },
        alignment: {
          type: "radio",
          label: "Alignment",
          options: [
            { value: "flex-start", label: "Left" },
            { value: "center", label: "Center" },
            { value: "flex-end", label: "Right" },
          ],
          defaultValue: "center",
        },
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      render: ({ buttons = [], alignment = "center", customCss, id }) => {
        const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
        return (
          <Fragment>
            {renderCustomStyles(styleTag)}
            <Row
              id={id}
              gap={0.75}
              style={applyInlineStyles(
                { justifyContent: alignment, flexWrap: "wrap" },
                inlineStyle
              )}
            >
              {buttons.map((button, idx) => (
                <a
                  key={`${button.label}-${idx}`}
                  href={button.href}
                  style={{
                    padding: "0.625rem 1.25rem",
                    background: "var(--tblr-primary)",
                    color: "#fff",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {button.label}
                </a>
              ))}
            </Row>
          </Fragment>
        );
      },
    },
    Heading: {
      label: "Heading",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "heading",
        },
        text: {
          type: "text",
          label: "Text",
          placeholder: "Enter a heading",
        },
        headingLevel: {
          type: "select",
          label: "Heading level",
          options: [
            { value: "h1", label: "H1" },
            { value: "h2", label: "H2" },
            { value: "h3", label: "H3" },
            { value: "h4", label: "H4" },
            { value: "h5", label: "H5" },
            { value: "h6", label: "H6" },
          ],
          defaultValue: "h2",
        },
        fontWeight: {
          type: "custom",
          label: "Font weight",
          render: ({ value, onChange, field }) => (
            <FontWeightSliderField
              field={field}
              value={value}
              onChange={onChange}
            />
          ),
        },
        textAlign: {
          type: "radio",
          label: "Alignment",
          options: [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ],
          defaultValue: "left",
        },
        color: {
          type: "custom",
          label: "Text color",
          render: ({ value, onChange, field }) => (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <FieldLabel
                label={field?.label ?? "Text color"}
                el="label"
                className="website-editor-color-field__label"
              />
              <input
                type="color"
                value={
                  typeof value === "string" && value.trim().length > 0
                    ? value
                    : "#111827"
                }
                onChange={(event) => onChange(event.target.value)}
                aria-label={field?.label ?? "Text color"}
              />
            </div>
          ),
        },
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      defaultProps: {
        text: "Add a heading",
        headingLevel: "h2",
        fontWeight: 600,
        textAlign: "left",
        color: "#111827",
      },
      render: ({
        id,
        text = "Add a heading",
        headingLevel = "h2",
        fontWeight = 600,
        textAlign = "left",
        color = "#111827",
        customCss,
      }) => {
        const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
        const resolvedLevel =
          typeof headingLevel === "string" &&
          /^h[1-6]$/i.test(headingLevel.trim())
            ? headingLevel.trim().toLowerCase()
            : "h2";
        const HeadingTag = resolvedLevel;
        const resolvedWeight = clampNumber(fontWeight, 100, 900);
        const content = typeof text === "string" ? text : "";
        const resolvedFontSize =
          HEADING_FONT_SIZES[HeadingTag] ?? HEADING_FONT_SIZES.h2;

        return (
          <Fragment>
            {renderCustomStyles(styleTag)}
            <HeadingTag
              id={id}
              style={applyInlineStyles(
                {
                  fontSize: resolvedFontSize,
                  lineHeight: resolvedFontSize,
                  fontWeight: Math.round(resolvedWeight / 50) * 50,
                  textAlign:
                    textAlign === "center" || textAlign === "right"
                      ? textAlign
                      : "left",
                  margin: 0,
                  color:
                    typeof color === "string" && color.trim().length > 0
                      ? color.trim()
                      : "#111827",
                },
                inlineStyle
              )}
            >
              {content || "Add a heading"}
            </HeadingTag>
          </Fragment>
        );
      },
    },
    Container: {
      label: "Container",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "container",
        },
        paddingX: {
          type: "number",
          label: "Horizontal padding (px)",
          defaultValue: 16,
          min: 0,
          step: 4,
        },
        paddingY: {
          type: "number",
          label: "Vertical padding (px)",
          defaultValue: 16,
          min: 0,
          step: 4,
        },
        content: {
          type: "slot",
          label: "Content",
        },
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      defaultProps: {
        paddingX: 16,
        paddingY: 16,
      },
      render: ({ id, paddingX = 16, paddingY = 16, content, customCss }) => {
        const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
        const resolvedPaddingX = clampNumber(paddingX, 0, 200);
        const resolvedPaddingY = clampNumber(paddingY, 0, 200);
        const contentRenderer =
          typeof content === "function" ? content : undefined;

        return (
          <Fragment>
            {renderCustomStyles(styleTag)}
            <div
              id={id}
              style={applyInlineStyles(
                {
                  width: "100%",
                  margin: "0 auto",
                  padding: `${resolvedPaddingY}px ${resolvedPaddingX}px`,
                  boxSizing: "border-box",
                },
                inlineStyle
              )}
            >
              {contentRenderer
                ? contentRenderer({
                    style: {
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                    },
                  })
                : null}
            </div>
          </Fragment>
        );
      },
    },
    Spacer: {
      label: "Spacer",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "spacer",
        },
        height: {
          type: "number",
          label: "Height (px)",
          defaultValue: 24,
          min: 0,
          step: 4,
        },
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      defaultProps: {
        height: 24,
      },
      render: ({ id, height = 24, customCss }) => {
        const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
        const resolvedHeight = clampNumber(height, 0, 1000);

        return (
          <Fragment>
            {renderCustomStyles(styleTag)}
            <div
              id={id}
              aria-hidden={true}
              role="presentation"
              style={applyInlineStyles(
                {
                  width: "100%",
                  height: `${resolvedHeight}px`,
                  minHeight: `${resolvedHeight}px`,
                  flexShrink: 0,
                },
                inlineStyle
              )}
            />
          </Fragment>
        );
      },
    },
    MediaBanner: {
      label: "Media banner",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "image-banner",
        },
        mediaType: {
          type: "radio",
          label: "Media type",
          options: [
            { value: "image", label: "Image" },
            { value: "video", label: "Video" },
          ],
          defaultValue: "image",
        },
        imageUrl: {
          type: "custom",
          label: "Image",
          placeholder: "https://…",
          render: ({ value, onChange, field }) => (
            <ImageUrlField field={field} value={value} onChange={onChange} />
          ),
        },
        videoUrl: {
          type: "text",
          label: "Video URL",
          placeholder: "https://…",
        },
        altText: {
          type: "text",
          label: "Alt text",
          placeholder: "Describe the image",
        },
        height: {
          type: "number",
          label: "Height (px)",
          defaultValue: 320,
        },
        objectFit: {
          type: "select",
          label: "Object fit",
          options: [
            { value: "cover", label: "Cover" },
            { value: "contain", label: "Contain" },
            { value: "fill", label: "Fill" },
            { value: "none", label: "None" },
          ],
          defaultValue: "cover",
        },
        childAlignment: {
          type: "radio",
          label: "Content alignment",
          options: [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ],
          defaultValue: "center",
        },
        mediaOpacity: {
          type: "custom",
          label: "Media opacity",
          render: ({ value, onChange, field }) => (
            <OpacitySliderField
              field={field}
              value={value}
              onChange={onChange}
            />
          ),
        },
        contentPadding: {
          type: "number",
          label: "Content padding (px)",
          defaultValue: 16,
          min: 0,
          step: 4,
        },
        overlayContent: {
          type: "slot",
          label: "Overlay content",
        },
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      defaultProps: {
        mediaType: "image",
        objectFit: "cover",
        height: 320,
        mediaOpacity: 1,
        contentPadding: 16,
      },
      resolveFields: (data, { fields }) => {
        const mediaType = data?.props?.mediaType ?? data?.mediaType ?? "image";
        const nextFields = { ...fields };

        if (nextFields.imageUrl) {
          nextFields.imageUrl = {
            ...nextFields.imageUrl,
            visible: mediaType === "image",
          };
        }

        if (nextFields.videoUrl) {
          nextFields.videoUrl = {
            ...nextFields.videoUrl,
            visible: mediaType === "video",
          };
        }

        if (nextFields.contentPadding) {
          const currentPadding =
            data?.props?.contentPadding ?? data?.contentPadding ?? 16;
          nextFields.contentPadding = {
            ...nextFields.contentPadding,
            defaultValue:
              typeof currentPadding === "number" &&
              !Number.isNaN(currentPadding)
                ? currentPadding
                : 16,
          };
        }

        return nextFields;
      },
      resolveData: (data) => {
        const currentPadding =
          data?.props?.contentPadding ?? data?.contentPadding;

        if (
          typeof currentPadding === "number" &&
          !Number.isNaN(currentPadding)
        ) {
          return data;
        }

        return {
          ...data,
          props: {
            ...(data?.props || {}),
            contentPadding: 16,
          },
        };
      },
      render: ({
        mediaType = "image",
        imageUrl,
        videoUrl,
        altText,
        height = 320,
        objectFit = "cover",
        mediaOpacity = 1,
        contentPadding = 16,
        overlayContent,
        customCss,
        childAlignment = "center",
        id,
      }) => {
        const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
        const resolvedHeight =
          typeof height === "number" && !Number.isNaN(height) ? height : 320;
        const normalizedFit =
          typeof objectFit === "string" && objectFit.length > 0
            ? objectFit
            : "cover";
        const normalizedOpacity =
          typeof mediaOpacity === "number" && !Number.isNaN(mediaOpacity)
            ? Math.min(Math.max(mediaOpacity, 0), 1)
            : 1;
        const resolvedPadding =
          typeof contentPadding === "number" && !Number.isNaN(contentPadding)
            ? Math.max(contentPadding, 0)
            : 0;
        const isVideo = mediaType === "video";
        const mediaUrl = isVideo ? videoUrl : imageUrl;
        const hasMedia = typeof mediaUrl === "string" && mediaUrl.length > 0;

        return (
          <Fragment>
            {renderCustomStyles(styleTag)}
            <div
              id={id}
              style={applyInlineStyles(
                {
                  position: "relative",
                  height: resolvedHeight,
                  minHeight: resolvedHeight,
                  overflow: "hidden",
                },
                inlineStyle
              )}
              data-media-type={mediaType}
              data-media-url={mediaUrl}
            >
              <div
                aria-hidden={!hasMedia}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  background: hasMedia ? "transparent" : "#f1f1f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {hasMedia ? (
                  isVideo ? (
                    <video
                      src={mediaUrl}
                      muted
                      autoPlay
                      loop
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: normalizedFit,
                        pointerEvents: "none",
                        opacity: normalizedOpacity,
                      }}
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={altText}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: normalizedFit,
                        pointerEvents: "none",
                        opacity: normalizedOpacity,
                      }}
                    />
                  )
                ) : (
                  <span>No media provided</span>
                )}
              </div>
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  minHeight: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    childAlignment === "left"
                      ? "flex-start"
                      : childAlignment === "right"
                      ? "flex-end"
                      : "center",
                  padding: `${resolvedPadding}px`,
                  boxSizing: "border-box",
                }}
              >
                {overlayContent
                  ? overlayContent({
                      style: {
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems:
                          childAlignment === "left"
                            ? "flex-start"
                            : childAlignment === "right"
                            ? "flex-end"
                            : "center",
                        justifyContent: "center",
                        gap: "1.5rem",
                        padding: 0,
                        boxSizing: "border-box",
                        background: "rgba(15, 23, 42, 0.2)",
                        borderRadius: "0.75rem",
                        pointerEvents: "auto",
                      },
                      minEmptyHeight: Math.max(
                        resolvedHeight - resolvedPadding * 2,
                        400
                      ),
                    })
                  : null}
              </div>
            </div>
          </Fragment>
        );
      },
    },
  },
});
