import styled from "styled-components";

export const Spacer = styled.div`
  height: ${({ size }) => size * 8 || 8}px;
  width: ${({ size }) => size * 8 || 8}px;
`;
