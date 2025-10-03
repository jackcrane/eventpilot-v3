/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "../constants/theme";
import { useColorScheme } from "./use-color-scheme";

/**
 * @param {{ light?: string, dark?: string }} props
 * @param {string} colorName
 */
export function useThemeColor(props, colorName) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}
