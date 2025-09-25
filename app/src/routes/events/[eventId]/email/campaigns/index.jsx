import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Typography,
  Input,
  DropdownInput,
  Checkbox,
  useOffcanvas,
  useConfirm,
  Spinner,
  Badge,
} from "tabler-react-2";
import { TableV2 } from "tabler-react-2/dist/table-v2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { CampaignFilterBar } from "../../../../../../components/campaigns/CampaignFilterBar";
import { useCampaigns } from "../../../../../../hooks/useCampaigns";
import { useEmailTemplates } from "../../../../../../hooks/useEmailTemplates";
import { useMailingLists } from "../../../../../../hooks/useMailingLists";
import { useEvent } from "../../../../../../hooks/useEvent";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../../../../util/Constants";
import { TzDateTime } from "../../../../../../components/tzDateTime/tzDateTime";
import { useCampaignStats } from "../../../../../../hooks/useCampaignStats";

const CAMPAIGN_STATUS_COLORS = {
  DRAFT: "gray",
  SCHEDULED: "blue",
  SENT: "green",
};

const resolveCampaignStatus = (campaign) => {
  const raw = typeof campaign?.status === "string" ? campaign.status : null;
  if (raw && raw.length) {
    return raw.toUpperCase();
  }
  if (campaign?.sendEffortStarted) {
    return "SENT";
  }
  if (campaign?.sendAt) {
    return "SCHEDULED";
  }
  return "DRAFT";
};

