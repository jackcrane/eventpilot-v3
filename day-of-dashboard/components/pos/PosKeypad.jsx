import { Pressable, StyleSheet, Text, View } from "react-native";

import { DayOfColors } from "../../constants/theme";

const DEFAULT_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["clear", "0", "del"],
];

const LABELS = {
  clear: "CLR",
  del: "⌫",
};

const PosKeypad = ({
  onKeyPress,
  rows = DEFAULT_ROWS,
  disabled = false,
}) => {
  return (
    <View style={styles.keypad}>
      {rows.map((row, rowIndex) => (
        <View style={styles.keypadRow} key={`row-${rowIndex}`}>
          {row.map((key) => {
            const label = LABELS[key] ?? key;
            const isSecondary = key === "clear" || key === "del";
            return (
              <Pressable
                key={key}
                disabled={disabled}
                onPress={() => onKeyPress?.(key)}
                style={({ pressed }) => [
                  styles.keypadButton,
                  isSecondary
                    ? styles.keypadButtonSecondary
                    : styles.keypadButtonPrimary,
                  pressed && !disabled ? styles.keypadButtonPressed : null,
                  disabled ? styles.keypadButtonDisabled : null,
                ]}
              >
                <Text
                  style={[
                    styles.keypadButtonLabel,
                    isSecondary
                      ? styles.keypadButtonLabelSecondary
                      : styles.keypadButtonLabelPrimary,
                    disabled ? styles.keypadButtonLabelDisabled : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default PosKeypad;

const styles = StyleSheet.create({
  keypad: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 12,
  },
  keypadButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  keypadButtonPrimary: {
    backgroundColor: DayOfColors.common.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.border,
  },
  keypadButtonSecondary: {
    backgroundColor: DayOfColors.light.primaryLt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.primary,
  },
  keypadButtonPressed: {
    opacity: 0.9,
  },
  keypadButtonDisabled: {
    opacity: 0.6,
  },
  keypadButtonLabel: {
    fontSize: 24,
    fontWeight: "600",
  },
  keypadButtonLabelPrimary: {
    color: DayOfColors.light.text,
  },
  keypadButtonLabelSecondary: {
    color: DayOfColors.light.primary,
  },
  keypadButtonLabelDisabled: {
    color: DayOfColors.light.tertiary,
  },
});

