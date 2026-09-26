import React, {
  useCallback,
} from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  NotificationCenterItem,
  useNotificationCenter,
} from '../contexts/NotificationCenterContext';
import {
  useAppearanceTheme,
} from '../theme/appearance';

const timeLabel = (
  value: string
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleString();
};

const iconForType = (
  type: string
): keyof typeof Ionicons.glyphMap => {
  if (
    type.includes('payment')
  ) {
    return 'cash-outline';
  }

  if (
    type.includes(
      'membership'
    )
  ) {
    return 'calendar-outline';
  }

  if (
    type.includes(
      'attendance'
    )
  ) {
    return 'scan-outline';
  }

  if (
    type.includes('member')
  ) {
    return 'person-add-outline';
  }

  return 'notifications-outline';
};

const NotificationsScreen:
  React.FC<any> = ({
    navigation,
  }) => {
    const theme =
      useAppearanceTheme();

    const {
      items,
      unreadCount,
      realtimeConnected,
      refreshing,
      markRead,
      markAllRead,
      clearAll,
      refresh,
    } =
      useNotificationCenter();

    useFocusEffect(
      useCallback(() => {
        const timer =
          setTimeout(() => {
            markAllRead().catch(
              () => undefined
            );
          }, 450);

        return () =>
          clearTimeout(timer);
      }, [markAllRead])
    );

    const openItem = async (
      item:
        NotificationCenterItem
    ) => {
      await markRead(item.id);

      const clientId =
        item.data?.clientId;

      if (
        clientId &&
        navigation?.navigate
      ) {
        navigation.navigate(
          'RootTabs',
          {
            screen: 'Clients',
            params: {
              screen:
                'ClientDetail',
              params: {
                clientId,
              },
            },
          }
        );
      }
    };

    const confirmClear =
      () => {
        Alert.alert(
          'Clear notifications?',
          'This clears the notification center on this device for the current gym.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Clear',
              style:
                'destructive',
              onPress: () =>
                clearAll(),
            },
          ]
        );
      };

    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor:
              theme.colors.canvas,
          },
        ]}
      >
        <View
          style={[
            styles.summary,
            {
              backgroundColor:
                theme.colors.surface,
              borderColor:
                theme.colors.border,
            },
          ]}
        >
          <View>
            <Text
              style={[
                styles.heading,
                {
                  color:
                    theme.colors.text,
                },
              ]}
            >
              Notifications
            </Text>

            <Text
              style={[
                styles.subheading,
                {
                  color:
                    theme.colors.secondary,
                },
              ]}
            >
              {unreadCount > 0
                ? `${unreadCount} unread`
                : 'You are all caught up'}
            </Text>
          </View>

          <View
            style={[
              styles.livePill,
              {
                backgroundColor:
                  realtimeConnected
                    ? theme.colors.brandSoft
                    : theme.colors.surfaceSubtle,
                borderColor:
                  realtimeConnected
                    ? theme.colors.brand
                    : theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    realtimeConnected
                      ? theme.colors.brand
                      : theme.colors.muted,
                },
              ]}
            />

            <Text
              style={[
                styles.liveText,
                {
                  color:
                    realtimeConnected
                      ? theme.colors.brand
                      : theme.colors.secondary,
                },
              ]}
            >
              {realtimeConnected
                ? 'Live'
                : 'Syncing'}
            </Text>
          </View>
        </View>

        {items.length > 0 ? (
          <View
            style={styles.actions}
          >
            <TouchableOpacity
              onPress={() =>
                markAllRead()
              }
              style={[
                styles.actionButton,
                {
                  borderColor:
                    theme.colors.border,
                  backgroundColor:
                    theme.colors.surface,
                },
              ]}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={17}
                color={
                  theme.colors.brand
                }
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color:
                      theme.colors.brand,
                  },
                ]}
              >
                Mark all read
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={
                confirmClear
              }
              style={[
                styles.actionButton,
                {
                  borderColor:
                    theme.colors.border,
                  backgroundColor:
                    theme.colors.surface,
                },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={
                  theme.colors.secondary
                }
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color:
                      theme.colors.secondary,
                  },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={item =>
            item.id
          }
          contentContainerStyle={
            items.length === 0
              ? styles.emptyList
              : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={refresh}
              tintColor={
                theme.colors.brand
              }
            />
          }
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor:
                    theme.colors.surface,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor:
                      theme.colors.brandSoft,
                  },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={28}
                  color={
                    theme.colors.brand
                  }
                />
              </View>

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      theme.colors.text,
                  },
                ]}
              >
                No notifications
              </Text>

              <Text
                style={[
                  styles.emptyBody,
                  {
                    color:
                      theme.colors.secondary,
                  },
                ]}
              >
                Payment, membership and attendance activity will appear here automatically.
              </Text>
            </View>
          }
          renderItem={({
            item,
          }) => {
            const unread =
              !item.readAt;

            return (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() =>
                  openItem(item)
                }
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      theme.colors.surface,
                    borderColor:
                      unread
                        ? theme.colors.brand
                        : theme.colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor:
                        unread
                          ? theme.colors.brandSoft
                          : theme.colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Ionicons
                    name={iconForType(
                      item.type
                    )}
                    size={21}
                    color={
                      unread
                        ? theme.colors.brand
                        : theme.colors.secondary
                    }
                  />
                </View>

                <View
                  style={styles.copy}
                >
                  <View
                    style={
                      styles.titleRow
                    }
                  >
                    <Text
                      style={[
                        styles.title,
                        {
                          color:
                            theme.colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    {unread ? (
                      <View
                        style={[
                          styles.unreadDot,
                          {
                            backgroundColor:
                              theme.colors.brand,
                          },
                        ]}
                      />
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.body,
                      {
                        color:
                          theme.colors.secondary,
                      },
                    ]}
                    numberOfLines={3}
                  >
                    {item.body}
                  </Text>

                  <Text
                    style={[
                      styles.date,
                      {
                        color:
                          theme.colors.muted,
                      },
                    ]}
                  >
                    {timeLabel(
                      item.createdAt
                    )}
                  </Text>
                </View>

                {item.data
                  ?.clientId ? (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      theme.colors.muted
                    }
                  />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    summary: {
      margin: 16,
      marginBottom: 10,
      borderRadius: 20,
      borderWidth: 1,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    heading: {
      fontSize: 22,
      fontWeight: '900',
    },

    subheading: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '700',
    },

    livePill: {
      minHeight: 34,
      paddingHorizontal: 11,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },

    liveText: {
      fontSize: 11,
      fontWeight: '900',
    },

    actions: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      gap: 8,
    },

    actionButton: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    actionText: {
      fontSize: 11,
      fontWeight: '900',
    },

    list: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },

    card: {
      minHeight: 94,
      borderRadius: 18,
      borderWidth: 1,
      marginBottom: 10,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    copy: {
      flex: 1,
    },

    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: '900',
    },

    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },

    body: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },

    date: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: '700',
    },

    emptyList: {
      flexGrow: 1,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },

    emptyCard: {
      borderRadius: 22,
      borderWidth: 1,
      padding: 28,
      alignItems: 'center',
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    emptyBody: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      fontWeight: '600',
    },
  });

export default NotificationsScreen;
