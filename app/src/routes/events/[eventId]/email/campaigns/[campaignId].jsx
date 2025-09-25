import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Typography,
  Button,
  Spinner,
  useOffcanvas,
  Input,
  DropdownInput,
} from "tabler-react-2";
import { TableV2 } from "tabler-react-2/dist/table-v2";
import { Badge } from "tabler-react-2/dist/badge";
import moment from "moment";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Empty } from "../../../../../../components/empty/Empty";
import { EmailPreview } from "../../../../../../components/emailPreview/emailPreview";
import { useCampaign } from "../../../../../../hooks/useCampaign";
import { useCampaignRecipients } from "../../../../../../hooks/useCampaignRecipients";
import { useCampaignStats } from "../../../../../../hooks/useCampaignStats";
import { DATETIME_FORMAT } from "../../../../../../util/Constants";
import { Row } from "../../../../../../util/Flex";
import { Icon } from "../../../../../../util/Icon";

const STATUS_COLORS = {
  SENT: "blue",
  DELIVERED: "teal",
  OPENED: "success",
  BOUNCED: "danger",
};

const STATUS_OPTIONS = [
  { id: "ALL", label: "All statuses" },
  { id: "SENT", label: "Sent" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "OPENED", label: "Opened" },
  { id: "BOUNCED", label: "Bounced" },
];

const createDefaultSorting = () => [{ id: "recipientName", desc: false }];

const formatRecipientEmail = (recipient) => {
  if (recipient?.crmPersonEmail?.email) return recipient.crmPersonEmail.email;
  const raw = recipient?.to;
  if (typeof raw !== "string" || !raw.trim()) return "Unknown";
  const match = raw.match(/<([^>]+)>/);
  if (match?.[1]) return match[1];
  return raw;
};

const formatRecipientName = (recipient) => {
  if (recipient?.crmPerson?.name) return recipient.crmPerson.name;
  const raw = recipient?.to;
  if (typeof raw !== "string" || !raw.trim()) return "—";
  const match = raw.match(/^(.*?)\s*<[^>]+>/);
  if (match?.[1]) return match[1].trim() || "—";
  if (raw.includes("@")) {
    return raw.split("@")[0];
  }
  return raw;
};

