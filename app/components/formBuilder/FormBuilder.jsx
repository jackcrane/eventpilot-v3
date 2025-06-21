import React, { useState, useEffect } from "react";
import { useFormBuilder } from "../../hooks/useFormBuilder";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  Button,
  Input,
  Switch,
  Typography,
  DropdownInput,
} from "tabler-react-2";
import { createId as cuid } from "@paralleldrive/cuid2";
import styles from "./FormBuilder.module.css";
import { Icon } from "../../util/Icon";
import classNames from "classnames";
import { Row } from "../../util/Flex";
import toast from "react-hot-toast";

// Default props for each new field
const DEFAULT_FIELD_PROPS = {
  label: "",
  placeholder: "",
  description: "",
  required: false,
  defaultValue: false,
  options: [],
};

// Available field types with icons and descriptions
export const FIELD_TYPES = [
  {
    type: "text",
    label: "Text",
    icon: "cursor-text",
    description: "Single-line text input",
    supports: ["placeholder"],
  },
  {
    type: "email",
    label: "Email",
    icon: "mail",
    description: "Email address input",
    supports: ["placeholder"],
  },
  {
    type: "phone",
    label: "Phone",
    icon: "phone",
    description: "Phone number input",
    supports: ["placeholder"],
  },
  {
    type: "shortAnswer",
    label: "Short Answer",
    icon: "align-left",
    description: "Multi-line text input",
    supports: ["placeholder"],
  },
  {
    type: "boolean",
    label: "Boolean",
    icon: "toggle-left",
    description: "On/off toggle switch",
    supports: ["defaultValue"],
  },
  {
    type: "dropdown",
    label: "Dropdown",
    icon: "list",
    description: "Select from a list of options",
    supports: ["options", "prompt"],
  },
];

export const TEMPLATE_FIELDS = [
  {
    id: "template-tshirt-size",
    type: "dropdown",
    label: "T-Shirt Size",
    icon: "shirt",
    description: "Dropdown with standard t-shirt sizes",
    props: {
      label: "T-Shirt Size",
      prompt: "Select a size",
      required: true,
      description: "",
      defaultValue: false,
      options: [
        { id: cuid(), label: "XS" },
        { id: cuid(), label: "S" },
        { id: cuid(), label: "M" },
        { id: cuid(), label: "L" },
        { id: cuid(), label: "XL" },
        { id: cuid(), label: "XXL" },
      ],
    },
  },
  {
    id: "referral-source",
    type: "dropdown",
    label: "Referral Source",
    icon: "affiliate",
    description: "Dropdown with referral source options",
    props: {
      label: "How did you hear about us?",
      prompt: "Select a source",
      required: false,
      description: "",
      defaultValue: false,
      options: [
        { id: cuid(), label: "Word-of-mouth" },
        { id: cuid(), label: "Google" },
        { id: cuid(), label: "Facebook" },
        { id: cuid(), label: "Twitter" },
        { id: cuid(), label: "Instagram" },
        { id: cuid(), label: "Advertisement" },
        { id: cuid(), label: "Other" },
      ],
    },
  },
];

