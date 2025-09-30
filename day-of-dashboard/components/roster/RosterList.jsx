import { useCallback, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { DayOfColors } from "../../constants/theme";

const RosterList = ({
  title,
  subtitle,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search",
  errorText,
  data = [],
  loading = false,
  onRefresh,
  emptyTitle,
  emptySubtitle,
  getRowData,
  getItemId = (item) => item?.id,
  onSelectItem,
}) => {
  const safeData = Array.isArray(data) ? data : [];

  const contentContainerStyle = useMemo(() => {
    const hasItems = safeData.length > 0;
    return [
      rosterListStyles.listContainer,
      !loading && !hasItems ? rosterListStyles.emptyListContainer : null,
    ];
  }, [loading, safeData.length]);

  const handleSelect = useCallback(
    (item, row) => {
      if (!onSelectItem) return;
      const derivedId = row?.id ?? getItemId(item);
      if (derivedId) {
        onSelectItem(derivedId, item);
      }
    },
    [getItemId, onSelectItem]
  );

  const renderItem = useCallback(
    ({ item }) => {
      if (!getRowData) return null;
      const row = getRowData(item);
      if (!row) return null;
      const details = Array.isArray(row.details) ? row.details : [];
      return (
        <TouchableOpacity
          style={rosterListStyles.listRow}
          onPress={() => handleSelect(item, row)}
          disabled={!onSelectItem}
        >
          <Text style={rosterListStyles.listTitle} numberOfLines={1}>
            {row.title}
          </Text>
          {row.meta ? (
            <Text style={rosterListStyles.listMeta}>{row.meta}</Text>
          ) : null}
          {details.map((detail, index) =>
            detail ? (
              <Text key={index} style={rosterListStyles.listDetail}>
                {detail}
              </Text>
            ) : null
          )}
        </TouchableOpacity>
      );
    },
    [getRowData, handleSelect, onSelectItem]
  );

  const keyExtractor = useCallback(
    (item) => {
      const id = getItemId(item);
      return id ? String(id) : JSON.stringify(item);
    },
    [getItemId]
  );

  const refreshControl = onRefresh
    ? (
        <RefreshControl refreshing={Boolean(loading)} onRefresh={onRefresh} />
      )
    : undefined;

  return (
    <View style={rosterListStyles.safeArea}>
      <FlatList
        data={safeData}
        keyExtractor={keyExtractor}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={contentContainerStyle}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        ListHeaderComponent={
          <View style={rosterListStyles.header}>
            {title ? <Text style={rosterListStyles.title}>{title}</Text> : null}
            {subtitle ? (
              <Text style={rosterListStyles.subtitle}>{subtitle}</Text>
            ) : null}
            <TextInput
              value={searchValue ?? ""}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              style={rosterListStyles.searchInput}
              placeholderTextColor={DayOfColors.light.tertiary}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="always"
            />
            {errorText ? (
              <Text style={rosterListStyles.errorText}>{errorText}</Text>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={rosterListStyles.separator} />}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading ? (
            <View style={rosterListStyles.emptyState}>
              {emptyTitle ? (
                <Text style={rosterListStyles.emptyTitle}>{emptyTitle}</Text>
              ) : null}
              {emptySubtitle ? (
                <Text style={rosterListStyles.emptySubtitle}>
                  {emptySubtitle}
                </Text>
              ) : null}
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default RosterList;

export const rosterListStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  subtitle: {
    fontSize: 15,
    color: DayOfColors.light.secondary,
  },
  searchInput: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: DayOfColors.light.gray[200],
    fontSize: 16,
    color: DayOfColors.light.text,
  },
  errorText: {
    color: DayOfColors.light.error,
    fontSize: 14,
    marginTop: 8,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  emptyListContainer: {
    justifyContent: "center",
  },
  listRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: DayOfColors.common.white,
    gap: 4,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  listMeta: {
    fontSize: 13,
    color: DayOfColors.light.tertiary,
  },
  listDetail: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  separator: {
    marginLeft: 20,
    height: StyleSheet.hairlineWidth,
    backgroundColor: DayOfColors.light.border,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
    textAlign: "center",
  },
});
