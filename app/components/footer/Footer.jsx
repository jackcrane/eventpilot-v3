import { Col, Row } from "../../util/Flex";
import logotype from "../../assets/logotype.png";

export const Footer = () => {
  return (
    <footer class="footer">
      <div class="container">
        <Row align="flex-start">
          <Col align="flex-start">
            <img src={logotype} alt="EventPilot Logo" style={{ width: 100 }} />
          </Col>
        </Row>
      </div>
    </footer>
  );
};
