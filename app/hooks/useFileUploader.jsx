import useSWRMutation from "swr/mutation";
import { authFetchWithoutContentType, u } from "../util/url";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

const uploadFiles = async (url, { arg }) => {
  const formData = new FormData();

  Array.from(arg).forEach((file) => {
    formData.append("files", file);
  });

  const response = await authFetchWithoutContentType(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 402) {
      toast.error("Your account is not in good payment standing.");
      return;
    }

    let errorMessage = "File upload failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData?.message || response.statusText;
    } catch (parseError) {
      errorMessage = response.statusText || "Unknown error";
    }
    console.error("Upload error:", errorMessage);
    throw errorMessage;
  }

  return await response.json();
};

export const useFileUploader = (endpoint, options) => {
  const { onSuccessfulUpload, maxFileSize, onProgress: defaultOnProgress } =
    options || {};

  const [localUploading, setLocalUploading] = useState(false);

  const { trigger, data, error, isMutating } = useSWRMutation(
    endpoint,
    uploadFiles,
    {
      throwOnError: false,
    }
  );

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const upload = async (files, perUploadOptions) => {
    if (!files || (Array.isArray(files) && files.length === 0)) {
      throw { message: "No files provided", status: 400 };
    }

    const maxBytes = Number.isFinite(maxFileSize)
      ? maxFileSize
      : 5 * 1024 * 1024; // default 5MB
    const list = Array.from(files);

    // Pre-validate file sizes client-side to avoid server roundtrip
    const tooLarge = list.filter((f) => typeof f.size === "number" && f.size > maxBytes);
    if (tooLarge.length > 0) {
      const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
      const names = tooLarge.map((f) => f.name || "file").join(", ");
      const msg = tooLarge.length === 1
        ? `${names} exceeds the ${maxMb} MB limit`
        : `${tooLarge.length} files exceed the ${maxMb} MB limit: ${names}`;
      toast.error(msg);
      return null;
    }

    const effectiveOnProgress =
      perUploadOptions?.onProgress || defaultOnProgress || null;

    // If a progress callback is provided, use XHR to report progress; otherwise use fetch/SWR
    let result = null;
    if (typeof effectiveOnProgress === "function") {
      setLocalUploading(true);
      try {
        result = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = u(endpoint);
          xhr.open("POST", url, true);

          // Auth header like authFetchWithoutContentType
          try {
            const token = localStorage.getItem("token");
            if (token && token !== "null") {
              xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            }
            const instance = localStorage.getItem("instance");
            if (instance) xhr.setRequestHeader("X-Instance", instance);
          } catch (_) {}

          xhr.upload.onprogress = (evt) => {
            if (!evt || !evt.lengthComputable) return;
            try {
              effectiveOnProgress({
                loaded: evt.loaded,
                total: evt.total,
                progress: Math.max(0, Math.min(1, evt.loaded / evt.total)),
              });
            } catch (_) {}
          };
          xhr.onerror = () => {
            reject("Network error during upload");
          };
          xhr.onabort = () => {
            reject("Upload aborted");
          };
          xhr.onload = () => {
            const status = xhr.status || 0;
            if (status === 0) return reject("Upload failed");
            if (status === 401) {
              localStorage.removeItem("token");
              window.logout && window.logout();
            }
            if (status === 402) {
              toast.error("Your account is not in good payment standing.");
              return resolve(null);
            }
            if (status < 200 || status >= 300) {
              try {
                const body = JSON.parse(xhr.responseText || "{}");
                const message = body?.message || xhr.statusText || "Upload failed";
                return reject(message);
              } catch (_) {
                return reject(xhr.statusText || "Upload failed");
              }
            }
            try {
              const body = JSON.parse(xhr.responseText || "{}");
              resolve(body);
            } catch (e) {
              reject("Invalid server response");
            }
          };

          const formData = new FormData();
          Array.from(files).forEach((file) => {
            formData.append("files", file);
          });
          xhr.send(formData);
        });
      } catch (err) {
        console.error("Upload failed (XHR):", err);
        setLocalUploading(false);
        throw err;
      }
      setLocalUploading(false);
    } else {
      // await the actual result…
      result = await trigger(files).catch((err) => {
        console.error("Upload failed in hook:", err);
        throw err;
      });
    }

    // now `result` is your JSON; SWR state may not be set yet,
    // but you can call your callback immediately:
    if (!result) return;
    toast.success("File uploaded successfully");
    onSuccessfulUpload?.(result);

    return result;
  };

  return {
    upload,
    data,
    loading: isMutating || localUploading,
    error,
  };
};
