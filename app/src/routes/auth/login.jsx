import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks";
import { Button, Card, Typography, Input, Alert } from "tabler-react-2";
import { Page } from "../../../components/page/Page";
import styled from "styled-components";
import { Grow, Row } from "../../../util/Flex";
import { Spacer } from "../../../util/Spacer";
import { useSearchParam } from "react-use";

const { H1, Text } = Typography;

export const Login = () => {
  const { login, mutationLoading, error, meta, resendVerificationEmail } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const from = useSearchParam("from");

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <Page title="Log in">
      <LoginCard>
        <Typography.H1>Log in to your account</Typography.H1>
        <Text>
          Welcome back! Please enter your email and password to log in.
        </Text>
        <Typography.Link href="/register">
          Don't have an account? Register here.
        </Typography.Link>
        <Spacer size={2} />
        {error && (
          <>
            <Alert variant="danger" title={"Error"}>
              {error}
              {error ===
                "Your email is not verified. Please check your email for a verification link." && (
                <>
                  <Spacer size={2} />
                  <Button onClick={() => resendVerificationEmail({ email })}>
                    Resend verification email
                  </Button>
                </>
              )}
            </Alert>
          </>
        )}
        {from === "forgot-password" && (
          <Alert variant="info" title={"Password reset"}>
            Your password has been reset. Please log in with your new password.
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            placeholder="Email"
            name="email"
            onInput={setEmail}
            value={email}
          />
          <Input
            label="Password"
            placeholder="Password"
            type="password"
            name="password"
            onInput={setPassword}
            value={password}
          />
          <Row justify="none" gap={2}>
            <Grow />
            <Typography.Link href="/forgot-password">
              Forgot password?
            </Typography.Link>
            <Button type="submit" loading={mutationLoading}>
              Log in
            </Button>
          </Row>
        </form>
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
