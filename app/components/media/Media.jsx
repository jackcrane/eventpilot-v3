import styled from "styled-components";

export const HideWhenSmaller = styled.div`
  @media (max-width: ${(props) => props.w}px) {
    display: none;
  }
`;

export const ShowWhenSmaller = styled.div`
  @media (min-width: ${(props) => props.w}px) {
    display: none;
  }
`;
