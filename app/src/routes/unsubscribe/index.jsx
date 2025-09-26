import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  Typography,
  Spinner,
  Button,
  Checkbox,
  Alert,
  EnclosedSelectGroup,
} from "tabler-react-2";
import { useUnsubscribe } from "../../../hooks/useUnsubscribe";
import { Row } from "../../../util/Flex";

const { H2, H4, Text } = Typography;

const sortMailingLists = (lists, defaultId) => {
  if (!Array.isArray(lists)) return [];
  return [...lists].sort((a, b) => {
    if (a.id === defaultId) return -1;
    if (b.id === defaultId) return 1;
    return a.title.localeCompare(b.title);
  });
};

export const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const personId = searchParams.get("p") || "";
  const emailId = searchParams.get("e") || "";

  const {
    details,
    lastResponse,
    loading,
    error,
    mutationLoading,
    updatePreferences,
  } = useUnsubscribe({ personId, emailId });

  const [selectedIds, setSelectedIds] = useState([]);
  const [unsubscribeAll, setUnsubscribeAll] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const previousSelectionRef = useRef(null);

  const mailingLists = useMemo(() => {
    const entries = Array.isArray(details?.mailingLists)
      ? details.mailingLists.filter((list) => list.status === "ACTIVE")
      : [];
    return sortMailingLists(entries, details?.defaultMailingListId);
  }, [details]);

  const selectItems = useMemo(
    () =>
      mailingLists.map((list) => ({
        value: list.id,
        label: <Typography.H4 className="mb-0">{list.title}</Typography.H4>,
      })),
    [mailingLists]
  );

  const selectedItems = useMemo(() => {
    if (!selectedIds.length || !selectItems.length) return [];
    const byId = new Map(selectItems.map((item) => [item.value, item]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean);
  }, [selectedIds, selectItems]);

  useEffect(() => {
    if (!details || hasEdited) return;

    const nextSelection = new Set();

    const defaultId = details.defaultMailingListId;
    if (defaultId && selectItems.some((item) => item.value === defaultId)) {
      nextSelection.add(details.defaultMailingListId);
    }

    setSelectedIds(Array.from(nextSelection));
    previousSelectionRef.current = null;
    if (selectItems.length) {
      setUnsubscribeAll(nextSelection.size === selectItems.length);
    } else {
      setUnsubscribeAll(false);
    }

    if (Array.isArray(lastResponse?.unsubscribe?.mailingLists)) {
      const latestIds = lastResponse.unsubscribe.mailingLists
        .filter((list) => list.status === "ACTIVE")
        .map((list) => list.id);
      if (latestIds.length === 0) {
        setSubmissionSuccess(true);
      }
    }
  }, [details, selectItems, hasEdited, lastResponse]);

  const invalidLink = !personId || !emailId;

  const handleUnsubscribeAllChange = (checked) => {
    setHasEdited(true);
    const nextValue = Boolean(checked);
    setUnsubscribeAll(nextValue);

    if (nextValue) {
      previousSelectionRef.current = [...selectedIds];
      setSelectedIds(selectItems.map((item) => item.value));
    } else {
      const fallback = previousSelectionRef.current;
      setSelectedIds(Array.isArray(fallback) ? [...fallback] : []);
      previousSelectionRef.current = null;
    }
  };

  const handleMailingListChange = (values) => {
    setHasEdited(true);
    const nextValues = Array.isArray(values)
      ? Array.from(new Set(values.map((item) => item?.value).filter(Boolean)))
      : [];
    setSelectedIds(nextValues);
    if (selectItems.length === 0) {
      setUnsubscribeAll(false);
      return;
    }
    const isAllSelected = nextValues.length === selectItems.length;
    setUnsubscribeAll(isAllSelected);
    if (!isAllSelected) {
      previousSelectionRef.current = [...nextValues];
    } else {
      previousSelectionRef.current = null;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!details) return;

    const payload = {
      mailingListIds: selectedIds,
      unsubscribeAll,
    };

    const ok = await updatePreferences(payload);
    if (ok) {
      setHasEdited(false);
      setSubmissionSuccess(true);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "var(--tblr-body-bg)",
      }}
    >
      <Card style={{ maxWidth: 520, width: "100%" }}>
        <H2 className="mb-2">Manage your email preferences</H2>
        <Text className="text-muted mb-3">
          Choose which updates you'd like to stop receiving from this event.
        </Text>

        {invalidLink && (
          <Alert variant="danger" title="Invalid link">
            This unsubscribe link is missing required information. Please use
            the link provided in your email.
          </Alert>
        )}

        {error && !loading && !invalidLink ? (
          <Alert variant="danger" title="Something went wrong">
            {error?.message || "We couldn't load your preferences."}
          </Alert>
        ) : null}

        {loading && !invalidLink ? (
          <Row justify="center" className="py-4">
            <Spinner />
          </Row>
        ) : null}

        {!loading && details && !invalidLink ? (
          submissionSuccess ? (
            <div className="text-center">
              <Typography.H3 className="mb-2">You're all set!</Typography.H3>
              <Text className="text-muted">
                Your email preferences have been updated. We are sad to see you
                go. If you wish to rejoin, please reach out to the event.
              </Text>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <H4 className="mb-2">
                  Pick which mailing lists you'd like to stop receiving from
                </H4>
                {selectItems.length === 0 ? (
                  <Text className="text-muted">
                    You're not currently on any mailing lists for this event.
                  </Text>
                ) : (
                  <EnclosedSelectGroup
                    multiple
                    direction="column"
                    items={selectItems}
                    value={selectedItems}
                    onChange={handleMailingListChange}
                  />
                )}
              </div>

              <H4 className="mb-2">
                Or, unsubscribe from all emails from this event
              </H4>

              <div className="mb-4">
                <Checkbox
                  label={
                    <span>
                      <Text className="mb-1">
                        Unsubscribe me from all {details.event?.name || "event"}{" "}
                        emails
                      </Text>
                      <Text className="text-muted" style={{ fontSize: 12 }}>
                        This will remove you from every mailing list associated
                        with this event.
                      </Text>
                    </span>
                  }
                  value={unsubscribeAll}
                  onChange={handleUnsubscribeAllChange}
                />
              </div>

              <Button
                type="submit"
                loading={mutationLoading}
                disabled={invalidLink || submissionSuccess}
              >
                Save preferences
              </Button>
            </form>
          )
        ) : null}
      </Card>
    </div>
  );
};

export default UnsubscribePage;
