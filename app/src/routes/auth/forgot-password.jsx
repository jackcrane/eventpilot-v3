import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks";
import { Alert, Card, Typography, Input, Button } from "tabler-react-2";
import { Page } from "../../../components/page/Page";
import styled from "styled-components";
import { Grow, Row } from "../../../util/Flex";
import { Spacer } from "../../../util/Spacer";
import { useParams, useSearchParams } from "react-router-dom";
const { H1, Text } = Typography;

export const ForgotPassword = () => {
  const {
    mutationLoading,
    error,
    requestForgotPassword,
    forgotPasswordWaiting,
    confirmForgotPassword,
  } = useAuth();

  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(null);

  useEffect(() => {
    console.log("token", searchParams);
    const token = searchParams.get("forgottoken");
    if (token) setToken(token);
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (token) {
    return (
      <Page title="Forgot Password">
        <LoginCard>
          <>
            <Typography.H1>Forgot Password</Typography.H1>
            <Text>
              We are sorry to see you have forgotten your password. Please enter
              your email below to reset your password.
            </Text>
            <Input
              label="New Password"
              name="password"
              placeholder="Password"
              type="password"
              value={password}
              onInput={(e) => setPassword(e)}
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
            onInput={(e) => setEmail(e)}
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
