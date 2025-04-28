import { useState } from "react";
import { useAuth } from "../../../hooks";
import { Button, Card, Typography, Input, Alert } from "tabler-react-2";
import { Header } from "../../../components/header/Header";
import { Page } from "../../../components/page/Page";
import styled from "styled-components";
import { Grow, Row } from "../../../util/Flex";
import { Spacer } from "../../../util/Spacer";
const { H1, Text } = Typography;

export const Register = () => {
  const { register, mutationLoading, error, registered } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <Page title="Register">
      <LoginCard>
        <Typography.H1>Welcome to EventPilot!</Typography.H1>
        <Text>We are so excited to have you on board!</Text>
        <Typography.Link href="/login">
          Already have an account? Log in here.
        </Typography.Link>
        <Spacer size={2} />
        {error && (
          <>
            <Alert variant="danger" title={"Error"}>
              {error}
            </Alert>
          </>
        )}
        {registered ? (
          <>
            <Alert variant="success" title={"Success"}>
              You have successfully registered. Please check your email for a
              verification link to complete your account.
            </Alert>
          </>
        ) : (
          <>
            <Input
              label="Name"
              placeholder="Name"
              name="name"
              onInput={setName}
              value={name}
            />
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
              <Button
                loading={mutationLoading}
                onClick={() => register({ email, password, name })}
              >
                Register
              </Button>
            </Row>
          </>
        )}
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
