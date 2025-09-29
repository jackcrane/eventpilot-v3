import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks";
import { Alert, Card, Typography, Input, Button } from "tabler-react-2";
import { Page } from "../../../components/page/Page";
import styled from "styled-components";
import { Grow, Row } from "../../../util/Flex";
import { useSearchParams } from "react-router-dom";
import { useForgotPasswordToken } from "../../../hooks/useForgotPasswordToken";

const { Text } = Typography;

export const ForgotPassword = () => {
  const {
    mutationLoading,
    error,
    requestForgotPassword,
    forgotPasswordWaiting,
    confirmForgotPassword,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(null);

  useEffect(() => {
    const nextToken = searchParams.get("forgottoken");
    setToken(nextToken);
    setPassword("");
  }, [searchParams]);

  const {
    tokenValid,
    loading: tokenLoading,
    error: tokenError,
  } = useForgotPasswordToken(token);

  if (token) {
    if (tokenLoading) {
      return (
        <Page title="Forgot Password">
          <LoginCard>
            <>
              <Typography.H1>Forgot Password</Typography.H1>
              <Text>Validating your reset link...</Text>
            </>
          </LoginCard>
        </Page>
      );
    }

    if (!tokenValid) {
      return (
        <Page title="Forgot Password">
          <LoginCard>
            <>
              <Typography.H1>Forgot Password</Typography.H1>
              <Alert variant="danger" title="Reset link issue">
                {tokenError ||
                  "This reset link is no longer valid. Please request a new one."}
              </Alert>
              <Text>
                You can request a new password reset email below.
              </Text>
              <Row justify="none" gap={2}>
                <Grow />
                <Button
                  onClick={() => {
                    window.location.href = "/forgot-password";
                  }}
                >
                  Request New Link
                </Button>
              </Row>
            </>
          </LoginCard>
        </Page>
      );
    }

    return (
      <Page title="Forgot Password">
        <LoginCard>
          <>
            <Typography.H1>Forgot Password</Typography.H1>
            <Text>
              We are sorry to see you have forgotten your password. Please enter
              your email below to reset your password.
            </Text>
            {error && (
              <Alert variant="danger" title={"Error"}>
                {error}
              </Alert>
            )}
            <Input
              label="New Password"
              name="password"
              placeholder="Password"
              type="password"
              value={password}
              onInput={(value) => setPassword(value)}
            />
            <Row justify="none" gap={2}>
              <Grow />
              <Button
                loading={mutationLoading}
                onClick={() => confirmForgotPassword({ token, password })}
              >
                Submit
              </Button>
            </Row>
          </>
        </LoginCard>
      </Page>
    );
  }

  if (forgotPasswordWaiting) {
    return (
      <Page title="Forgot Password">
        <LoginCard>
          <>
            <Typography.H1>Forgot Password</Typography.H1>
            <Text>
              We are sorry to see you have forgotten your password. Please enter
              your email below to reset your password.
            </Text>
            <Text>
              We sent you an email with a link to reset your password. The link
              will be valid for 15 minutes.
            </Text>
          </>
        </LoginCard>
      </Page>
    );
  }

  return (
    <Page title="Forgot Password">
      <LoginCard>
        <>
          <Typography.H1>Forgot Password</Typography.H1>
          <Text>
            We are sorry to see you have forgotten your password. Please enter
            your email below to reset your password.
          </Text>
          {error && (
            <Alert variant="danger" title={"Error"}>
              {error}
            </Alert>
          )}
          <Input
            label="Email"
            name="email"
            placeholder="Email"
            value={email}
            onInput={(value) => setEmail(value)}
          />
          <Row justify="none" gap={2}>
            <Grow />
            <Button
              loading={mutationLoading}
              onClick={() => requestForgotPassword({ email })}
            >
              Submit
            </Button>
          </Row>
        </>
      </LoginCard>
    </Page>
  );
};

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  margin: auto;
  margin-top: 20px;
`;
