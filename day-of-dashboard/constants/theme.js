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
    primary: "#066ed0",
    primaryLt: "#e8f0fa",
    danger: "#d63938",
    dangerLt: "#fcebea",
    success: "#2fb344",
    successLt: "#ecf7ec",
    warning: "#f59f00",
    warningLt: "#fdf4ea",
    border: tablerGray[400],
  },
  dark: {
    bodyBg: "#141517",
    text: tablerGray[100],
    secondary: tablerGray[500],
    tertiary: tablerGray[400],
    gray: tablerGray,
    primary: "#066ed0",
    primaryLt: "#1f3046",
    danger: "#d63938",
    dangerLt: "#332c37",
    success: "#2fb344",
    successLt: "#223738",
    warning: "#f59f00",
    warningLt: "#353536",
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
