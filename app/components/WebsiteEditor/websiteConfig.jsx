import { Fragment, useState } from "react";
import { Row } from "../../util/Flex";
import { MarkdownRender } from "../markdown/MarkdownRenderer";
import { RichTextField } from "./RichTextField";
import { ImageUrlField } from "./ImageUrlField";

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

const TopNavBlock = ({ brandLabel = "", menuItems = [], id, customCss }) => {
  const [open, setOpen] = useState(false);
  const navItems = Array.isArray(menuItems) ? menuItems : [];
  const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);

  return (
    <Fragment>
      <style>{TOPNAV_STYLES}</style>
      {renderCustomStyles(styleTag)}
      <nav
        id={id}
        className="website-editor-topnav"
        style={applyInlineStyles(
          {
            padding: "0.75rem 0",
            marginBottom: "1.5rem",
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
        body: "### Build your event website\n\nDrag components from the sidebar to customize the experience. Saving and publishing will arrive soon.",
      },
    },
  ],
};

export const createWebsiteEditorConfig = () => ({
  categories: {
    Layout: {
      components: ["TopNav", "TextBlock", "ButtonRow"],
    },
    Media: {
      components: ["ImageBanner"],
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
          type: "custom",
          label: "Body",
          placeholder: "Share more details about your event.",
          render: ({ value, onChange, field }) => (
            <RichTextField field={field} value={value} onChange={onChange} />
          ),
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
              style={applyInlineStyles({ marginBottom: "1.5rem" }, inlineStyle)}
            >
              <MarkdownRender markdown={body || ""} />
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
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
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
    ImageBanner: {
      label: "Image banner",
      fields: {
        id: {
          type: "text",
          label: "Section ID",
          placeholder: "image-banner",
        },
        imageUrl: {
          type: "custom",
          label: "Image",
          placeholder: "https://…",
          render: ({ value, onChange, field }) => (
            <ImageUrlField field={field} value={value} onChange={onChange} />
          ),
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
        customCss: {
          type: "textarea",
          label: "Custom CSS",
          placeholder: "/* Optional component-specific styles */",
        },
      },
      render: ({ imageUrl, altText, height = 320, customCss, id }) => {
        const { inlineStyle, styleTag } = resolveCustomCss(customCss, id);
        return (
          <Fragment>
            {renderCustomStyles(styleTag)}
            <div
              id={id}
              style={applyInlineStyles({ marginBottom: "1.5rem" }, inlineStyle)}
              data-imageUrl={imageUrl}
            >
              {imageUrl && imageUrl.length > 0 ? (
                <img
                  src={imageUrl}
                  alt={altText}
                  style={{
                    display: "block",
                    width: "100%",
                    height,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    background: "#f1f1f1",
                    height,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span>No image provided</span>
                </div>
              )}
            </div>
          </Fragment>
        );
      },
    },
  },
});
