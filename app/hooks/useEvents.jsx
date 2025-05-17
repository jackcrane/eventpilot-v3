import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { Input, Typography, Button, useModal, Badge } from "tabler-react-2";
import { useState } from "react";
import { Dropzone } from "../components/dropzone/Dropzone";
import { useSlugChecker } from "./useSlugChecker";
import { TzPicker } from "../components/tzDateTime/tzDateTime";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEvents = () => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events`, fetcher);

  const createEvent = async (data) => {
    try {
      const promise = authFetch(`/api/events`, {
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

export const CreateEvent = ({ createEvent }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [defaultTz, setDefaultTz] = useState("");

  const generateSlug = (val) =>
    val
      .toLowerCase()
      .replaceAll(" ", "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 30);

  const handleSlugInput = (val) => {
    setSlugTouched(true);
    setSlug(generateSlug(val));
  };

  const currentSlug = slugTouched ? slug : generateSlug(name);
  const { slugPresent } = useSlugChecker({ slug: currentSlug, type: "event" });

  return (
    <>
      <Input
        label="Event Name"
        placeholder="Event Name"
        onInput={(val) => setName(val)}
        value={name}
        className="mb-0"
        variant={name.length > 0 && name.length < 2 ? "danger" : null}
      />
      <Typography.I className="text-muted">
        <b>Event Name</b> is required and must be at least 2 characters long.
      </Typography.I>
      <Input
        label="Event Description"
        placeholder="Event Description"
        onInput={(val) => setDescription(val)}
        value={description}
        className="mt-3"
        variant={
          description.length > 0 && description.length < 10 ? "danger" : null
        }
      />
      <Typography.I className="text-muted">
        <b>Description</b> is required and must be at least 10 characters long.
      </Typography.I>
      <label className="form-label mt-3">
        Slug{"  "}
        <Badge
          soft
          color={!slugPresent ? "success" : "danger"}
          style={{
            fontSize: "0.6rem",
          }}
        >
          {!slugPresent ? "Available" : "Unavailable"}
        </Badge>
      </label>
      <Input
        placeholder="Slug"
        onInput={handleSlugInput}
        onFocus={() => setSlugTouched(true)}
        value={currentSlug}
        className=" mb-0"
        variant={slugPresent ? "danger" : null}
      />
      <Typography.I className="text-muted">
        <b>Slug</b> is required and must be at least 3 characters long. It
        cannot be longer than 30 characters and can only contain lowercase
        letters, numbers, and hyphens. Slugs are used to generate URLs for your
        events, so be sure to choose something that is memorable, easy to spell,
        and reflects your event well.
      </Typography.I>
      <div className="mt-3" />
      <label className="form-label">Logo or Image</label>
      <Dropzone onSuccessfulUpload={(d) => setLogo(d.fileId)} />
      <TzPicker
        required
        aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
        prompt={"Select a default timezone"}
        onChange={(d) => setDefaultTz(d)}
        value={defaultTz}
      />
      TZ: {defaultTz}
      <Button
        className={"mt-3"}
        onClick={() =>
          createEvent({
            name,
            description,
            logoFileId: logo,
            slug: currentSlug,
            defaultTz, // Pbf03
          })
        }
      >
        Create Event
      </Button>
    </>
  );
};
