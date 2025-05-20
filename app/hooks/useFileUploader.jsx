import useSWRMutation from "swr/mutation";
import { authFetchWithoutContentType } from "../util/url";
import toast from "react-hot-toast";
import { useEffect } from "react";

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
  const { onSuccessfulUpload } = options || {};

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

  const upload = async (files) => {
    if (!files || (Array.isArray(files) && files.length === 0)) {
      throw { message: "No files provided", status: 400 };
    }

    // await the actual result…
    const result = await trigger(files).catch((err) => {
      console.error("Upload failed in hook:", err);
      throw err;
    });

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
    loading: isMutating,
    error,
  };
};
