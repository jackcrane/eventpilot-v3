import { useState } from "react";
import { Row } from "../../util/Flex";
import { MarkdownRender } from "../markdown/MarkdownRenderer";
import { RichTextField } from "./RichTextField";

const TOPNAV_STYLES = `
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

@media (max-width: 768px) {
  .website-editor-topnav {
    flex-direction: column;
    align-items: stretch;
  }

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

const TopNavBlock = ({ brandLabel = "", menuItems = [], id }) => {
  const [open, setOpen] = useState(false);
  const navItems = Array.isArray(menuItems) ? menuItems : [];

  return (
    <nav
      id={id}
      className="website-editor-topnav"
      style={{
        border: "1px solid var(--tblr-border-color)",
        borderRadius: 12,
        padding: "0.75rem 1.25rem",
        background: "var(--tblr-body-bg, #fff)",
        marginBottom: "1.5rem",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.07)",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        position: "relative",
        flexWrap: "wrap",
      }}
    >
      <style>{TOPNAV_STYLES}</style>
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
            <RichTextField
              field={field}
              value={value}
              onChange={onChange}
            />
          ),
        },
      },
      render: ({ body }) => (
        <div style={{ marginBottom: "1.5rem" }}>
          <MarkdownRender markdown={body || ""} />
        </div>
      ),
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
      },
      render: ({ buttons = [], alignment = "center" }) => (
        <Row
          gap={0.75}
          style={{ justifyContent: alignment, flexWrap: "wrap" }}
        >
          {buttons.map((button, idx) => (
            <a
              key={`${button.label}-${idx}`}
              href={button.href}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: 999,
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
      ),
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
          type: "text",
          label: "Image URL",
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
      },
      render: ({ imageUrl, altText, height = 320 }) =>
        imageUrl ? (
          <div
            style={{
              marginBottom: "1.5rem",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
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
          </div>
        ) : null,
    },
  },
});
