import React, { useEffect, useState } from "react";
import { useAuth, useEmailPreferences, useLogs } from "../../../hooks";
import {
  Spinner,
  Typography,
  Input,
  Switch,
  Button,
  Util,
  Alert,
} from "tabler-react-2";
import { Page } from "../../../components/page/Page";
import { Breadcrumbs } from "../../../components/breadcrumbs/Breadcrumbs";
import { LogTimeline } from "../../../components/logTimeline/LogTimeline";
import { Icon } from "../../../util/Icon";
import { Row } from "../../../util/Flex";
import { sidenavItems } from "../../../components/sidenav/Sidenav";
import { Dropzone } from "../../../components/dropzone/Dropzone";
import { Stripe, StripeTrigger } from "../../../components/stripe/Stripe";
import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
const { H1, H2, H3, Text } = Typography;

export const UserProfile = () => {
  const { user, loading, updateUser, mutationLoading } = useAuth();
  const {
    emailPreferences,
    updateEmailPreferences,
    mutationLoading: emailPreferencesMutationLoading,
    loading: emailPreferencesLoading,
  } = useEmailPreferences();
  const [dirtyUser, setDirtyUser] = useState(user);
  useEffect(() => {
    setDirtyUser(user);
  }, [user]);

  if (loading) return null;

  return (
    <Page title="User Profile" sidenavItems={sidenavItems("profile")}>
      <Breadcrumbs />
      <H1>User Profile</H1>
      <Input
        label="Name"
        name="name"
        value={dirtyUser.name}
        onInput={(e) => setDirtyUser({ ...dirtyUser, name: e })}
      />
      <Input
        label="Email"
        name="email"
        value={dirtyUser.email}
        className={"mb-0"}
        onInput={(e) => setDirtyUser({ ...dirtyUser, email: e })}
      />
      <Text className={"text-danger"}>
        <Icon i={"alert-triangle"} size={12} /> Changing your email address
        requires re-verification. You will not be able to do anything until you
        verify your new email.
      </Text>
      <Input
        label="Phone Number"
        value={dirtyUser.phoneNumber}
        onInput={(e) => setDirtyUser({ ...dirtyUser, phoneNumber: e })}
        type="tel"
        name="phoneNumber"
        placeholder="Phone number"
      />

      {JSON.stringify(dirtyUser) !== JSON.stringify(user) && (
        <Row justify="flex-end" gap={1}>
          <Button
            loading={mutationLoading}
            onClick={() => updateUser(dirtyUser)}
          >
            Save
          </Button>
        </Row>
      )}
      <Util.Hr />
      {/* Payments moved to event-level. */}
      <H2>Email Preferences</H2>
      <Text>
        We value your inbox, and we may send you important, time-sensitive
        emails, so please keep an eye on your inbox. In our goals to provide you
        with only the emails you want and need, please let us know what kind of
        emails you would like to receive.
      </Text>
      <H3>Login</H3>
      {emailPreferencesLoading ? (
        <Spinner size="sm" />
      ) : (
        <Switch
          disabled={emailPreferencesMutationLoading}
          value={emailPreferences?.login}
          onChange={(v) => updateEmailPreferences({ login: v })}
          label="Login notifications"
        />
      )}
      <Text>
        We will send you a login notification when you log in to your account.
        This email will be sent to your primary email address.
      </Text>
      <H2>Logs</H2>
      <Text>
        We keep track of the activity on your account. Here is some of the
        recent activity with your account. If something looks wrong, please
        contact us.
      </Text>
      <LogTimeline
        logTypes={[
          "USER_CREATED",
          "USER_LOGIN",
          "USER_ACCOUNT_UPDATED",
          "EMAIL_VERIFIED",
          "USER_EMAIL_PREFERENCES_UPDATED",
          "USER_PASSWORD_RESET",
          "USER_PASSWORD_RESET_REQUEST",
        ]}
      />
    </Page>
  );
};
