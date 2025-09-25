import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Table,
  Button,
  Typography,
  Input,
  DropdownInput,
  Checkbox,
  useOffcanvas,
  useConfirm,
  Spinner,
} from "tabler-react-2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { useCampaigns } from "../../../../../../hooks/useCampaigns";
import { useEmailTemplates } from "../../../../../../hooks/useEmailTemplates";
import { useMailingLists } from "../../../../../../hooks/useMailingLists";
import { useEvent } from "../../../../../../hooks/useEvent";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../../../../util/Constants";
import { TzDateTime } from "../../../../../../components/tzDateTime/tzDateTime";
import { useCampaignStats } from "../../../../../../hooks/useCampaignStats";

const formatStatLine = ({ percent = 0, count = 0, total = 0 }) => {
  if (!total) return "0% (0/0)";
  const pct = Number(percent ?? 0);
  const formatted = Number.isFinite(pct)
    ? Number.isInteger(pct)
      ? pct.toString()
      : pct.toFixed(1)
    : "0";
  return `${formatted}% (${count}/${total})`;
};

const CampaignStatsCell = ({ eventId, campaign }) => {
  const { stats, loading, error } = useCampaignStats({
    eventId,
    campaignId: campaign?.id,
  });

  if (loading) {
    return <Spinner size="sm" />;
  }

  if (error) {
    return (
      <Typography.Text className="text-danger">
        Failed to load stats
      </Typography.Text>
    );
  }

  if (!stats || !stats.total) {
    return (
      <Typography.Text className="text-muted">
        No email activity recorded yet.
      </Typography.Text>
    );
  }

  return (
    <div
      style={{
        borderRadius: 5,
        backgroundColor: "var(--tblr-gray-200)",
        overflow: "hidden",
        width: 100,
        height: 10,
        lineHeight: 0,
      }}
    >
      <div
        style={{
          height: 10,
          width: stats.openedPercent,
          backgroundColor: "var(--tblr-green)",
          display: "inline-block",
        }}
      />
      <div
        style={{
          height: 10,
          width: Math.max(0, stats.deliveredPercent - stats.openedPercent),
          backgroundColor: "var(--tblr-blue)",
          display: "inline-block",
        }}
      />
      <div
        style={{
          height: 10,
          width: stats.bouncedPercent,
          backgroundColor: "var(--tblr-yellow)",
          display: "inline-block",
        }}
      />
    </div>
  );
};

const CampaignRecipientCountCell = ({ eventId, campaign }) => {
  if (!campaign?.sendEffortStarted) {
    return <Typography.Text className="text-muted">—</Typography.Text>;
  }

  const { stats, loading, error } = useCampaignStats({
    eventId,
    campaignId: campaign?.id,
  });

  if (loading) {
    return <Spinner size="sm" />;
  }

  if (error) {
    return (
      <Typography.Text className="text-danger">Failed</Typography.Text>
    );
  }

  const total = Number.isFinite(stats?.total) ? stats.total : 0;

  return <Typography.Text className="mb-0">{total}</Typography.Text>;
};