// Palette of draggable field types
export const FieldPalette = ({ types }) => (
  <div className={styles.sidebar}>
    <h4>Fields</h4>
    <Droppable droppableId="FIELD_LIST" isDropDisabled>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={styles.fieldList}
        >
          {types.map((t, idx) => (
            <Draggable key={t.type} draggableId={t.type} index={idx}>
              {(prov) => (
                <div
                  ref={prov.innerRef}
                  {...prov.draggableProps}
                  {...prov.dragHandleProps}
                  className={styles.fieldItem}
                >
                  <div className={styles.fieldInfo}>
                    <Row gap={1}>
                      <Icon i={t.icon} className={styles.fieldIcon} />
                      <Typography.Text className={"mb-0"}>
                        {t.label}
                      </Typography.Text>
                    </Row>
                    <Typography.Text
                      className={classNames(
                        styles.fieldDescription,
                        "mb-0",
                        "text-muted"
                      )}
                    >
                      {t.description}
                    </Typography.Text>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
);

export const TemplatePalette = ({ templates }) => (
  <div className={styles.sidebar}>
    <h4>Templates</h4>
    <Droppable droppableId="TEMPLATE_LIST" isDropDisabled>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={styles.fieldList}
        >
          {templates.map((t, idx) => (
            <Draggable key={t.id} draggableId={t.id} index={idx}>
              {(prov) => (
                <div
                  ref={prov.innerRef}
                  {...prov.draggableProps}
                  {...prov.dragHandleProps}
                  className={styles.fieldItem}
                >
                  <div className={styles.fieldInfo}>
                    <Row gap={1}>
                      <Icon i={t.icon} className={styles.fieldIcon} />
                      <Typography.Text className={"mb-0"}>
                        {t.label}
                      </Typography.Text>
                    </Row>
                    <Typography.Text
                      className={classNames(
                        styles.fieldDescription,
                        "mb-0",
                        "text-muted"
                      )}
                    >
                      {t.description}
                    </Typography.Text>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
);

// Preview component for each field
export const FieldPreview = ({ field }) => {
  const {
    label,
    placeholder,
    description,
    required,
    defaultValue,
    options,
    prompt,
  } = field.props;
  switch (field.type) {
    case "text":
    case "email":
    case "phone":
      return (
        <Input
          label={label || "Label"}
          type={field.type === "phone" ? "tel" : field.type}
          placeholder={placeholder || ""}
          required={required}
          disabled
        />
      );
    case "shortAnswer":
      return (
        <>
          <label className={styles.previewLabel}>{label || "Label"}</label>
          <textarea
            className="form-control"
            placeholder={placeholder || ""}
            rows={3}
            required={required}
            disabled
          />
        </>
      );
    case "boolean":
      return (
        <Switch label={label || "Label"} checked={defaultValue} disabled />
      );
    case "dropdown":
      return (
        <DropdownInput
          label={label || "Label"}
          prompt={prompt || "Select an option"}
          values={options}
        />
      );
    default:
      return null;
  }
};

// Settings editor for each field
export const FieldSettings = ({ field, updateProp }) => {
  const typeDef = FIELD_TYPES.find((t) => t.type === field.type);
  return (
    <div className={styles.settings}>
      <Input
        label="Label"
        value={field.props.label}
        onChange={(e) => updateProp(field.id, "label", e)}
      />
      {typeDef.supports.includes("placeholder") && (
        <Input
          label="Placeholder"
          value={field.props.placeholder}
          onChange={(e) => updateProp(field.id, "placeholder", e)}
        />
      )}
      {typeDef.supports.includes("prompt") && (
        <Input
          label="Prompt"
          value={field.props.prompt}
          onChange={(e) => updateProp(field.id, "prompt", e)}
        />
      )}
      <Input
        label="Description"
        value={field.props.description}
        onChange={(e) => updateProp(field.id, "description", e)}
      />
      <Switch
        label="Required"
        checked={field.props.required}
        onChange={(checked) => updateProp(field.id, "required", checked)}
      />
      {typeDef.supports.includes("defaultValue") && (
        <Switch
          label="Default Value"
          checked={field.props.defaultValue}
          onChange={(checked) => updateProp(field.id, "defaultValue", checked)}
        />
      )}
      {typeDef.supports.includes("options") && (
        <div className={styles.optionsEditor}>
          <Typography.Text className="form-label">Options</Typography.Text>
          {field.props.options.map((opt, idx) => (
            <Row key={opt.id} gap={1} align="flex-end" className={"mb-3"}>
              <Input
                style={{ flex: 1 }}
                className={"mb-0"}
                value={opt.label}
                onChange={(e) => {
                  const newOptions = field.props.options.map((o) =>
                    o.id === opt.id ? { ...o, label: e } : o
                  );
                  updateProp(field.id, "options", newOptions);
                }}
              />
              <Button
                outline
                variant="danger"
                onClick={() => {
                  const newOptions = field.props.options.filter(
                    (o) => o.id !== opt.id
                  );
                  updateProp(field.id, "options", newOptions);
                }}
                className={"mb-0"}
              >
                <Icon i="trash" />
              </Button>
            </Row>
          ))}
          <Button
            size="sm"
            onClick={() =>
              updateProp(field.id, "options", [
                ...field.props.options,
                { id: cuid(), label: "" },
              ])
            }
          >
            Add Option
          </Button>
        </div>
      )}
    </div>
  );
};

// Single field item, locked fields are not draggable
export const FieldItem = ({
  field,
  index,
  updateProp,
  removeField,
  originalIds,
}) => {
  const [collapsed, setCollapsed] = useState(
    field.locked || originalIds.has(field.id)
  );
  const typeDef = FIELD_TYPES.find((t) => t.type === field.type);

  const content = (
    <div className={styles.fieldWrapper}>
      {/* Collapse/Expand Header */}
      <div
        className={styles.collapsedHeader}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <Icon i={collapsed ? "chevron-right" : "chevron-down"} />
        <Typography.H3 className={classNames(styles.collapsedText, "mb-0")}>
          {typeDef.label}
          <i>{field.props.label ? `: ${field.props.label}` : ""}</i>
        </Typography.H3>
      </div>

      {/* Expanded Content */}
      {!collapsed && (
        <div className={styles.fieldContent}>
          <div className={styles.previewBox}>
            <div className={styles.previewNoticeContainer}>
              <span className={styles.previewNotice}>
                PREVIEW PREVIEW PREVEIW PREVIEW PREVIEW PREVEIW PREVIEW PREVIEW
                PREVEIW PREVIEW PREVIEW PREVEIW PREVIEW PREVIEW PREVEIW PREVIEW
                PREVIEW PREVEIW PREVIEW PREVIEW PREVEIW PREVIEW PREVIEW PREVEIW
              </span>
            </div>
            <FieldPreview field={field} />
            {field.props.description && (
              <div className={styles.previewDescription}>
                {field.props.description}
              </div>
            )}
          </div>
          {field.locked && (
            <Typography.Text className="mb-3">
              EventPilot automatically collects the name and email of submitters
            </Typography.Text>
          )}
          {!field.locked && (
            <>
              <FieldSettings field={field} updateProp={updateProp} />
              <hr />
              <Button
                size="sm"
                icon="trash"
                outline
                onClick={() => removeField(field.id)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return field.locked ? (
    content
  ) : (
    <Draggable key={field.id} draggableId={field.id} index={index}>
      {(prov) => (
        <div
          ref={prov.innerRef}
          {...prov.draggableProps}
          {...prov.dragHandleProps}
        >
          {content}
        </div>
      )}
    </Draggable>
  );
};

// Canvas holding all fields and save button, separating locked and draggable fields
export const FieldCanvas = ({
  fields,
  updateProp,
  removeField,
  saveForm,
  originalIds,
}) => {
  const lockedFields = fields.filter((f) => f.locked);
  const draggableFields = fields.filter((f) => !f.locked);

  return (
    <div className={styles.canvas}>
      <h4>Form</h4>
      <Droppable droppableId="FORM">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={styles.dropzone}
          >
            {lockedFields.map((f, i) => (
              <FieldItem
                key={f.id}
                field={f}
                index={i}
                updateProp={updateProp}
                removeField={removeField}
                originalIds={originalIds}
              />
            ))}
            {draggableFields.map((f, i) => (
              <FieldItem
                key={f.id}
                field={f}
                index={lockedFields.length + i}
                updateProp={updateProp}
                removeField={removeField}
                originalIds={originalIds}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <Button className={styles.saveButton} onClick={saveForm}>
        Save Form
      </Button>
    </div>
  );
};

// Main builder component
export const FormBuilder = () => {
  const { eventId } = useParams();
  const { fields, loading, error, updateFields } = useFormBuilder(eventId);

  // Local state for fields being edited
  const [localFields, setLocalFields] = useState([]);
  useEffect(() => {
    if (!loading && !error) {
      // Labels for our default locked fields
      const defaultLabels = { name: "Your Name", email: "Your Email" };
      // Check if server already has any fields
      const serverHasName = fields.some(
        (f) => f.type === "text" && f.label === defaultLabels.name
      );
      const serverHasEmail = fields.some(
        (f) => f.type === "email" && f.label === defaultLabels.email
      );
      // Only prepend defaults if neither exist on server
      const needsDefaults = !serverHasName && !serverHasEmail;
      // Build default locked fields when needed
      const defaultLocked = needsDefaults
        ? [
            {
              id: cuid(),
              type: "text",
              props: {
                ...DEFAULT_FIELD_PROPS,
                label: defaultLabels.name,
                placeholder: "John Doe",
                required: true,
              },
              locked: true,
            },
            {
              id: cuid(),
              type: "email",
              props: {
                ...DEFAULT_FIELD_PROPS,
                label: defaultLabels.email,
                placeholder: "john.doe@example.com",
                required: true,
              },
              locked: true,
            },
          ]
        : [];
      // Map server fields and lock any that match our defaults
      const mapped = fields.map((f) => ({
        id: f.id,
        type: f.type,
        props: {
          label: f.label,
          placeholder: f.placeholder,
          description: f.description,
          required: f.required,
          defaultValue: f.defaultValue,
          prompt: f.prompt,
          options: (f.options || []).map((o) => ({ id: o.id, label: o.label })),
        },
        locked:
          (f.type === "text" && f.label === defaultLabels.name) ||
          (f.type === "email" && f.label === defaultLabels.email),
      }));
      setLocalFields([...defaultLocked, ...mapped]);
    }
  }, [fields, loading, error]);

  // Capture the original IDs for fields and options
  const originalIds = new Set(fields.map((f) => f.id));

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;

    if (
      source.droppableId === "FIELD_LIST" &&
      destination.droppableId === "FORM"
    ) {
      const newField = {
        id: cuid(),
        type: draggableId,
        props: { ...DEFAULT_FIELD_PROPS },
      };
      const next = [...localFields];
      next.splice(destination.index, 0, newField);
      setLocalFields(next);
      return;
    }

    if (
      source.droppableId === "TEMPLATE_LIST" &&
      destination.droppableId === "FORM"
    ) {
      const template = TEMPLATE_FIELDS.find((t) => t.id === draggableId);
      const copied = {
        id: cuid(),
        type: template.type,
        props: {
          ...template.props,
          options: template.props.options.map((o) => ({
            ...o,
            id: cuid(),
          })),
        },
      };
      const next = [...localFields];
      next.splice(destination.index, 0, copied);
      setLocalFields(next);
      return;
    }

    if (source.droppableId === "FORM" && destination.droppableId === "FORM") {
      const next = [...localFields];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setLocalFields(next);
    }
  };

  const updateProp = (id, prop, value) => {
    const next = localFields.map((f) =>
      f.id === id ? { ...f, props: { ...f.props, [prop]: value } } : f
    );
    setLocalFields(next);
  };

  const removeField = (id) => {
    const next = localFields.filter((f) => f.id !== id);
    setLocalFields(next);
  };

  const saveForm = () => {
    // Always sync locked fields first (they carry server IDs once loaded)
    const lockedFieldsLocal = localFields.filter((f) => f.locked);
    // Then sync any new or reordered fields
    const newFields = localFields.filter((f) => !f.locked);
    const syncFields = [...lockedFieldsLocal, ...newFields];

    const apiFields = syncFields.map((f, idx) => {
      const isExisting = originalIds.has(f.id);
      return {
        ...(isExisting ? { id: f.id } : {}),
        type: f.type,
        label: f.props.label,
        placeholder: f.props.placeholder || null,
        description: f.props.description || null,
        required: f.props.required,
        defaultValue: f.props.defaultValue,
        prompt: f.props.prompt || null,
        order: idx,
        options: (f.props.options || []).map((opt, optIdx) => ({
          ...(originalIds.has(opt.id) ? { id: opt.id } : {}),
          label: opt.label,
          order: optIdx,
        })),
      };
    });
    return updateFields(apiFields);
  };

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error loading form fields.</div>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div>
          <FieldPalette types={FIELD_TYPES} />
          <TemplatePalette templates={TEMPLATE_FIELDS} />
        </div>
        <FieldCanvas
          fields={localFields}
          updateProp={updateProp}
          removeField={removeField}
          saveForm={(v) =>
            toast.promise(saveForm(v), { loading: "Saving", success: "Saved!" })
          }
          originalIds={originalIds}
        />
      </div>
    </DragDropContext>
  );
};
