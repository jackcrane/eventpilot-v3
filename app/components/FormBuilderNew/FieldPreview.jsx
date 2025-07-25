import styles from "./FormBuilder.module.css";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { FieldConsumer } from "../FieldConsumer/FieldConsumer";

export const FieldItemPreview = ({ field, dragHandleProps }) => {
  return (
    <div>
      <Row gap={1} align="center">
        <div {...dragHandleProps} className={styles.handleSmall}>
          <Icon i="grip-vertical" size={18} />
        </div>
        <div className={styles.fieldItemContent}>
          <FieldConsumer field={field} />
          {JSON.stringify(field)}
        </div>
      </Row>
    </div>
  );
};