const CreateCampaignForm = ({
  templates,
  mailingLists,
  onSubmit,
  onClose,
  defaultTz,
  initialCampaign,
  mode = "create",
  confirmImmediateSend,
  resolveMailingListAudience,
}) => {
  const [name, setName] = useState(() => initialCampaign?.name || "");
  const [templateId, setTemplateId] = useState(
    () => initialCampaign?.templateId || templates[0]?.id || ""
  );
  const [mailingListId, setMailingListId] = useState(
    () => initialCampaign?.mailingListId || mailingLists[0]?.id || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [sendImmediately, setSendImmediately] = useState(
    () => initialCampaign?.sendImmediately || false
  );
  const fallbackTz = initialCampaign?.sendAtTz || defaultTz || "UTC";
  const [sendAt, setSendAt] = useState(() =>
    initialCampaign?.sendImmediately ? null : initialCampaign?.sendAt || null
  );
  const [sendAtTz, setSendAtTz] = useState(() =>
    initialCampaign?.sendImmediately
      ? fallbackTz
      : initialCampaign?.sendAtTz || fallbackTz
  );

  useEffect(() => {
    if (!initialCampaign) return;
    setName(initialCampaign.name || "");
    setTemplateId(initialCampaign.templateId || templates[0]?.id || "");
    setMailingListId(
      initialCampaign.mailingListId || mailingLists[0]?.id || ""
    );
    setSendImmediately(initialCampaign.sendImmediately || false);
    setSendAt(
      initialCampaign.sendImmediately ? null : initialCampaign.sendAt || null
    );
    setSendAtTz(
      initialCampaign.sendImmediately
        ? fallbackTz
        : initialCampaign.sendAtTz || fallbackTz
    );
  }, [initialCampaign, fallbackTz, templates, mailingLists]);

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

  useEffect(() => {
    if (!sendImmediately && !sendAtTz) {
      setSendAtTz(fallbackTz);
    }
  }, [sendImmediately, fallbackTz, sendAtTz]);

  useEffect(() => {
    if (!sendImmediately) return;
    if (sendAt) {
      setSendAt(null);
    }
  }, [sendImmediately, sendAt]);

  const scheduleReady = sendImmediately || (sendAt && sendAtTz);

  const ready = Boolean(
    name.trim() && templateId && mailingListId && scheduleReady && !submitting
  );
  const submitDisabled = !ready || noTemplates || noMailingLists;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitDisabled) return;

    let shouldClose = false;

    try {
      const requiresImmediateConfirm =
        sendImmediately &&
        (!initialCampaign || !initialCampaign.sendImmediately);

      if (requiresImmediateConfirm && confirmImmediateSend) {
        const audience = resolveMailingListAudience?.(mailingListId);
        const count = audience?.count ?? 0;
        const label = count === 1 ? "person" : "people";
        const proceed = await confirmImmediateSend({
          title: "Warning!",
          text: `You are about to email ${count} ${label}. Are you sure?`,
          confirmText: "Send now",
          confirmVariant: "danger",
        });
        if (!proceed) {
          return;
        }
      }

      setSubmitting(true);
      const success = await onSubmit({
        name: name.trim(),
        templateId,
        mailingListId,
        sendImmediately,
        sendAt: sendImmediately ? null : sendAt,
        sendAtTz: sendImmediately ? null : sendAtTz,
      });
      if (success) {
        if (mode === "create") {
          setName("");
          setTemplateId(templates[0]?.id || "");
          setMailingListId(mailingLists[0]?.id || "");
          setSendImmediately(false);
          setSendAt(null);
          setSendAtTz(fallbackTz);
        }
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
        <Typography.H1 className="mb-2">
          {mode === "edit" ? "Edit Campaign" : "New Campaign"}
        </Typography.H1>
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
      <Checkbox
        label="Send immediately"
        value={sendImmediately}
        onChange={(checked) => setSendImmediately(checked)}
        className="mb-3"
      />
      {!sendImmediately && (
        <TzDateTime
          value={sendAt}
          onChange={([iso, tz]) => {
            setSendAt(iso);
            setSendAtTz(tz);
          }}
          label="Schedule send"
          required
          tz={sendAtTz || fallbackTz}
          defaultTime="09:00"
        />
      )}
      <Row justify="flex-end">
        <Button
          type="submit"
          variant="primary"
          disabled={submitDisabled}
          loading={submitting}
        >
          {mode === "edit" ? "Save changes" : "Create campaign"}
        </Button>
      </Row>
    </form>
  );
};

export const EventEmailCampaignsPage = () => {
  const { eventId } = useParams();
  const {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    sendCampaign,
    deleteCampaign,
  } = useCampaigns({
    eventId,
  });
  const { templates, loading: templatesLoading } = useEmailTemplates({
    eventId,
  });
  const { mailingLists, loading: mailingListsLoading } = useMailingLists({
    eventId,
  });
  const { event } = useEvent({ eventId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 420, zIndex: 1051 },
  });
  const { confirm: confirmDeleteCampaign, ConfirmModal: DeleteConfirmModal } =
    useConfirm({
      title: "Delete scheduled campaign?",
      text: "This action cannot be undone.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
  const { confirm: confirmImmediateSend, ConfirmModal: ImmediateConfirmModal } =
    useConfirm({
      title: "Warning!",
      text: "You are about to email people immediately. Are you sure?",
      confirmText: "Send now",
      confirmVariant: "danger",
    });
  const [sendNowId, setSendNowId] = useState(null);

  const activeTemplates = useMemo(
    () => (templates || []).filter((template) => !template.deleted),
    [templates]
  );

  const activeMailingLists = useMemo(
    () => (mailingLists || []).filter((list) => !list.deleted),
    [mailingLists]
  );

  const resolveMailingListAudience = (mailingListId) => {
    if (!mailingListId) return { count: 0 };
    const list = (mailingLists || []).find(
      (entry) => entry.id === mailingListId
    );
    return {
      count: list?.memberCount ?? 0,
      title: list?.title ?? "",
    };
  };

  const openCampaignForm = (campaign = null) => {
    offcanvas({
      title: campaign ? "Edit Campaign" : "New Campaign",
      content: (
        <CreateCampaignForm
          templates={activeTemplates}
          mailingLists={activeMailingLists}
          defaultTz={event?.defaultTz}
          initialCampaign={campaign}
          mode={campaign ? "edit" : "create"}
          confirmImmediateSend={confirmImmediateSend}
          resolveMailingListAudience={resolveMailingListAudience}
          onSubmit={async (payload) => {
            const result = campaign
              ? await updateCampaign(campaign.id, payload)
              : await createCampaign(payload);
            return Boolean(result?.id);
          }}
          onClose={close}
        />
      ),
    });
  };

  const openCreateCampaign = () => openCampaignForm();

  const canModifyCampaign = (campaign) => {
    return (
      !campaign.sendImmediately &&
      campaign.sendAt &&
      moment(campaign.sendAt).isAfter(moment())
    );
  };

  const handleEdit = (campaign) => {
    if (!canModifyCampaign(campaign)) return;
    openCampaignForm(campaign);
  };

  const handleDelete = async (campaign) => {
    if (!canModifyCampaign(campaign)) return;
    if (!(await confirmDeleteCampaign())) return;
    await deleteCampaign(campaign.id);
  };

  const handleSendNow = async (campaign) => {
    if (!canModifyCampaign(campaign)) return;
    const audience = resolveMailingListAudience(campaign.mailingListId);
    const count = audience?.count ?? 0;
    const label = count === 1 ? "person" : "people";
    const proceed = await confirmImmediateSend({
      title: "Warning!",
      text: `You are about to email ${count} ${label}. Are you sure?`,
      confirmText: "Send now",
      confirmVariant: "danger",
    });
    if (!proceed) return;
    setSendNowId(campaign.id);
    try {
      await sendCampaign(campaign.id);
    } finally {
      setSendNowId(null);
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
      {DeleteConfirmModal}
      {ImmediateConfirmModal}
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
                render: (value, row) => (
                  <Link to={`/events/${eventId}/email/campaigns/${row.id}`}>
                    {value}
                  </Link>
                ),
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
                label: "Recipients",
                accessor: "recipientCount",
                render: (_, row) => (
                  <CampaignRecipientCountCell
                    eventId={eventId}
                    campaign={row}
                  />
                ),
              },
              {
                label: "Send at",
                accessor: "sendAt",
                render: (value, row) => {
                  const target = value || row.createdAt;
                  return target ? moment(target).format(DATETIME_FORMAT) : "—";
                },
              },
              {
                label: "Actions",
                accessor: "id",
                render: (value, row) => {
                  if (!canModifyCampaign(row)) {
                    return (
                      <CampaignStatsCell eventId={eventId} campaign={row} />
                    );
                  }
                  return (
                    <Row gap={1}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSendNow(row)}
                        loading={sendNowId === row.id}
                      >
                        Send now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(row)}
                      >
                        Delete
                      </Button>
                    </Row>
                  );
                },
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
