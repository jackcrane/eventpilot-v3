import { useState } from "react";
import { TriPanelLayout } from "../TriPanelLayout/TriPanelLayout";
import styles from "./FormBuilder.module.css";
import { Row } from "../../util/Flex";
import { Button, Input, Typography, Util } from "tabler-react-2";
import classNames from "classnames";

export const FormBuilder = () => {
  return (
    <TriPanelLayout
      leftIcon="palette"
      leftTitle="Palette"
      leftChildren={<Palette />}
      centerIcon="forms"
      centerTitle="Form Preview"
      centerChildren={<FormPreview />}
      centerContentClassName="bg-gray-100 polka"
      centerContentProps={{ style: { padding: 9, margin: -9, height: "100%" } }}
      rightIcon="adjustments-alt"
      rightTitle="Field Settings"
      rightChildren={<div>Step 3</div>}
    />
  );
};

const Palette = () => {
  return (
    <div>
      <Typography.Text>Palette</Typography.Text>
    </div>
  );
};

const FormPreview = () => {
  const [pages, setPages] = useState([{ id: 0 }]);

  return (
    <div className={styles.previewContainer}>
      {pages.map((p) => (
        <div className={classNames(styles.previewPage)} key={p.id}>
          <Row justify="space-between" align="center" gap={1} className="mb-3">
            <Input
              value={p.name}
              onChange={(v) =>
                setPages((prev) =>
                  prev.map((p2) => (p2.id === p.id ? { ...p2, name: v } : p2))
                )
              }
              style={{ flex: 1 }}
              className="mb-0"
              size="sm"
              placeholder="Page Name"
            />
            <Button
              size="sm"
              className={styles.deleteButton}
              onClick={() =>
                setPages((prev) => prev.filter((p2) => p2.id !== p.id))
              }
            >
              Delete
            </Button>
          </Row>
        </div>
      ))}
      <Util.Hr
        text={
          <Button
            onClick={() => setPages((prev) => [...prev, { id: prev.length }])}
            size="sm"
            style={{ transform: "translateX(calc(15px/4))" }}
          >
            Add Page
          </Button>
        }
      />
    </div>
  );
};
