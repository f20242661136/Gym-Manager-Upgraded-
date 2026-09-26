import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { useGym } from '../contexts/GymContext';
import { receiptService } from '../services/receiptService';
import { formatMoney } from '../utils/currency';
import type {
  ReceiptPaymentListItem,
} from '../types/receipt';
import {
  EmptyState,
  StatusPill,
} from '../ui/components';
import { ui } from '../ui/theme';

type Filter =
  | 'all'
  | 'paid'
  | 'voided';

const methodLabel = (
  value: string
) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char =>
      char.toUpperCase()
    );

const PaymentsScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const route = useRoute<any>();

  const {
    activeGym,
    activeGymId,
  } = useGym();

  const routeClientId =
    route.params?.clientId ||
    null;

  const routeClientName =
    route.params?.clientName ||
    null;

  const [rows, setRows] =
    useState<
      ReceiptPaymentListItem[]
    >([]);

  const [query, setQuery] =
    useState('');

  const [filter, setFilter] =
    useState<Filter>('all');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load =
    useCallback(async () => {
      if (!activeGymId) return;

      try {
        setError(null);

        const result =
          await receiptService.listPayments(
            activeGymId,
            routeClientId
          );

        setRows(result);
      } catch (loadError: any) {
        console.error(
          'Payment history failed:',
          loadError
        );

        setError(
          loadError?.message ||
          'Payment history could not be refreshed.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      activeGymId,
      routeClientId,
    ]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    useMemo(() => {
      const q =
        query
          .trim()
          .toLowerCase();

      return rows
        .filter(item => {
          if (filter === 'paid') {
            return (
              item.status === 'Paid'
            );
          }

          if (
            filter === 'voided'
          ) {
            return (
              item.status ===
              'Voided'
            );
          }

          return true;
        })
        .filter(item => {
          if (!q) return true;

          return [
            item.clientName,
            item.receiptNumber,
            item.referenceNumber,
            item.planName,
            item.paymentMethod,
          ]
            .filter(Boolean)
            .some(value =>
              String(value)
                .toLowerCase()
                .includes(q)
            );
        });
    }, [
      filter,
      query,
      rows,
    ]);

  const paidTotal = useMemo(
    () =>
      rows
        .filter(
          item =>
            item.status ===
            'Paid'
        )
        .reduce(
          (sum, item) =>
            sum + item.amount,
          0
        ),
    [rows]
  );

  const voidedCount =
    rows.filter(
      item =>
        item.status === 'Voided'
    ).length;

  const rootNavigate = (
    name: string,
    params?: any
  ) => {
    navigation
      .getParent()
      ?.getParent()
      ?.navigate(name, params);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={ui.color.brand}
        />
        <Text
          style={styles.loadingText}
        >
          Loading receipts...
        </Text>
      </View>
    );
  }

  const filters: {
    key: Filter;
    label: string;
  }[] = [
    {
      key: 'all',
      label: `All  -  ${rows.length}`,
    },
    {
      key: 'paid',
      label: `Paid  -  ${
        rows.length -
        voidedCount
      }`,
    },
    {
      key: 'voided',
      label: `Voided  -  ${voidedCount}`,
    },
  ];

  return (
    <View style={styles.page}>
      <FlatList
        data={filtered}
        keyExtractor={item =>
          item.id
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={ui.color.brand}
          />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>
                {routeClientName
                  ? 'MEMBER RECEIPTS'
                  : activeGym?.name ||
                    'PAYMENTS'}
              </Text>

              <Text
                style={styles.heroTitle}
              >
                {routeClientName ||
                  'Payments'}
              </Text>

              <View
                style={
                  styles.totalRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.totalLabel
                    }
                  >
                    CONFIRMED COLLECTIONS
                  </Text>

                  <Text
                    style={
                      styles.totalValue
                    }
                  >
                    {formatMoney(
                      paidTotal,
                      activeGym
                        ?.currencyCode ||
                        'PKR'
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() =>
                    rootNavigate(
                      'WhatsAppTools'
                    )
                  }
                  style={
                    styles.whatsAppButton
                  }
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={19}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <TouchableOpacity
                onPress={load}
                style={styles.errorBar}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={18}
                  color={
                    ui.color.warning
                  }
                />
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error} Tap to retry.
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.search}>
              <Ionicons
                name="search-outline"
                size={20}
                color={
                  ui.color.textMuted
                }
              />

              <TextInput
                value={query}
                onChangeText={setQuery}
                style={
                  styles.searchInput
                }
                placeholder="Search member, receipt, plan or reference"
                placeholderTextColor={
                  ui.color.textMuted
                }
                autoCorrect={false}
              />

              {query ? (
                <TouchableOpacity
                  onPress={() =>
                    setQuery('')
                  }
                  style={
                    styles.clearButton
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={
                      ui.color.textMuted
                    }
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <View
              style={
                styles.filterRow
              }
            >
              {filters.map(item => {
                const selected =
                  item.key === filter;

                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() =>
                      setFilter(item.key)
                    }
                    style={[
                      styles.filterChip,
                      selected &&
                        styles.filterChipOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selected &&
                          styles.filterTextOn,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              style={styles.sectionTitle}
            >
              RECEIPT HISTORY
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={() =>
              rootNavigate(
                'Receipt',
                {
                  paymentId:
                    item.id,
                }
              )
            }
            style={styles.paymentCard}
          >
            <View
              style={[
                styles.paymentIcon,
                item.status ===
                  'Voided' &&
                  styles.paymentIconVoided,
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={20}
                color={
                  item.status ===
                  'Voided'
                    ? ui.color.textMuted
                    : ui.color.brand
                }
              />
            </View>

            <View
              style={
                styles.paymentCopy
              }
            >
              <View
                style={
                  styles.paymentTop
                }
              >
                <Text
                  style={
                    styles.memberName
                  }
                  numberOfLines={1}
                >
                  {item.clientName}
                </Text>

                <Text
                  style={[
                    styles.amount,
                    item.status ===
                      'Voided' &&
                      styles.amountVoided,
                  ]}
                >
                  {formatMoney(
                    item.amount,
                    activeGym
                      ?.currencyCode ||
                      'PKR'
                  )}
                </Text>
              </View>

              <Text
                style={
                  styles.receiptNumber
                }
              >
                {item.receiptNumber}
                {item.planName
                  ? `  -  ${item.planName}`
                  : ''}
              </Text>

              <View
                style={
                  styles.paymentBottom
                }
              >
                <Text
                  style={
                    styles.paymentMeta
                  }
                >
                  {new Date(
                    item.paymentDate
                  ).toLocaleDateString()}
                  {' - '}
                  {methodLabel(
                    item.paymentMethod
                  )}
                </Text>

                <StatusPill
                  label={item.status}
                  toneName={
                    item.status ===
                    'Paid'
                      ? 'success'
                      : item.status ===
                          'Voided'
                        ? 'danger'
                        : 'warning'
                  }
                />
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={ui.color.textMuted}
            />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState
              icon="receipt-outline"
              title="No receipts found"
              body={
                query
                  ? 'Try another search.'
                  : 'Confirmed membership payments will appear here.'
              }
            />
          </View>
        }
      />
    </View>
  );
};

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },
  content: {
    paddingBottom: 42,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.color.canvas,
  },
  loadingText: {
    color: ui.color.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: ui.space.md,
  },
  hero: {
    margin: ui.space.lg,
    marginBottom: ui.space.md,
    backgroundColor: ui.color.brandStrong,
    borderRadius: ui.radius.xl,
    padding: ui.space.xl,
  },
  eyebrow: {
    color: '#C7D2FE',
    fontSize: ui.type.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: ui.type.page,
    fontWeight: '900',
    marginTop: 3,
  },
  totalRow: {
    marginTop: ui.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: '#C7D2FE',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 3,
  },
  whatsAppButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBar: {
    marginHorizontal: ui.space.lg,
    marginBottom: ui.space.md,
    minHeight: ui.touch.min,
    backgroundColor: ui.color.warningSoft,
    borderWidth: 1,
    borderColor: ui.color.warningBorder,
    borderRadius: ui.radius.md,
    paddingHorizontal: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
  },
  errorText: {
    flex: 1,
    color: ui.color.warning,
    fontSize: 10,
    fontWeight: '800',
  },
  search: {
    minHeight: 52,
    marginHorizontal: ui.space.lg,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.md,
    paddingHorizontal: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
  },
  searchInput: {
    flex: 1,
    color: ui.color.text,
    fontSize: 12,
  },
  clearButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: ui.space.lg,
    paddingVertical: ui.space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ui.space.sm,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: ui.radius.pill,
    borderWidth: 1,
    borderColor: ui.color.border,
    backgroundColor: ui.color.surface,
    paddingHorizontal: 11,
    justifyContent: 'center',
  },
  filterChipOn: {
    backgroundColor: ui.color.brandSoft,
    borderColor: ui.color.brandBorder,
  },
  filterText: {
    color: ui.color.textSecondary,
    fontSize: 9,
    fontWeight: '900',
  },
  filterTextOn: {
    color: ui.color.brand,
  },
  sectionTitle: {
    marginHorizontal: ui.space.lg,
    marginTop: ui.space.xs,
    marginBottom: ui.space.sm,
    color: ui.color.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  paymentCard: {
    minHeight: 86,
    marginHorizontal: ui.space.lg,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: ui.space.sm,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },
  paymentIconVoided: {
    backgroundColor: ui.color.surfaceSubtle,
  },
  paymentCopy: {
    flex: 1,
    minWidth: 0,
  },
  paymentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ui.space.sm,
  },
  memberName: {
    flex: 1,
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },
  amount: {
    maxWidth: '46%',
    flexShrink: 1,
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
  },
  amountVoided: {
    color: ui.color.textMuted,
    textDecorationLine: 'line-through',
  },
  receiptNumber: {
    color: ui.color.brand,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },
  paymentBottom: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ui.space.sm,
  },
  paymentMeta: {
    flex: 1,
    color: ui.color.textSecondary,
    fontSize: 8,
  },
  empty: {
    marginHorizontal: ui.space.lg,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
  },
});

export default PaymentsScreen;
