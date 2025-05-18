import React from "react";

export const Icon = ({
  i,
  size = "inherit",
  color,
  secondaryIcon,
  secondarySize,
  secondaryColor,
  ...props
}) => (
  <div style={{ position: "relative", display: "inline-block" }} {...props}>
    <i
      style={{
        fontSize: size,
        color: color,
      }}
      className={`ti ti-${i}`}
    ></i>
    {secondaryIcon && (
      <i
        className={`ti ti-${secondaryIcon}`}
        {...props}
        style={{
          position: "absolute",
          bottom: -3,
          right: -3,
          fontSize: secondarySize || size / 1.5,
          color: secondaryColor,
          ...props.style,
        }}
      ></i>
    )}
  </div>
);
