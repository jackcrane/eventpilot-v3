import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { Input, Typography, Button, useModal } from "tabler-react-2";
import { useState } from "react";
import { Dropzone } from "../components/dropzone/Dropzone";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEvents = () => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/event`, fetcher);

  const createEvent = async (data) => {
    try {
      const promise = authFetch(`/api/event`, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating event...",
        success: "Event created successfully",
        error: "Error creating event",
      });

      return true;
    } catch {
      return false;
    }
  };

  const { modal: createEventModal, ModalElement: CreateEventModalElement } =
    useModal({
      title: "Create a new event",
      text: (
        <CreateEvent
          createEvent={async (data) => {
            if (await createEvent(data)) document.location.reload();
          }}
        />
      ),
      buttons: [],
    });

  return {
    events: data?.events,
    createEventModal,
    CreateEventModalElement,
    loading: isLoading,
    error,
    refetch,
  };
};

const CreateEvent = ({ createEvent }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState(null);

  return (
    <>
      <Input
        label="Event Name"
        placeholder="Event Name"
        onInput={setName}
        value={name}
        className={"mb-0"}
        variant={name.length > 0 && name.length < 2 ? "danger" : null}
      />
      <Typography.I className={"text-muted"}>
        <b>Event Name</b> is required and must be at least 2 characters long.
      </Typography.I>
      <Input
        label="Event Description"
        placeholder="Event Description"
        onInput={setDescription}
        value={description}
        variant={
          description.length > 0 && description.length < 10 ? "danger" : null
        }
        className={"mb-0 mt-3"}
      />
      <Typography.I className={"text-muted"}>
        <b>Description</b> is required and must be at least 10 characters long.
      </Typography.I>
      <div className={"mt-3"}></div>
      <Dropzone onSuccessfulUpload={(d) => setLogo(d.fileId)} />
      <Button
        onClick={() =>
          createEvent({
            name,
            description,
            logoFileId: logo,
          })
        }
      >
        Create Event
      </Button>
    </>
  );
};
