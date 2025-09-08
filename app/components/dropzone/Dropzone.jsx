import React, { useState } from "react";
import { Input, Alert, Spinner, Typography, Card, Util } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { useFileUploader } from "../../hooks/useFileUploader";
import styles from "./dropzone.module.css";
import classNames from "classnames";

export const Dropzone = ({
  onSuccessfulUpload = () => {},
  style,
  accept,
  maxFileSize,
  label,
  required,
  hint,
  value,
  ...props
}) => {
  const [files, setFiles] = useState([]);
  const [uploaded, setUploaded] = useState(false);

  const { data, error, loading, upload } = useFileUploader("/api/file", {
    onSuccessfulUpload: (data) => {
      setUploaded(true);
      onSuccessfulUpload(data);
    },
    maxFileSize,
  });

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    setFiles(selectedFiles);
    setUploaded(false);
    upload(selectedFiles);
  };

  return (
    <div style={style} className={"mb-3"}>
      {label && (
        <label className={`form-label ${required ? "required" : ""}`}>
          {label}
        </label>
      )}
      {/* {uploaded && (
        <Alert variant="success" className="mb-3" title="Success">
          <Typography.Text>File uploaded successfully.</Typography.Text>
          <img src={data.url} style={{ maxWidth: 200, maxHeight: 200 }} />
          <Typography.Text className="mt-3 mb-0">
            You can upload a different file if you want to replace this one.
          </Typography.Text>
        </Alert>
      )} */}
      {value && (
        <Alert variant="success" className="mb-3" title="Existing File">
          <Typography.Text>A file is uploaded for this field.</Typography.Text>
          <img
            src={value.url || value.location}
            style={{ maxWidth: 200, maxHeight: 100 }}
          />
          <Typography.Text className="mt-3 mb-0">
            You can upload a different file if you want to replace this one.
          </Typography.Text>
        </Alert>
      )}
      {error && (
        <Alert variant="danger" className="mb-3" title="Error">
          {error}
        </Alert>
      )}

      <Row gap={2}>
        <Input
          style={{ flex: 1 }}
          type="file"
          name="file"
          inputProps={{ multiple: true, accept }}
          onRawChange={handleFileChange}
          className="mb-0"
          {...props}
        />
        {loading && <Spinner />}
      </Row>
      {hint && <div className="form-hint mt-2">{hint}</div>}
    </div>
  );
};
