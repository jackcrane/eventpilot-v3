import { useEffect, useRef } from "react";
import { Row } from "../../util/Flex";
import { Input, Button } from "tabler-react-2";
import { Icon } from "../../util/Icon";

export const ArrayListing = ({
  label,
  singularLabel,
  value,
  onChange,
  icon,
  valueField = "email",
}) => {
  const tempId = useRef(0);

  // Initialize with one empty item if value is empty or undefined
  useEffect(() => {
    if (!value || value.length === 0) {
      onChange([
        {
          key: `temp-${tempId.current++}`,
          label: "",
          [valueField]: "",
        },
      ]);
    }
  }, [value, onChange, valueField]);

  const handleChange = (idOrKey, val) => {
    // Add new item
    if (idOrKey === null && val === null) {
      const newItem = {
        key: `temp-${tempId.current++}`,
        label: "",
        [valueField]: "",
      };
      onChange([...(value || []), newItem]);
      return;
    }

    // Delete item
    if (val === null) {
      onChange(
        (value || []).filter(
          (item) => item.id !== idOrKey && item.key !== idOrKey
        )
      );
      return;
    }

    // Update existing item
    onChange(
      (value || []).map((item) => {
        const isMatch = item.id === idOrKey || item.key === idOrKey;
        return isMatch ? { ...item, ...val } : item;
      })
    );
  };

  if (!value) return null;

  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      {value.map((item) => {
        const keyId = item.id || item.key;
        return (
          <Row gap={1} className="mb-2" key={keyId}>
            <Input
              value={item.label}
              onChange={(e) => handleChange(keyId, { label: e })}
              className="mb-0"
              style={{ width: 150 }}
              noMargin
              placeholder="Label"
              icon={<Icon i="label" />}
            />
            <Input
              value={item[valueField] || ""}
              onChange={(e) => handleChange(keyId, { [valueField]: e })}
              className="mb-0"
              noMargin
              style={{ flex: 1 }}
              placeholder={singularLabel}
              icon={<Icon i={icon} />}
            />
            <Button
              outline
              onClick={() => handleChange(keyId, null)}
              className="mb-0"
              style={{ alignSelf: "stretch" }}
              variant="danger"
            >
              <Icon i="trash" />
            </Button>
          </Row>
        );
      })}
      <Row justify="flex-end">
        <Button onClick={() => handleChange(null, null)} className="mt-1">
          <Icon i={`${icon}-plus`} style={{ marginRight: 8 }} />
          Add {singularLabel}
        </Button>
      </Row>
    </div>
  );
};
