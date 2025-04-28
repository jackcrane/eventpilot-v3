import moment from "moment";
import { Timeline, Typography, Spinner, Button } from "tabler-react-2";
import { DATETIME_FORMAT } from "../../util/Constants";
import { Icon } from "../../util/Icon";
import { useLogs } from "../../hooks";
import React, { useState } from "react";
import { Row } from "../../util/Flex";
import Badge from "tabler-react-2/dist/badge";
const { Text, B } = Typography;

const IconUserCreated = ({ size = 18 }) => <Icon i={"user-plus"} size={size} />;
const IconUserLogin = ({ size = 18 }) => <Icon i={"login-2"} size={size} />;
const IconuserAccountUpdated = ({ size = 18 }) => (
  <Icon i={"user-edit"} size={size} />
);
const IconEmailVerified = ({ size = 18 }) => (
  <Icon i={"mail-check"} size={size} />
);
const IconPasswordReset = ({ size = 18 }) => <Icon i={"key"} size={size} />;
const IconPasswordResetRequest = ({ size = 18 }) => (
  <Icon i={"key"} size={size} />
);

const fallback = (str) => {
  // If boolean:
  if (typeof str === "boolean") {
    return str ? "Yes" : "No";
  }

  // If number:
  if (typeof str === "number") {
    return str.toString();
  }

  // If string:
  if (typeof str === "string") {
    return str;
  }

  // If null:
  if (str === null) {
    return <i>(none)</i>;
  }
};

String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};
String.prototype.camelToSpaces = function () {
  return this.replace(/([a-z])([A-Z])/g, "$1 $2");
};

const switchLogForDisplay = (log) => {
  switch (log.type) {
    case "USER_CREATED":
      return {
        title: "Account created",
        description: "Your account was created",
        content: log.ip,
        time: moment(log.createdAt).format(DATETIME_FORMAT),
        icon: IconUserCreated,
      };
    case "USER_LOGIN":
      return {
        title: "Logged in",
        time: moment(log.createdAt).format(DATETIME_FORMAT),
        icon: IconUserLogin,
        iconBgColor: "green",
        description: (
          <>
            <Text className="mb-0">
              Someone logged in to your account from {log.location.city},{" "}
              {log.location.regionName} ({log.ip})
            </Text>
          </>
        ),
      };
    case "USER_ACCOUNT_UPDATED":
      return {
        title: "Account updated",
        description: (
          <>
            <Text className="mb-0">
              Your account was updated. The following changes were made:
              <br />
              {Object.keys(log.data).map((key) => (
                <Row justify="flex-start" gap={0.5} key={key}>
                  <span>
                    <B>{key.capitalize().camelToSpaces()}</B>:
                  </span>
                  <Badge soft color="red">
                    {fallback(log.data[key][0])}
                  </Badge>
                  →{" "}
                  <Badge soft color="blue">
                    {fallback(log.data[key][1])}
                  </Badge>
                </Row>
              ))}
            </Text>
          </>
        ),
        time: moment(log.createdAt).format(DATETIME_FORMAT),
        icon: IconuserAccountUpdated,
        iconBgColor: "blue",
      };
    case "USER_EMAIL_PREFERENCES_UPDATED":
      return {
        title: "Email preferences updated",
        description: (
          <>
            <Text className="mb-0">
              Your email preferences were updated. The following changes were
              made:
              <br />
              {Object.keys(log.data).map((key) => (
                <Row justify="flex-start" gap={0.5} key={key}>
                  <span>
                    <B>{key.capitalize().camelToSpaces()}</B>:
                  </span>
                  <Badge soft color="red">
                    {fallback(log.data[key][0])}
                  </Badge>
                  →{" "}
                  <Badge soft color="blue">
                    {fallback(log.data[key][1])}
                  </Badge>
                </Row>
              ))}
            </Text>
          </>
        ),
        time: moment(log.createdAt).format(DATETIME_FORMAT),
        icon: IconuserAccountUpdated,
        iconBgColor: "blue",
      };
    case "EMAIL_VERIFIED":
      return {
        title: "Email verified",
        description: (
          <>
            <Text className="mb-0">
              An email was verified. You can now log in to your account.
            </Text>
          </>
        ),
        time: moment(log.createdAt).format(DATETIME_FORMAT),
        icon: IconEmailVerified,
        iconBgColor: "lime",
      };
    case "USER_PASSWORD_RESET":
      return {
        title: "Password reset",
        description: (
          <>
            <Text className="mb-0">
              Your password has been reset. You can now log in with your new
              password. If you did not update your password, change your
              password immediately and reach out to us.
            </Text>
          </>
        ),
        time: moment(log.createdAt).format(DATETIME_FORMAT),
        icon: IconPasswordReset,
        iconBgColor: "blue",
      };
    case "USER_PASSWORD_RESET_REQUEST":
      return {
        title: "Password reset requested",
        description: (
          <>
            <Text className="mb-0">
              A password reset request was sent to your email address. Please
              check your email for a link to reset your password.
            </Text>
          </>
        ),
        time: moment(log.createdAt).format(DATETIME_FORMAT),
        icon: IconPasswordResetRequest,
        iconBgColor: "blue",
      };
    default:
      return log.type;
  }
};

export const LogTimeline = ({ logTypes }) => {
  const [page, setPage] = useState(0);
  const { logs, loading, meta } = useLogs(logTypes, {
    take: 5,
    skip: page * 5,
  });

  const totalPages = Math.ceil(meta?.totalCount / 5 || 0);

  const handleNextPage = () => {
    if (page < totalPages - 1) setPage((prevPage) => prevPage + 1);
  };

  const handlePrevPage = () => {
    if (page > 0) setPage((prevPage) => prevPage - 1);
  };

  if (!logs?.length) return <Spinner size="sm" />;

  return (
    <>
      <Row justify="flex-end" gap={1} align="center">
        <Text className={"mb-0"}>
          Showing {page * 5 + 1}-
          {Math.min(page * 5 + logs.length, meta?.totalCount)} of{" "}
          {meta?.totalCount} logs
        </Text>
      </Row>
      <div
        style={{
          opacity: loading ? 0.5 : 1,
        }}
      >
        <Timeline dense events={logs.map((log) => switchLogForDisplay(log))} />
      </div>
      <Row justify="flex-end" gap={1} align="center">
        {loading && <Spinner size="sm" />}
        <Button onClick={handlePrevPage} disabled={page === 0 || loading}>
          Previous
        </Button>
        <Text className={"mb-0"}>
          Page {page + 1} of {totalPages}
        </Text>
        <Button
          onClick={handleNextPage}
          disabled={page === totalPages - 1 || loading}
        >
          Next
        </Button>
      </Row>
    </>
  );
};
