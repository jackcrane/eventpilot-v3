/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#206bc4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

const tablerGray = {
  100: "#f8f9fa",
  200: "#f1f3f5",
  300: "#e9ecef",
  400: "#dee2e6",
  500: "#ced4da",
  600: "#adb5bd",
  700: "#868e96",
  800: "#495057",
  900: "#212529",
};

export const DayOfColors = {
  common: {
    black: "#000000",
    white: "#ffffff",
    shadow: "#00000020",
    surfaceOverlay: "rgba(255,255,255,0.96)",
  },
  light: {
    bodyBg: tablerGray[100],
    text: tablerGray[900],
    secondary: tablerGray[700],
    tertiary: tablerGray[600],
    gray: tablerGray,
    primary: "#206bc4",
    primaryLt: "#8cbaff",
    danger: "#d63939",
    dangerLt: "#ffa8a8",
    success: "#2fb344",
    successLt: "#8ce99a",
    warning: "#f59f00",
    warningLt: "#ffe066",
    border: tablerGray[400],
  },
  dark: {
    bodyBg: "#141517",
    text: tablerGray[100],
    secondary: tablerGray[500],
    tertiary: tablerGray[400],
    gray: tablerGray,
    primary: "#4dabf7",
    primaryLt: "#a5d8ff",
    danger: "#f03e3e",
    dangerLt: "#ffa8a8",
    success: "#40c057",
    successLt: "#8ce99a",
    warning: "#f59f00",
    warningLt: "#ffe066",
    border: "#2c2e33",
  },
};

export const getDayOfColors = (scheme = "light") => ({
  ...DayOfColors.common,
  ...(DayOfColors[scheme] ?? DayOfColors.light),
});

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
