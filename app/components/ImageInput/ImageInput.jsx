import React, { useState, useEffect } from "react";
import { Icon } from "../../util/Icon";
import { Spinner } from "tabler-react-2";
import { useFileUploader } from "../../hooks/useFileUploader";
import styles from "./imageInput.module.css";

export const ImageInput = ({
  value,
  onSuccessfulUpload = () => {},
  accept = "image/*",
  maxFileSize,
  className = "",
  style = {},
  ...props
}) => {
  const [preview, setPreview] = useState(value);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const { data, error, loading, upload } = useFileUploader("/api/file", {
    onSuccessfulUpload: (data) => {
      setPreview(data.url);
      onSuccessfulUpload(data);
    },
    maxFileSize,
  });

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    console.log(file);
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    upload([file]);
  };

  return (
    <div className={`${styles.container} ${className}`} style={style}>
      {preview ? (
        <img src={preview} alt="Preview" className={styles.image} />
      ) : (
        <Icon i="plus" size={32} />
      )}
      {loading && (
        <div className={styles.spinnerOverlay}>
          <Spinner />
        </div>
      )}
      <input
        type="file"
        accept={accept}
        className={styles.input}
        onChange={handleChange}
        {...props}
      />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};
