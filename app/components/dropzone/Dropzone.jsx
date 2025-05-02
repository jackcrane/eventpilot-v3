import React, { useEffect } from "react";
import { Input, Button, Alert } from "tabler-react-2";
import { useState } from "react";
import { Row } from "../../util/Flex";
import { useFileUploader } from "../../hooks/useFileUploader";
import styles from "./dropzone.module.css";
import classNames from "classnames";

export const Dropzone = ({ onSuccessfulUpload = () => {} }) => {
  const [files, setFiles] = useState([]);

  const { data, error, loading, upload } = useFileUploader("/api/file", {
    onSuccessfulUpload,
  });

  return (
    <>
      {error && (
        <Alert variant="danger" className="mb-3" title="Error">
          {error}
        </Alert>
      )}
      <Row gap={1}>
        <Input
          style={{ flex: 1 }}
          type="file"
          name="file"
          inputProps={{
            multiple: true,
          }}
          onRawChange={(e) => {
            setFiles(e.target.files);
          }}
          className={classNames(
            "mb-3",
            files.length > 0 && styles.dropzoneFocusRight
          )}
        />
        {files.length > 0 && (
          <Button
            onClick={() => {
              upload(files);
            }}
            className="mb-3"
            loading={loading}
            variant="primary"
          >
            Upload
          </Button>
        )}
      </Row>
    </>
  );
};
