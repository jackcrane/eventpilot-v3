// components/layout/Page.js
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DayOfColors } from "../../constants/theme";

/**
 * Page
 * - Handles SafeAreaView, optional ScrollView, and a standard header (title/subtitle)
 * - Usage:
 *   <Page title="Volunteers" subtitle="Search roster...">
 *     {/* your page content *\/}
 *   </Page>
 */
export const Page = ({
  title,
  subtitle,
  scroll = true,
  headerRight = null,
  children,
  contentContainerStyle,
  testID,
}) => {
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safeArea} testID={testID}>
      <Container
        style={scroll ? styles.scroll : undefined}
        contentContainerStyle={
          scroll ? [styles.content, contentContainerStyle] : undefined
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerRight ? (
            <View style={styles.headerRight}>{headerRight}</View>
          ) : null}
        </View>

        {/* Page body */}
        <View style={styles.body}>{children}</View>
      </Container>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DayOfColors.light.background, // keeps background consistent under notches
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: DayOfColors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  headerRight: {
    marginLeft: 8,
  },
  body: {
    // Consumers can still add their own spacing; keep neutral defaults here
    gap: 12,
  },
});
