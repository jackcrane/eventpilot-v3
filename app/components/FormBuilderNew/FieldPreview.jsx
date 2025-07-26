import styles from "./FormBuilder.module.css";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { FieldConsumer } from "../FieldConsumer/FieldConsumer";
import { Typography, Button } from "tabler-react-2";
import { inputTypes } from "./InputTypes";

export const FieldItemPreview = ({
  field,
  dragHandleProps,
  onDelete,
  onEdit,
}) => {
  // return JSON.stringify({ type: field.type });
  const typeDef = inputTypes.find((t) => t.id === field.type);

  return (
    <div className={styles.fieldItemPreviewContainer}>
      <Row gap={1} align="center">
        <div {...dragHandleProps} className={styles.handleSmall}>
          <Icon i="grip-vertical" size={18} />
        </div>
        <div className={styles.fieldItemContent}>
          <Row gap={1} justify="flex-end" className="mb-2">
            <Row gap={0.5} align="center" style={{ opacity: 0.5 }}>
              <Icon i={typeDef.icon} size={14} color={typeDef.iconColor} />
              <Typography.Text className="mb-0">
                {typeDef.label}
              </Typography.Text>
            </Row>
            <Button variant="danger" outline onClick={onDelete} size="sm">
              <Icon i="trash" />
            </Button>
            <Button onClick={onEdit} size="sm">
              <Icon i="pencil" />
            </Button>
          </Row>
          <FieldConsumer field={field} forceNoMargin limitHeight={true} />
        </div>
      </Row>
    </div>
  );
};
