import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Table,
  Button,
  Typography,
  Input,
  DropdownInput,
  useOffcanvas,
} from "tabler-react-2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { useCampaigns } from "../../../../../../hooks/useCampaigns";
import { useEmailTemplates } from "../../../../../../hooks/useEmailTemplates";
import { useMailingLists } from "../../../../../../hooks/useMailingLists";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../../../../util/Constants";

const CreateCampaignForm = ({ templates, mailingLists, onSubmit, onClose }) => {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [mailingListId, setMailingListId] = useState(mailingLists[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!templates.length) {
      setTemplateId("");
      return;
    }
    const hasSelection = templates.some(
      (template) => template.id === templateId
    );
    if (!templateId || !hasSelection) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  useEffect(() => {
    if (!mailingLists.length) {
      setMailingListId("");
      return;
    }
    const hasSelection = mailingLists.some((list) => list.id === mailingListId);
    if (!mailingListId || !hasSelection) {
      setMailingListId(mailingLists[0].id);
    }
  }, [mailingLists, mailingListId]);

  const noTemplates = templates.length === 0;
  const noMailingLists = mailingLists.length === 0;

  const ready = Boolean(
    name.trim() && templateId && mailingListId && !submitting
  );
  const submitDisabled = !ready || noTemplates || noMailingLists;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitDisabled) return;

    let shouldClose = false;

    try {
      setSubmitting(true);
      const success = await onSubmit({
        name: name.trim(),
        templateId,
        mailingListId,
      });
      if (success) {
        setName("");
        shouldClose = true;
      }
    } finally {
      setSubmitting(false);
      if (shouldClose) {
        onClose();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Typography.H5 className="mb-0 text-secondary">CAMPAIGN</Typography.H5>
        <Typography.H1 className="mb-2">New Campaign</Typography.H1>
        <Typography.Text className="text-muted">
          Name your campaign, choose a template, and target a mailing list.
        </Typography.Text>
      </div>
      <Input
        label="Campaign name"
        placeholder="Participant reminder"
        value={name}
        onChange={(value) => setName(value)}
        required
      />
      <DropdownInput
        label="Template"
        prompt="Select a template"
        items={templates.map((template) => ({
          id: template.id,
          value: template.id,
          label: template.name,
        }))}
        value={templateId || undefined}
        onChange={(item) => setTemplateId(item.value)}
        required
        className="mb-2"
        disabled={noTemplates}
      />
      <DropdownInput
        label="Mailing list"
        prompt="Select a mailing list"
        items={mailingLists.map((list) => ({
          id: list.id,
          value: list.id,
          label: list.title,
        }))}
        value={mailingListId || undefined}
        onChange={(item) => setMailingListId(item.value)}
        required
        className="mb-2"
        disabled={noMailingLists}
      />
      {(noTemplates || noMailingLists) && (
        <Typography.Text className="text-muted">
          Add at least one template and mailing list to create a campaign.
        </Typography.Text>
      )}
      <Row justify="flex-end">
        <Button
          type="submit"
          variant="primary"
          disabled={submitDisabled}
          loading={submitting}
        >
          Create campaign
        </Button>
      </Row>
    </form>
  );
};

export const EventEmailCampaignsPage = () => {
  const { eventId } = useParams();
  const { campaigns, loading, error, createCampaign, sendCampaign } =
    useCampaigns({ eventId });
  const { templates, loading: templatesLoading } = useEmailTemplates({
    eventId,
  });
  const { mailingLists, loading: mailingListsLoading } = useMailingLists({
    eventId,
  });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 420, zIndex: 1051 },
  });

  const [sendingId, setSendingId] = useState(null);

  const activeTemplates = useMemo(
    () => (templates || []).filter((template) => !template.deleted),
    [templates]
  );

  const activeMailingLists = useMemo(
    () => (mailingLists || []).filter((list) => !list.deleted),
    [mailingLists]
  );

  const openCreateCampaign = () => {
    offcanvas({
      title: "New Campaign",
      content: (
        <CreateCampaignForm
          templates={activeTemplates}
          mailingLists={activeMailingLists}
          onSubmit={async (payload) => {
            const created = await createCampaign(payload);
            return Boolean(created?.id);
          }}
          onClose={close}
        />
      ),
    });
  };

  const handleSend = async (campaign) => {
    if (!campaign?.id) return;

    try {
      setSendingId(campaign.id);
      await sendCampaign(campaign.id);
    } finally {
      setSendingId(null);
    }
  };

  const isEmptyState = !loading && !campaigns?.length;
  const createDisabled = !activeTemplates.length || !activeMailingLists.length;
  const loadingState = loading || templatesLoading || mailingListsLoading;

  return (
    <EventPage
      title="Email Campaigns"
      loading={loadingState}
      description="Create and launch simple email blasts using your templates and mailing lists."
    >
      {OffcanvasElement}
      <Row
        justify="space-between"
        align="center"
        style={{ marginBottom: campaigns?.length ? 16 : 0 }}
      >
        <div>
          {createDisabled && (
            <Typography.Text className="text-muted">
              Add at least one template and mailing list to create a campaign.
            </Typography.Text>
          )}
        </div>
        <Button
          variant="primary"
          onClick={openCreateCampaign}
          disabled={createDisabled}
        >
          New campaign
        </Button>
      </Row>
      {error && (
        <Typography.Text className="text-danger">
          Failed to load campaigns. Please try again.
        </Typography.Text>
      )}
      {isEmptyState ? (
        <Empty
          gradient={false}
          title="No campaigns yet."
          text="Create your first campaign and it will appear here."
          action={
            !createDisabled && (
              <Button variant="primary" onClick={openCreateCampaign}>
                New campaign
              </Button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <Table
            className="card"
            columns={[
              {
                label: "Name",
                accessor: "name",
              },
              {
                label: "Template",
                accessor: "template",
                render: (value) => (
                  <Link to={`/events/${eventId}/email/templates/${value.id}`}>
                    {value.name}
                  </Link>
                ),
              },
              {
                label: "Mailing list",
                accessor: "mailingList",
                render: (value) => (
                  <Link to={`/events/${eventId}/email/lists/${value.id}`}>
                    {value.title}
                  </Link>
                ),
              },
              {
                label: "Created",
                accessor: "createdAt",
                render: (value) => moment(value).format(DATETIME_FORMAT),
              },
              {
                label: "Actions",
                accessor: "id",
                render: (value, row) => (
                  <Button
                    size="sm"
                    onClick={() => handleSend(row)}
                    loading={sendingId === row.id}
                  >
                    Send blast
                  </Button>
                ),
              },
            ]}
            data={campaigns}
          />
        </div>
      )}
    </EventPage>
  );
};

export default EventEmailCampaignsPage;
