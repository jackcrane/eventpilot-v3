import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks";
import { Alert, Card, Typography, Spinner, Button } from "tabler-react-2";
import { Page } from "../../../components/page/Page";
import styled from "styled-components";
import { Grow, Row } from "../../../util/Flex";
import { Spacer } from "../../../util/Spacer";
import { useParams, useSearchParams } from "react-router-dom";
const { H1, Text } = Typography;

export const Verify = () => {
  const {
    login,
    mutationLoading,
    error,
    verifyEmail,
    meta,
    resendVerificationEmail,
  } = useAuth();

  const [searchParams] = useSearchParams();
  useEffect(() => {
    console.log("token", searchParams);
    const token = searchParams.get("verificationtoken");
    if (token) verifyEmail(token);
  }, [searchParams]);

  return (
    <Page title="Email Verification">
      <LoginCard>
        {!error ? (
          <>
            <Typography.H1>Thanks for verifying your email!</Typography.H1>
            <Text>
              We are checking your email with our records. Hold tight real
              quick!
            </Text>
            <Spinner size="sm" />
          </>
        ) : (
          <>
            <Typography.H1>Error</Typography.H1>
            <Alert variant="danger" title={"Error"}>
              {error}

              <Spacer size={2} />
              <Button
                onClick={() => resendVerificationEmail({ email: meta.email })}
              >
                Resend verification email
              </Button>
            </Alert>
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
