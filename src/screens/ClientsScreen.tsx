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
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../services/api';
import type { Client } from '../types';
import ClientCard from '../components/ClientCard';
import {
  EmptyState,
  StatusPill,
} from '../ui/components';
import { ui } from '../ui/theme';

type Filter =
  | 'all'
  | 'active'
  | 'renewal'
  | 'sync';

const isExpired = (client: Client) => {
  if (!client.membershipDueDate) {
    return client.membershipStatus !== 'Paid';
  }

  const due =
    new Date(
      client.membershipDueDate
    ).getTime();

  return (
    Number.isFinite(due) &&
    due < Date.now()
  );
};

const isActive = (client: Client) =>
  client.membershipStatus === 'Paid' &&
  !isExpired(client);

const ClientsScreen: React.FC<{
  navigation: any;
}> = ({ navigation }) => {
  const [clients, setClients] =
    useState<Client[]>([]);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [filter, setFilter] =
    useState<Filter>('all');

  const [isLoading, setIsLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadClients =
    useCallback(async () => {
      try {
        setError(null);

        const result =
          await api.getClients();

        setClients(result);
      } catch (loadError) {
        console.error(
          'Member list failed:',
          loadError
        );

        setError(
          'Members could not be refreshed.'
        );
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const counts = useMemo(() => {
    const active =
      clients.filter(isActive).length;

    const renewal =
      clients.filter(
        client => !isActive(client)
      ).length;

    const sync =
      clients.filter(
        client =>
          client.syncState ===
            'pending' ||
          client.syncState ===
            'failed'
      ).length;

    return {
      all: clients.length,
      active,
      renewal,
      sync,
    };
  }, [clients]);

  const filtered = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase();

    return clients
      .filter(client => {
        if (filter === 'active') {
          return isActive(client);
        }

        if (filter === 'renewal') {
          return !isActive(client);
        }

        if (filter === 'sync') {
          return (
            client.syncState ===
              'pending' ||
            client.syncState ===
              'failed'
          );
        }

        return true;
      })
      .filter(client => {
        if (!query) return true;

        return [
          client.name,
          client.phone,
          client.email,
        ]
          .filter(Boolean)
          .some(value =>
            String(value)
              .toLowerCase()
              .includes(query)
          );
      });
  }, [
    clients,
    filter,
    searchQuery,
  ]);

  const openClient = (
    client: Client
  ) => {
    navigation.navigate(
      'ClientDetail',
      {
        clientId: client.id,
      }
    );
  };

  const addMember = () => {
    navigation.navigate('AddClient');
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={ui.color.brand}
        />
        <Text style={styles.loadingText}>
          Loading members...
        </Text>
      </View>
    );
  }

  const filters: {
    key: Filter;
    label: string;
    count: number;
  }[] = [
    {
      key: 'all',
      label: 'All',
      count: counts.all,
    },
    {
      key: 'active',
      label: 'Active',
      count: counts.active,
    },
    {
      key: 'renewal',
      label: 'Needs renewal',
      count: counts.renewal,
    },
    {
      key: 'sync',
      label: 'Sync',
      count: counts.sync,
    },
  ];

  return (
    <View style={styles.page}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ClientCard
            client={item}
            onPress={() =>
              openClient(item)
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadClients();
            }}
            tintColor={ui.color.brand}
          />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.listContent
        }
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>
                  MEMBER DIRECTORY
                </Text>

                <Text style={styles.heroTitle}>
                  Members
                </Text>

                <Text
                  style={
                    styles.heroSubtitle
                  }
                >
                  Find a member fast,
                  see membership state,
                  then act.
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add member"
                style={styles.addButton}
                onPress={addMember}
              >
                <Ionicons
                  name="person-add-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text
                  style={
                    styles.addButtonText
                  }
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <TouchableOpacity
                onPress={loadClients}
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
                value={searchQuery}
                onChangeText={
                  setSearchQuery
                }
                style={styles.searchInput}
                placeholder="Search name, phone or email"
                placeholderTextColor={
                  ui.color.textMuted
                }
                autoCorrect={false}
                returnKeyType="search"
              />

              {searchQuery ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() =>
                    setSearchQuery('')
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

            <FlatList
              horizontal
              data={filters}
              keyExtractor={item =>
                item.key
              }
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterRow
              }
              renderItem={({ item }) => {
                const selected =
                  item.key === filter;

                return (
                  <TouchableOpacity
                    accessibilityRole="button"
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

                    <View
                      style={[
                        styles.countBubble,
                        selected &&
                          styles.countBubbleOn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          selected &&
                            styles.countTextOn,
                        ]}
                      >
                        {item.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <View
              style={styles.resultHeader}
            >
              <Text
                style={styles.resultTitle}
              >
                {filter === 'all'
                  ? 'All members'
                  : filter === 'active'
                    ? 'Active members'
                    : filter === 'renewal'
                      ? 'Needs renewal'
                      : 'Sync attention'}
              </Text>

              <StatusPill
                label={`${filtered.length} SHOWN`}
                toneName="neutral"
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={
                searchQuery
                  ? 'search-outline'
                  : 'people-outline'
              }
              title={
                searchQuery
                  ? 'No matching members'
                  : filter === 'renewal'
                    ? 'No renewals waiting'
                    : 'No members here'
              }
              body={
                searchQuery
                  ? 'Try a name, phone number or email.'
                  : filter === 'all'
                    ? 'Add the first member to start your directory.'
                    : 'Change the filter to view another group.'
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

  listContent: {
    paddingBottom: 34,
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
    backgroundColor:
      ui.color.brandStrong,
    borderRadius: ui.radius.xl,
    padding: ui.space.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroCopy: {
    flex: 1,
    paddingRight: ui.space.md,
  },

  eyebrow: {
    color: '#C7D2FE',
    fontSize: ui.type.eyebrow,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: ui.type.page,
    fontWeight: '900',
    marginTop: 3,
  },

  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: ui.type.bodySm,
    lineHeight: 16,
    marginTop: 4,
  },

  addButton: {
    minHeight: ui.touch.min,
    paddingHorizontal: ui.space.md,
    borderRadius: ui.radius.md,
    backgroundColor:
      'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  errorBar: {
    marginHorizontal: ui.space.lg,
    marginBottom: ui.space.md,
    minHeight: ui.touch.min,
    backgroundColor:
      ui.color.warningSoft,
    borderWidth: 1,
    borderColor:
      ui.color.warningBorder,
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
    fontSize: 13,
    paddingVertical: 12,
  },

  clearButton: {
    width: ui.touch.min,
    height: ui.touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },

  filterRow: {
    paddingHorizontal: ui.space.lg,
    paddingTop: ui.space.md,
    paddingBottom: ui.space.lg,
    gap: ui.space.sm,
  },

  filterChip: {
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  filterChipOn: {
    backgroundColor:
      ui.color.brandSoft,
    borderColor:
      ui.color.brandBorder,
  },

  filterText: {
    color: ui.color.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },

  filterTextOn: {
    color: ui.color.brand,
  },

  countBubble: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor:
      ui.color.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBubbleOn: {
    backgroundColor: ui.color.surface,
  },

  countText: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
  },

  countTextOn: {
    color: ui.color.brand,
  },

  resultHeader: {
    marginHorizontal: ui.space.lg,
    marginBottom: ui.space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultTitle: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyWrap: {
    marginHorizontal: ui.space.lg,
    marginTop: ui.space.sm,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    backgroundColor: ui.color.surface,
  },
});

export default ClientsScreen;