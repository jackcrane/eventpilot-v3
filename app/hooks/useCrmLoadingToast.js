import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export const useCrmLoadingToast = ({
  fieldsLoading,
  personsLoading,
  fieldsValidating,
  personsValidating,
}) => {
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const loadingToastId = useRef(null);
  const userRequestedRefetch = useRef(false);

  useEffect(() => {
    if (!hasInitialLoaded && !fieldsLoading && !personsLoading) {
      setHasInitialLoaded(true);
    }
  }, [hasInitialLoaded, fieldsLoading, personsLoading]);

  useEffect(() => {
    if (!hasInitialLoaded) return;
    const busy = fieldsLoading || personsLoading || fieldsValidating || personsValidating;
    if (busy && userRequestedRefetch.current) {
      if (!loadingToastId.current) {
        loadingToastId.current = toast.loading("Refreshing contacts...");
      }
    } else if (!busy && loadingToastId.current) {
      toast.dismiss(loadingToastId.current);
      loadingToastId.current = null;
      userRequestedRefetch.current = false;
    }
  }, [hasInitialLoaded, fieldsLoading, personsLoading, fieldsValidating, personsValidating]);

  const markUserRequestedRefetch = () => {
    userRequestedRefetch.current = true;
  };

  return { hasInitialLoaded, markUserRequestedRefetch };
};