const formatStatusLabel = (value) => {
  if (typeof value !== "string" || !value.length) return "Unknown";
  return `${value.charAt(0)}${value.slice(1).toLowerCase()}`;
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const defaultSorting = useMemo(
    () => [
      {
        id: "createdAt",
        desc: true,
      },
    ],
    []
  );
  const [sorting, setSorting] = useState(defaultSorting);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState([]);

  const coerceFilterValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "boolean") return value;
    if (typeof value === "object" && "target" in value) {
      return value.target?.value ?? null;
    }
    return value;
  };

  const serializedFilters = useMemo(() => {
    if (!filters?.length) return [];
    return filters
      .map((filter) => {
        const label = filter?.field?.label;
        const operation = filter?.operation;
        if (!label || !operation) return null;
        return {
          label,
          operation,
          value: coerceFilterValue(filter?.value),
        };
      })
      .filter(Boolean);
  }, [filters]);

  const sortState = sorting?.[0] ?? defaultSorting[0];
  const sortBy = sortState?.id || "createdAt";
  const sortDirection = sortState?.desc ? "desc" : "asc";
  const normalizedSearch = search.trim();

  const {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    sendCampaign,
    deleteCampaign,
    page: resolvedPage,
    size: resolvedSize,
    total,
  } = useCampaigns({
    eventId,
    page,
    pageSize,
    sortBy,
    sortDirection,
    search: normalizedSearch,
    filters: serializedFilters,
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

  useEffect(() => {
    if (loading) return;
    if (Number.isFinite(resolvedPage) && resolvedPage !== page) {
      setPage(resolvedPage);
    }
  }, [resolvedPage, page, loading]);

  useEffect(() => {
    if (loading) return;
    if (Number.isFinite(resolvedSize) && resolvedSize !== pageSize) {
      setPageSize(resolvedSize);
    }
  }, [resolvedSize, pageSize, loading]);

  const filterFieldDefs = useMemo(
    () => [
      {
        label: "status",
        hrTitle: "Status",
        type: "enum",
        options: ["Draft", "Scheduled", "Sent"],
        defaultOperation: "eq",
      },
      {
        label: "name",
        hrTitle: "Name",
        type: "text",
        defaultOperation: "contains",
      },
      {
        label: "template",
        hrTitle: "Template",
        type: "text",
        defaultOperation: "contains",
      },
      {
        label: "mailingList",
        hrTitle: "Mailing List",
        type: "text",
        defaultOperation: "contains",
      },
      {
        label: "sendAt",
        hrTitle: "Send Date",
        type: "date",
        defaultOperation: "date-after",
      },
      {
        label: "createdAt",
        hrTitle: "Created Date",
        type: "date",
        defaultOperation: "date-after",
      },
    ],
    []
  );

  const hasAppliedFilters = useMemo(
    () => Boolean(normalizedSearch) || serializedFilters.length > 0,
    [normalizedSearch, serializedFilters]
  );

  const tableRows = useMemo(
    () =>
      Array.isArray(campaigns)
        ? campaigns.map((campaign) => ({
            ...campaign,
            status: resolveCampaignStatus(campaign),
          }))
        : [],
    [campaigns]
  );

  const handleSortingChange = useCallback(
    (updater) => {
      setPage(1);
      setSorting((current) => {
        const resolved =
          typeof updater === "function" ? updater(current) : updater;
        if (!resolved || resolved.length === 0) {
          return defaultSorting;
        }
        return resolved;
      });
    },
    [defaultSorting]
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

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: () => "Name",
        accessorKey: "name",
        enableSorting: true,
        size: 240,
        cell: ({ row }) => (
          <Link
            to={`/events/${eventId}/email/campaigns/${row.original.id}`}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "status",
        header: () => "Status",
        accessorKey: "status",
        enableSorting: true,
        size: 140,
        cell: ({ getValue }) => {
          const value = String(getValue() || "").toUpperCase();
          const label = formatStatusLabel(value);
          const color = CAMPAIGN_STATUS_COLORS[value] || "gray";
          return (
            <Badge soft color={color}>
              {label}
            </Badge>
          );
        },
      },
      {
        id: "template",
        header: () => "Template",
        accessorFn: (row) => row?.template?.name || "",
        enableSorting: false,
        size: 220,
        cell: ({ row }) => {
          const template = row.original.template;
          if (!template) {
            return (
              <Typography.Text className="mb-0 text-muted">—</Typography.Text>
            );
          }
          return (
            <Link to={`/events/${eventId}/email/templates/${template.id}`}>
              {template.name}
            </Link>
          );
        },
      },
      {
        id: "mailingList",
        header: () => "Mailing list",
        accessorFn: (row) => row?.mailingList?.title || "",
        enableSorting: false,
        size: 220,
        cell: ({ row }) => {
          const list = row.original.mailingList;
          if (!list) {
            return (
              <Typography.Text className="mb-0 text-muted">—</Typography.Text>
            );
          }
          return (
            <Link to={`/events/${eventId}/email/lists/${list.id}`}>
              {list.title}
            </Link>
          );
        },
      },
      {
        id: "recipientCount",
        header: () => "Recipients",
        accessorKey: "recipientCount",
        enableSorting: false,
        size: 120,
        cell: ({ row }) => (
          <CampaignRecipientCountCell
            eventId={eventId}
            campaign={row.original}
          />
        ),
      },
      {
        id: "sendAt",
        header: () => "Send at",
        accessorFn: (row) => row?.sendAt || row?.createdAt || "",
        enableSorting: true,
        size: 180,
        cell: ({ row }) => {
          const target = row.original.sendAt || row.original.createdAt;
          return target ? moment(target).format(DATETIME_FORMAT) : "—";
        },
      },
      {
        id: "actions",
        header: () => "Actions",
        enableSorting: false,
        size: 260,
        cell: ({ row }) => {
          const campaign = row.original;
          if (!canModifyCampaign(campaign)) {
            return <CampaignStatsCell eventId={eventId} campaign={campaign} />;
          }
          return (
            <Row gap={1}>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleSendNow(campaign)}
                loading={sendNowId === campaign.id}
              >
                Send now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(campaign)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDelete(campaign)}
              >
                Delete
              </Button>
            </Row>
          );
        },
      },
    ],
    [
      eventId,
      canModifyCampaign,
      handleDelete,
      handleEdit,
      handleSendNow,
      sendNowId,
    ]
  );

  const totalCampaigns = Number.isFinite(total)
    ? total
    : Array.isArray(campaigns)
    ? campaigns.length
    : 0;
  const isEmptyState =
    !loading && totalCampaigns === 0 && hasAppliedFilters === false;
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
        style={{ marginBottom: totalCampaigns ? 16 : 0 }}
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
      <Row className="mb-3" gap={1} wrap>
        <div style={{ flex: 1, minWidth: 280 }}>
          <CampaignFilterBar
            search={search}
            setSearch={(value) => {
              setPage(1);
              setSearch(value);
            }}
            filterFieldDefs={filterFieldDefs}
            onFiltersChange={(next) => {
              setPage(1);
              setFilters(next || []);
            }}
            placeholder="Search campaigns..."
          />
        </div>
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
        <TableV2
          parentClassName="card"
          columns={columns}
          data={tableRows}
          totalRows={totalCampaigns}
          page={page}
          size={pageSize}
          onPageChange={(nextPage) => setPage(nextPage)}
          onSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          getRowId={(row) => String(row.id)}
          loading={loading}
          stickyHeader
          emptyState={() => (
            <div className="py-4 text-center text-muted">
              {hasAppliedFilters
                ? "No campaigns match your filters."
                : "Create your first campaign and it will appear here."}
            </div>
          )}
        />
      )}
    </EventPage>
  );
};

export default EventEmailCampaignsPage;