export const EventEmailCampaignDetailPage = () => {
  const { eventId, campaignId } = useParams();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [sorting, setSorting] = useState(() => createDefaultSorting());
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const sortState = sorting?.[0] ?? null;
  const sortBy = sortState?.id || "recipientName";
  const sortDirection = sortState ? (sortState.desc ? "desc" : "asc") : "asc";
  const normalizedStatus = statusFilter === "ALL" ? null : statusFilter;

  const { campaign, loading: campaignLoading } = useCampaign({
    eventId,
    campaignId,
  });

  const {
    recipients,
    meta,
    loading: recipientsLoading,
    error: recipientsError,
    resendEmail,
    resendingEmailId,
    mutationLoading: resending,
  } = useCampaignRecipients({
    eventId,
    campaignId,
    page,
    size,
    sortBy,
    sortDirection,
    search: debouncedSearch,
    status: normalizedStatus,
  });

  useEffect(() => {
    if (meta?.page && meta.page !== page) {
      setPage(meta.page);
    }
  }, [meta?.page, page]);

  useEffect(() => {
    if (meta?.size && meta.size !== size) {
      setSize(meta.size);
    }
  }, [meta?.size, size]);

  const totalItems = meta?.totalItems ?? recipients.length;

  const { stats, loading: statsLoading } = useCampaignStats({
    eventId,
    campaignId,
  });

  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 460, zIndex: 1051 },
  });

  const openEmailPreview = useCallback(
    (emailId) => {
      if (!emailId) return;
      offcanvas({
        title: "Email Preview",
        content: <EmailPreview emailId={emailId} />,
      });
    },
    [offcanvas]
  );

  const columns = useMemo(
    () => [
      {
        id: "recipientName",
        header: () => "Name",
        accessorFn: (row) => formatRecipientName(row) || "",
        enableSorting: true,
        size: 220,
        cell: ({ row }) => {
          const recipient = row.original;
          const person = recipient?.crmPerson;
          const displayName = formatRecipientName(recipient);

          if (person?.id) {
            return (
              <Typography.Text className="mb-0">
                <Link to={`/events/${eventId}/crm/${person.id}`}>
                  {displayName}
                </Link>
              </Typography.Text>
            );
          }

          return (
            <Typography.Text className="mb-0">
              {displayName || "Unknown recipient"}
            </Typography.Text>
          );
        },
      },
      {
        id: "recipientEmail",
        header: () => "Email",
        accessorFn: (row) => formatRecipientEmail(row) || "",
        enableSorting: true,
        size: 260,
        cell: ({ row }) => (
          <Typography.Text className="mb-0">
            {formatRecipientEmail(row.original)}
          </Typography.Text>
        ),
      },
      {
        id: "status",
        header: () => "Status",
        accessorKey: "status",
        enableSorting: true,
        size: 140,
        cell: ({ getValue }) => {
          const value = getValue();
          const color = STATUS_COLORS[value] || "gray";
          const label =
            typeof value === "string" && value.length
              ? `${value.charAt(0)}${value.slice(1).toLowerCase()}`
              : "Unknown";
          return (
            <Badge soft color={color}>
              {label}
            </Badge>
          );
        },
      },
      {
        id: "createdAt",
        header: () => "Sent",
        accessorKey: "createdAt",
        enableSorting: true,
        size: 180,
        cell: ({ getValue }) => {
          const value = getValue();
          return value ? moment(value).format(DATETIME_FORMAT) : "—";
        },
      },
      {
        id: "actions",
        header: () => "",
        enableSorting: false,
        size: 220,
        cell: ({ row }) => {
          const email = row.original;
          const emailId = email?.id;
          const isResending = resendingEmailId === emailId;

          return (
            <Row gap={1} wrap={false} align="center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEmailPreview(emailId)}
              >
                View email
              </Button>
              <Button
                size="sm"
                loading={isResending}
                disabled={resending && !isResending}
                onClick={() => emailId && resendEmail(emailId)}
              >
                Resend
              </Button>
            </Row>
          );
        },
      },
    ],
    [eventId, openEmailPreview, resendEmail, resendingEmailId, resending]
  );

  const statusSummary = useMemo(() => {
    if (!stats || !stats.total) return null;
    return [
      {
        label: "Delivered",
        value: `${stats.deliveredCount}/${stats.total}`,
        percent: stats.deliveredPercent,
      },
      {
        label: "Opened",
        value: `${stats.openedCount}/${stats.total}`,
        percent: stats.openedPercent,
      },
      {
        label: "Bounced",
        value: `${stats.bouncedCount}/${stats.total}`,
        percent: stats.bouncedPercent,
      },
    ];
  }, [stats]);

  const handleSortingChange = useCallback((updater) => {
    setPage(1);
    setSorting((current) => {
      const resolved =
        typeof updater === "function" ? updater(current) : updater;
      if (!resolved || resolved.length === 0) {
        return createDefaultSorting();
      }
      return resolved;
    });
  }, []);

  const statusItems = useMemo(
    () =>
      STATUS_OPTIONS.map((option) => ({
        id: option.id,
        value: option.id,
        label: option.label,
      })),
    []
  );

  return (
    <EventPage
      title={campaign?.name || "Campaign details"}
      description="Review every email sent as part of this campaign."
      loading={campaignLoading}
    >
      {OffcanvasElement}

      {!campaignLoading && !campaign ? (
        <Empty
          gradient={false}
          title="Campaign not found"
          text="This campaign could not be located. It may have been deleted."
        />
      ) : (
        <>
          <Row
            justify="space-between"
            align="center"
            style={{ marginBottom: 16 }}
          >
            <div>
              <Button
                href={`/events/${eventId}/email/campaigns`}
                size="sm"
                className="mb-2"
              >
                <Icon i="arrow-left" size={14} />
                Back to campaigns
              </Button>
              <Typography.H2>
                {campaign?.mailingList?.title || "—"}
              </Typography.H2>
              <Typography.Text className="text-muted mb-0">
                Mailing list:{" "}
                <Link
                  to={`/events/${eventId}/email/lists/${campaign?.mailingList?.id}`}
                >
                  {campaign?.mailingList?.title || "—"}
                </Link>
              </Typography.Text>
              <Typography.Text className="text-muted">
                Template:{" "}
                <Link
                  to={`/events/${eventId}/email/templates/${campaign?.template?.id}`}
                >
                  {campaign?.template?.name || "—"}
                </Link>
              </Typography.Text>
            </div>
            <div>
              {statsLoading ? (
                <Spinner size="sm" />
              ) : statusSummary ? (
                <Row gap={1} align="center">
                  {statusSummary.map(({ label, value, percent }) => (
                    <div key={label} style={{ textAlign: "right" }}>
                      <Typography.H5 className="mb-0 text-secondary">
                        {label.toUpperCase()}
                      </Typography.H5>
                      <Typography.Text className="mb-0">
                        {value}{" "}
                        <span className="text-muted" style={{ fontSize: 10 }}>
                          ({percent}%)
                        </span>
                      </Typography.Text>
                    </div>
                  ))}
                </Row>
              ) : null}
            </div>
          </Row>

          <Row gap={1} wrap style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Search recipients"
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(value) => {
                  setSearchInput(value);
                  setPage(1);
                }}
                className="mb-0"
              />
            </div>
            <div>
              <DropdownInput
                label="Status"
                prompt="Select a status"
                items={statusItems}
                value={statusFilter}
                showSearch={false}
                onChange={(item) => {
                  const next = item?.id ?? "ALL";
                  setStatusFilter(next);
                  setPage(1);
                }}
              />
            </div>
          </Row>

          {recipientsError ? (
            <Typography.Text className="text-danger">
              {recipientsError.message ||
                "Failed to load recipients. Please try again."}
            </Typography.Text>
          ) : null}

          <TableV2
            parentClassName="card"
            columns={columns}
            data={recipients}
            totalRows={totalItems}
            page={page}
            size={size}
            onPageChange={(nextPage) => setPage(nextPage)}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            getRowId={(row) => row.id}
            loading={recipientsLoading}
            emptyState={() => (
              <div className="py-4 text-center text-muted">
                {debouncedSearch || normalizedStatus
                  ? "No messages match your filters."
                  : "No emails recorded for this campaign yet."}
              </div>
            )}
          />
        </>
      )}
    </EventPage>
  );
};

export default EventEmailCampaignDetailPage;
