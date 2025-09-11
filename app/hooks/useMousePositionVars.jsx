import { useEffect } from "react";

export const useMousePositionVars = () => {
  useEffect(() => {
    const setVars = (x, y, w, h) => {
      document.documentElement.style.setProperty("--mouse-pos-x", `${x}px`);
      document.documentElement.style.setProperty("--mouse-pos-y", `${y}px`);
      document.documentElement.style.setProperty("--screen-width", `${w}px`);
      document.documentElement.style.setProperty("--screen-height", `${h}px`);

      // relative to center
      const xCtr = x - w / 2;
      const yCtr = y - h / 2;
      document.documentElement.style.setProperty(
        "--mouse-pos-x-ctr",
        `${xCtr}px`
      );
      document.documentElement.style.setProperty(
        "--mouse-pos-y-ctr",
        `${yCtr}px`
      );
    };

    const handleMouseMove = (e) => {
      setVars(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    };

    const handleResize = () => {
      setVars(
        window.innerWidth / 2,
        window.innerHeight / 2,
        window.innerWidth,
        window.innerHeight
      );
    };

    // Init with screen center
    handleResize();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
};
