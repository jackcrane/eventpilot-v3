import styled from "styled-components";

export const Grow = styled.div`
  flex-grow: 1;
`;

const computeGap = (gap) => (typeof gap === "number" ? `${gap * 8}px` : "0px");

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: ${(props) => props.align || "center"};
  justify-content: ${(props) => props.justify || "flex-start"};
  gap: ${(props) => computeGap(props.gap)};
  flex-wrap: ${(props) => (props.wrap ? "wrap" : "nowrap")};
`;

export const Col = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${(props) => props.align || "center"};
  justify-content: ${(props) => props.justify || "center"};
  gap: ${(props) => computeGap(props.gap)};
`;
