import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  useModal,
  Typography,
  Input,
  Button,
  DropdownInput,
} from "tabler-react-2";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCrmFields = ({ eventId }) => {
  const key = `/api/events/${eventId}/crm/fields`;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);

  const {
    modal,
    ModalElement: CreateCrmFieldModalElement,
    close,
  } = useModal({
    title: "Create a new field",
    text: null, // we’ll supply text when invoking modal
    buttons: [],
    modalProps: {
      modalBodyStyle: {
        overflowX: "unset",
        overflowY: "unset",
      },
    },
  });

  const createCrmField = async (data) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error",
      });

      const created = await promise;
      close(false);
      await mutate(key);
      await mutate(`/api/events/${eventId}/crm`);
      return created;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  // now returns a Promise<createdField|false>
  const createCrmFieldModal = () =>
    new Promise((resolve) => {
      modal({
        title: "Create a new field",
        text: (
          <CreateCrmField
            createCrmField={createCrmField}
            mutationLoading={mutationLoading}
            onFinish={(result) => resolve(result)}
          />
        ),
        buttons: [],
        modalProps: {
          modalBodyStyle: { overflowX: "unset", overflowY: "unset" },
        },
      });
    });

  return {
    crmFields: data?.crmFields,
    loading: isLoading,
    mutationLoading,
    error,
    createCrmFieldModal,
    CreateCrmFieldModalElement,
    refetch: () => mutate(key),
    createCrmField,
  };
};

const CreateCrmField = ({ createCrmField, mutationLoading, onFinish }) => {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState({ id: "TEXT" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const r = await createCrmField({
      label,
      description,
      type: type.id,
    });
    onFinish(r);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Label"
        value={label}
        onInput={(v) => setLabel(v)}
        required
      />
      <Input
        label="Description"
        value={description}
        onInput={(v) => setDescription(v)}
      />
      <DropdownInput
        label="Type"
        value={type}
        onChange={(v) => setType(v)}
        items={[
          { id: "TEXT", label: "Text" },
          { id: "EMAIL", label: "Email" },
          { id: "PHONE", label: "Phone" },
          { id: "BOOLEAN", label: "Boolean" },
          { id: "DATE", label: "Date" },
          { id: "NUMBER", label: "Number" },
        ]}
        aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
      />
      <Button type="submit" loading={mutationLoading} className="mt-3">
        Save
      </Button>
    </form>
  );
};
