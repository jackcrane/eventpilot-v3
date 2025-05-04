import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { Input, Typography, Button, useModal, Badge } from "tabler-react-2";
import { useEffect, useState } from "react";
import { Dropzone } from "../components/dropzone/Dropzone";
import { useSlugChecker } from "./useSlugChecker";
import { useParams } from "react-router-dom";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCampaigns = () => {
  const { eventId } = useParams();
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(eventId ? `/api/events/${eventId}/campaigns` : null, fetcher);

  useEffect(() => {
    refetch();
  }, [eventId]);

  const createCampaign = async (data) => {
    try {
      const promise = authFetch(`/api/events/${eventId}/campaigns`, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating campaign...",
        success: "Campaign created successfully",
        error: "Error creating campaign",
      });

      return true;
    } catch {
      return false;
    }
  };

  const {
    modal: createCampaignModal,
    ModalElement: CreateCampaignModalElement,
  } = useModal({
    title: "Create a new campaign",
    text: (
      <CreateCampaign
        createCampaign={async (data) => {
          if (await createCampaign(data)) document.location.reload();
        }}
      />
    ),
    buttons: [],
  });

  return {
    campaigns: data?.campaigns,
    createCampaignModal,
    CreateCampaignModalElement,
    loading: isLoading,
    error,
    refetch,
  };
};

export const CreateCampaign = ({ createCampaign }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

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
  const { slugPresent } = useSlugChecker({
    slug: currentSlug,
    type: "campaign",
  });

  return (
    <>
      <Input
        label="Campaign Name"
        placeholder="Campaign Name"
        onInput={(val) => setName(val)}
        value={name}
        className="mb-0"
        variant={name.length > 0 && name.length < 2 ? "danger" : null}
      />
      <Typography.I className="text-muted">
        <b>Campaign Name</b> is required and must be at least 2 characters long.
      </Typography.I>

      <Input
        label="Campaign Description"
        placeholder="Campaign Description"
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
      <Button
        onClick={() =>
          createCampaign({
            name,
            description,
            slug: currentSlug,
          })
        }
      >
        Create Campaign
      </Button>
    </>
  );
};
