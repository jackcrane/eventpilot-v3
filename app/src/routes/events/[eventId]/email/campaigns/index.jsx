import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Table, Button, Typography, Input } from "tabler-react-2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { useCampaigns } from "../../../../../../hooks/useCampaigns";
import { useEmailTemplates } from "../../../../../../hooks/useEmailTemplates";
import { useMailingLists } from "../../../../../../hooks/useMailingLists";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../../../../util/Constants";

export const EventEmailCampaignsPage = () => {
  const { eventId } = useParams();
  const {
    campaigns,
    loading,
    error,
    createCampaign,
    sendCampaign,
  } = useCampaigns({ eventId });
  const { templates, loading: templatesLoading } = useEmailTemplates({ eventId });
  const { mailingLists, loading: mailingListsLoading } = useMailingLists({ eventId });

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [mailingListId, setMailingListId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const activeTemplates = useMemo(
    () => (templates || []).filter((template) => !template.deleted),
    [templates]
  );

  const activeMailingLists = useMemo(
    () => (mailingLists || []).filter((list) => !list.deleted),
    [mailingLists]
  );

  useEffect(() => {
    if (!activeTemplates.length) {
      setTemplateId("");
      return;
    }
    const hasSelection = activeTemplates.some(
      (template) => template.id === templateId
    );
    if (!templateId || !hasSelection) {
      setTemplateId(activeTemplates[0].id);
    }
  }, [templateId, activeTemplates]);

  useEffect(() => {
    if (!activeMailingLists.length) {
      setMailingListId("");
      return;
    }
    const hasSelection = activeMailingLists.some(
      (list) => list.id === mailingListId
    );
    if (!mailingListId || !hasSelection) {
      setMailingListId(activeMailingLists[0].id);
    }
  }, [mailingListId, activeMailingLists]);

  const formReady = Boolean(
    name.trim() && templateId && mailingListId && !submitting
  );

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!formReady) return;

    try {
      setSubmitting(true);
      const created = await createCampaign({
        name: name.trim(),
        templateId,
        mailingListId,
      });
      if (created?.id) {
        setName("");
      }
    } finally {
      setSubmitting(false);
    }
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

  return (
    <EventPage
      title="Email Campaigns"
      loading={loading || templatesLoading || mailingListsLoading}
      description="Create and launch simple email blasts using your templates and mailing lists."
    >
      <div className="card mb-3">
        <div className="card-body">
          <form onSubmit={handleCreate} style={{ display: "grid", gap: 16 }}>
            <div>
              <Typography.H5 className="mb-0 text-secondary">CREATE</Typography.H5>
              <Typography.H2 className="mb-2">New campaign</Typography.H2>
              <Typography.Text className="text-muted">
                Name your campaign, choose a template, and target a mailing list.
              </Typography.Text>
            </div>
            <Input
              label="Campaign name"
              placeholder="My spring announcement"
              value={name}
              onChange={(value) => setName(value)}
              required
            />
            <label className="form-label" htmlFor="campaign-template">
              Template
              <select
                id="campaign-template"
                className="form-select"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                required
              >
                {activeTemplates.length === 0 && (
                  <option value="" disabled>
                    No templates available
                  </option>
                )}
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label" htmlFor="campaign-mailing-list">
              Mailing list
              <select
                id="campaign-mailing-list"
                className="form-select"
                value={mailingListId}
                onChange={(event) => setMailingListId(event.target.value)}
                required
              >
                {activeMailingLists.length === 0 && (
                  <option value="" disabled>
                    No mailing lists available
                  </option>
                )}
                {activeMailingLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </label>
            <Row justify="flex-end">
              <Button
                type="submit"
                variant="primary"
                disabled={!formReady}
                loading={submitting}
              >
                Create campaign
              </Button>
            </Row>
          </form>
        </div>
      </div>
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
                render: (value) => value?.name || "-",
              },
              {
                label: "Mailing list",
                accessor: "mailingList",
                render: (value) => value?.title || "-",
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
