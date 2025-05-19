import styled from "styled-components";
import { Icon } from "../../util/Icon";

const BrowserContainer = styled.div`
  border: 1px solid #ccc;
  border-radius: 5px;
  overflow: hidden;
`;

const BrowserHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 10px;
  border-bottom: 1px solid #ccc;
  background-color: #f5f5f5;
`;

const BrowserButton = styled.div`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background-color: ${(props) => props.bg};
`;

const BrowserButtons = styled.div`
  display: flex;
  gap: 5px;
`;

const UrlBar = styled.div`
  padding: 1px 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  gap: 5px;
  background-color: hsl(0, 0%, 93%);
  font-family: monospace;
  font-size: 10px;
`;

export const Browser = ({ children }) => {
  return (
    <BrowserContainer>
      <BrowserHeader>
        <BrowserButtons>
          <BrowserButton bg="#FF605C" />
          <BrowserButton bg="#FFBD44" />
          <BrowserButton bg="#00CA4E" />
        </BrowserButtons>
        <UrlBar>
          <Icon i="lock" />
          geteventpilot.com
        </UrlBar>
        <div style={{ width: 49 }} />
      </BrowserHeader>
      {children}
    </BrowserContainer>
  );
};
