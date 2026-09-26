import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { useGym } from '../contexts/GymContext';
import { useNetworkStatus } from '../hook/useNetworkStatus';
import { api } from '../services/api';
import paymentFlowService, {
  newPaymentIdempotencyKey,
  type PaymentMembershipContext,
  type PaymentPlanChoice,
} from '../services/paymentFlowService';
import { formatMoney } from '../utils/currency';
import {
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../ui/components';
import { ui } from '../ui/theme';

const SUPPORTS_DISCOUNT =
  false;

const SUPPORTS_REFERENCE =
  false;

const paymentMethodsFor = (
  countryCode: string
) =>
  countryCode === 'IN'
    ? [
        {
          key: 'cash',
          label: 'Cash',
          icon: 'cash-outline',
        },
        {
          key: 'upi',
          label: 'UPI',
          icon: 'phone-portrait-outline',
        },
        {
          key: 'bank',
          label: 'Bank',
          icon: 'business-outline',
        },
        {
          key: 'card',
          label: 'Card',
          icon: 'card-outline',
        },
      ]
    : [
        {
          key: 'cash',
          label: 'Cash',
          icon: 'cash-outline',
        },
        {
          key: 'raast',
          label: 'Raast',
          icon: 'flash-outline',
        },
        {
          key: 'easypaisa',
          label: 'Easypaisa',
          icon: 'phone-portrait-outline',
        },
        {
          key: 'jazzcash',
          label: 'JazzCash',
          icon: 'phone-portrait-outline',
        },
        {
          key: 'bank',
          label: 'Bank',
          icon: 'business-outline',
        },
        {
          key: 'card',
          label: 'Card',
          icon: 'card-outline',
        },
      ];

const dateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const friendlyDate = (
  value: string | null
) =>
  value
    ? new Date(
        `${value.slice(0, 10)}T12:00:00`
      ).toLocaleDateString()
    : '-Â';

const AddPaymentScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const route = useRoute<any>();

  const paymentRouteParams = (route.params ?? {}) as {
    clientId?: string;
    clientName?: string;
  };

  const clientId = paymentRouteParams.clientId ?? '';
  const clientName = paymentRouteParams.clientName ?? '';

  const { activeGymId, activeGym } = useGym();
  const isConnected = useNetworkStatus();


  const [plans, setPlans] =
    useState<
      PaymentPlanChoice[]
    >([]);

  const [
    selectedPlanId,
    setSelectedPlanId,
  ] = useState<string | null>(
    null
  );

  const [
    membershipContext,
    setMembershipContext,
  ] =
    useState<PaymentMembershipContext>({
      hasMembershipHistory:
        false,
      latestEndDate: null,
    });

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState('cash');

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState('');

  const [discount, setDiscount] =
    useState('0');

  const [notes, setNotes] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!activeGymId) return;

    Promise.all([
      paymentFlowService.listPlans(
        activeGymId
      ),
      paymentFlowService.getMembershipContext(
        activeGymId,
        clientId
      ),
      api.getClient(clientId),
    ])
      .then(
        ([
          planRows,
          context,
        ]) => {
          setPlans(planRows);
          setMembershipContext(
            context
          );

          if (
            planRows.length > 0
          ) {
            setSelectedPlanId(
              planRows[0].id
            );
          }
        }
      )
      .catch(loadError => {
        console.error(
          'Receive fee load failed:',
          loadError
        );

        setError(
          'Membership plans could not be loaded.'
        );
      })
      .finally(() =>
        setLoading(false)
      );
  }, [
    activeGymId,
    clientId,
  ]);

  const plan = useMemo(
    () =>
      plans.find(
        item =>
          item.id ===
          selectedPlanId
      ) || null,
    [
      plans,
      selectedPlanId,
    ]
  );

  const admissionFee =
    plan &&
    !membershipContext.hasMembershipHistory
      ? plan.admissionFee
      : 0;

  const discountAmount =
    SUPPORTS_DISCOUNT
      ? Math.max(
          Number(discount) || 0,
          0
        )
      : 0;

  const subtotal =
    (plan?.price || 0) +
    admissionFee;

  const total =
    Math.max(
      subtotal - discountAmount,
      0
    );

  const today = useMemo(
    () => new Date(),
    []
  );

  const expectedDates =
    useMemo(() => {
      if (!plan) {
        return {
          start: null as string | null,
          end: null as string | null,
          stacked: false,
        };
      }

      const activeEnd =
        membershipContext.latestEndDate
          ? new Date(
              `${membershipContext.latestEndDate.slice(
                0,
                10
              )}T12:00:00`
            )
          : null;

      let start =
        new Date(today);

      let stacked = false;

      if (
        activeEnd &&
        Number.isFinite(
          activeEnd.getTime()
        ) &&
        activeEnd.getTime() >=
          today.setHours(
            0,
            0,
            0,
            0
          )
      ) {
        start =
          new Date(activeEnd);

        start.setDate(
          start.getDate() + 1
        );

        stacked = true;
      }

      const end =
        new Date(start);

      end.setDate(
        end.getDate() +
          Math.max(
            plan.durationDays,
            1
          ) -
          1
      );

      return {
        start:
          dateOnly(start),
        end: dateOnly(end),
        stacked,
      };
    }, [
      membershipContext
        .latestEndDate,
      plan,
      today,
    ]);

  const methods = useMemo(
    () =>
      paymentMethodsFor(
        activeGym
          ?.countryCode || 'PK'
      ),
    [
      activeGym?.countryCode,
    ]
  );

  const requiresReference =
    paymentMethod !== 'cash';

  const confirmPayment = () => {
    if (!isConnected) {
      setError(
        'Payments are online-only. Reconnect before receiving a membership fee.'
      );
      return;
    }

    if (
      !activeGymId ||
      !activeGym ||
      !plan
    ) {
      setError(
        'Choose a membership plan.'
      );
      return;
    }

    if (
      discountAmount > subtotal
    ) {
      setError(
        'Discount cannot be greater than the amount being charged.'
      );
      return;
    }

    if (
      requiresReference &&
      SUPPORTS_REFERENCE &&
      !referenceNumber.trim()
    ) {
      setError(
        'Add a transaction/reference number for this payment method.'
      );
      return;
    }

    Alert.alert(
      'Confirm payment',
      [
        clientName,
        plan.name,
        `Receive ${formatMoney(
          total,
          activeGym.currencyCode
        )}`,
        expectedDates.stacked
          ? 'This renewal will follow the current membership.'
          : 'Membership starts now.',
      ].join('\n'),
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: submit,
        },
      ]
    );
  };

  const submit = async () => {
    if (
      !activeGymId ||
      !activeGym ||
      !plan ||
      !expectedDates.start
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result =
        await paymentFlowService.recordPayment(
          {
            gymId: activeGymId,
            clientId,
            planId: plan.id,
            amount: total,
            admissionFee,
            discountAmount,
            paymentMethod,
            referenceNumber:
              referenceNumber.trim() ||
              null,
            notes:
              notes.trim() || null,
            idempotencyKey:
              newPaymentIdempotencyKey(),
            paymentDate:
              dateOnly(new Date()),
            startDate:
              expectedDates.start,
            planDurationDays:
              plan.durationDays,
          }
        );

      const paymentId =
        result?.payment_id ||
        result?.paymentId ||
        result?.payment?.id ||
        result?.id ||
        null;

      if (paymentId) {
        navigation
          .getParent()
          ?.getParent()
          ?.navigate(
            'Receipt',
            {
              paymentId,
            }
          );

        return;
      }

      Alert.alert(
        'Payment confirmed',
        'The membership payment was recorded successfully.',
        [
          {
            text: 'Done',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (saveError: any) {
      console.error(
        'Membership payment failed:',
        saveError
      );

      setError(
        saveError?.message ||
          'The payment was not recorded. No success has been assumed.'
      );
    } finally {
      setSaving(false);
    }
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
          Preparing membership...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() =>
                navigation.goBack()
              }
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <StatusPill
              label="MEMBERSHIP FEE"
              toneName="brand"
            />
          </View>

          <Text style={styles.heroTitle}>
            Receive fee
          </Text>

          <Text
            style={
              styles.heroMember
            }
          >
            {clientName}
          </Text>

          <Text
            style={
              styles.heroSubtitle
            }
          >
            Choose the membership, review
            exactly what will be charged,
            then confirm once.
          </Text>
        </View>

        {!isConnected ? (
          <View
            style={
              styles.offlineBox
            }
          >
            <Ionicons
              name="cloud-offline-outline"
              size={20}
              color={ui.color.warning}
            />

            <View style={styles.flex}>
              <Text
                style={
                  styles.offlineTitle
                }
              >
                Payment disabled offline
              </Text>

              <Text
                style={
                  styles.offlineText
                }
              >
                Financial writes are
                confirmed by the server
                only. Reconnect before
                receiving money.
              </Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={ui.color.danger}
            />
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="1. Membership"
            subtitle="Select what the member is renewing or buying."
          />

          {plans.length === 0 ? (
            <SurfaceCard
              style={
                styles.emptyPlan
              }
            >
              <Text
                style={
                  styles.emptyPlanTitle
                }
              >
                No active membership
                plans
              </Text>
              <Text
                style={
                  styles.emptyPlanText
                }
              >
                Create an active plan in
                Membership Plans before
                receiving a fee.
              </Text>
            </SurfaceCard>
          ) : (
            <View
              style={styles.planList}
            >
              {plans.map(item => {
                const selected =
                  item.id ===
                  selectedPlanId;

                return (
                  <TouchableOpacity
                    key={item.id}
                    accessibilityRole="button"
                    activeOpacity={0.78}
                    onPress={() => {
                      setSelectedPlanId(
                        item.id
                      );
                      setError(null);
                    }}
                    style={[
                      styles.planCard,
                      selected &&
                        styles.planSelected,
                    ]}
                  >
                    <View
                      style={
                        styles.planTop
                      }
                    >
                      <View
                        style={
                          styles.planCopy
                        }
                      >
                        <Text
                          style={[
                            styles.planName,
                            selected &&
                              styles.planNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.planDuration
                          }
                        >
                          {item.durationDays}{' '}
                          days
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.planPrice,
                          selected &&
                            styles.planPriceSelected,
                        ]}
                      >
                        {formatMoney(
                          item.price,
                          activeGym
                            ?.currencyCode ||
                            'PKR'
                        )}
                      </Text>
                    </View>

                    {item.admissionFee >
                    0 ? (
                      <Text
                        style={
                          styles.planAdmission
                        }
                      >
                        Admission fee{' '}
                        {formatMoney(
                          item.admissionFee,
                          activeGym
                            ?.currencyCode ||
                            'PKR'
                        )}
                        {membershipContext.hasMembershipHistory
                          ? '  -  not charged on this renewal'
                          : '  -  applies to first membership'}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {plan ? (
          <>
            <SurfaceCard
              style={styles.card}
            >
              <SectionHeader
                title="2. Membership dates"
                subtitle={
                  expectedDates.stacked
                    ? 'The new plan is expected to start after the current membership ends.'
                    : 'This membership is expected to start now.'
                }
              />

              {expectedDates.stacked ? (
                <View
                  style={
                    styles.stackNotice
                  }
                >
                  <Ionicons
                    name="layers-outline"
                    size={18}
                    color={ui.color.success}
                  />
                  <Text
                    style={
                      styles.stackText
                    }
                  >
                    Renewal stacking:
                    current membership
                    remains intact.
                  </Text>
                </View>
              ) : null}

              <View
                style={styles.dateRow}
              >
                <DateBlock
                  label="Starts"
                  value={friendlyDate(
                    expectedDates.start
                  )}
                />

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={
                    ui.color.textMuted
                  }
                />

                <DateBlock
                  label="Expected until"
                  value={friendlyDate(
                    expectedDates.end
                  )}
                  right
                />
              </View>

              <Text
                style={
                  styles.serverHint
                }
              >
                Final membership dates
                are confirmed by the
                server transaction.
              </Text>
            </SurfaceCard>

            <SurfaceCard
              style={styles.card}
            >
              <SectionHeader
                title="3. Payment"
                subtitle="Choose how the member is paying."
              />

              <View
                style={
                  styles.methodGrid
                }
              >
                {methods.map(method => {
                  const selected =
                    method.key ===
                    paymentMethod;

                  return (
                    <TouchableOpacity
                      key={method.key}
                      accessibilityRole="button"
                      onPress={() => {
                        setPaymentMethod(
                          method.key
                        );

                        if (
                          method.key ===
                          'cash'
                        ) {
                          setReferenceNumber(
                            ''
                          );
                        }
                      }}
                      style={[
                        styles.method,
                        selected &&
                          styles.methodSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          method.icon as any
                        }
                        size={19}
                        color={
                          selected
                            ? ui.color.brand
                            : ui.color.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.methodText,
                          selected &&
                            styles.methodTextSelected,
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {requiresReference &&
              SUPPORTS_REFERENCE ? (
                <View
                  style={
                    styles.inputGroup
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Transaction/reference
                    number
                  </Text>

                  <TextInput
                    value={
                      referenceNumber
                    }
                    onChangeText={
                      setReferenceNumber
                    }
                    style={styles.input}
                    placeholder="Enter reference"
                    placeholderTextColor={
                      ui.color.textMuted
                    }
                    autoCapitalize="characters"
                  />
                </View>
              ) : null}

              {SUPPORTS_DISCOUNT ? (
                <View
                  style={
                    styles.inputGroup
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Discount
                  </Text>

                  <TextInput
                    value={discount}
                    onChangeText={value => {
                      setDiscount(value);
                      setError(null);
                    }}
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={
                      ui.color.textMuted
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              ) : null}

              <View
                style={
                  styles.inputGroup
                }
              >
                <Text
                  style={styles.label}
                >
                  Note
                </Text>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  style={[
                    styles.input,
                    styles.noteInput,
                  ]}
                  placeholder="Optional internal note"
                  placeholderTextColor={
                    ui.color.textMuted
                  }
                  multiline
                />
              </View>
            </SurfaceCard>

            <SurfaceCard
              style={
                styles.summaryCard
              }
            >
              <SectionHeader
                title="Review"
                subtitle="What reception is about to collect."
              />

              <SummaryRow
                label={plan.name}
                value={formatMoney(
                  plan.price,
                  activeGym
                    ?.currencyCode ||
                    'PKR'
                )}
              />

              {admissionFee > 0 ? (
                <SummaryRow
                  label="Admission fee"
                  value={formatMoney(
                    admissionFee,
                    activeGym
                      ?.currencyCode ||
                      'PKR'
                  )}
                />
              ) : null}

              {discountAmount > 0 ? (
                <SummaryRow
                  label="Discount"
                  value={`- ${formatMoney(
                    discountAmount,
                    activeGym
                      ?.currencyCode ||
                      'PKR'
                  )}`}
                  positive
                />
              ) : null}

              <View
                style={styles.totalRow}
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  RECEIVE NOW
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  {formatMoney(
                    total,
                    activeGym
                      ?.currencyCode ||
                      'PKR'
                  )}
                </Text>
              </View>
            </SurfaceCard>

            <TouchableOpacity
              accessibilityRole="button"
              disabled={
                saving ||
                !isConnected ||
                total <= 0
              }
              onPress={confirmPayment}
              style={[
                styles.confirmButton,
                (
                  saving ||
                  !isConnected ||
                  total <= 0
                ) &&
                  styles.confirmDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text
                    style={
                      styles.confirmText
                    }
                  >
                    Confirm payment
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.safetyNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={ui.color.success}
              />

              <Text
                style={
                  styles.safetyText
                }
              >
                A receipt is shown only
                after Supabase confirms
                the payment and
                membership transaction.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const DateBlock = ({
  label,
  value,
  right = false,
}: {
  label: string;
  value: string;
  right?: boolean;
}) => (
  <View
    style={[
      styles.dateBlock,
      right &&
        styles.dateBlockRight,
    ]}
  >
    <Text style={styles.dateLabel}>
      {label}
    </Text>
    <Text style={styles.dateValue}>
      {value}
    </Text>
  </View>
);

const SummaryRow = ({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>
      {label}
    </Text>
    <Text
      style={[
        styles.summaryValue,
        positive &&
          styles.summaryPositive,
      ]}
    >
      {value}
    </Text>
  </View>
);

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },
  content: {
    padding: ui.space.lg,
    paddingBottom: 46,
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
  flex: {
    flex: 1,
  },
  hero: {
    backgroundColor: ui.color.brandStrong,
    borderRadius: ui.radius.xl,
    padding: ui.space.xl,
    marginBottom: ui.space.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: ui.touch.min,
    height: ui.touch.min,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: ui.type.page,
    fontWeight: '900',
    marginTop: ui.space.md,
  },
  heroMember: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: ui.type.bodySm,
    lineHeight: 17,
    marginTop: 5,
  },
  offlineBox: {
    backgroundColor: ui.color.warningSoft,
    borderWidth: 1,
    borderColor: ui.color.warningBorder,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    gap: ui.space.sm,
    alignItems: 'flex-start',
    marginBottom: ui.space.md,
  },
  offlineTitle: {
    color: ui.color.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  offlineText: {
    color: ui.color.warning,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: ui.color.dangerSoft,
    borderWidth: 1,
    borderColor: ui.color.dangerBorder,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    gap: ui.space.sm,
    alignItems: 'flex-start',
    marginBottom: ui.space.md,
  },
  errorText: {
    flex: 1,
    color: ui.color.danger,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: ui.space.xl,
  },
  planList: {
    gap: ui.space.sm,
  },
  planCard: {
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    padding: ui.space.lg,
  },
  planSelected: {
    backgroundColor: ui.color.brandSoft,
    borderColor: ui.color.brand,
    borderWidth: 2,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ui.space.md,
  },
  planCopy: {
    flex: 1,
  },
  planName: {
    color: ui.color.text,
    fontSize: 14,
    fontWeight: '900',
  },
  planNameSelected: {
    color: ui.color.brandStrong,
  },
  planDuration: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },
  planPrice: {
    color: ui.color.text,
    fontSize: 16,
    fontWeight: '900',
  },
  planPriceSelected: {
    color: ui.color.brand,
  },
  planAdmission: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: ui.space.sm,
  },
  emptyPlan: {
    padding: ui.space.lg,
  },
  emptyPlanTitle: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyPlanText: {
    color: ui.color.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  card: {
    padding: ui.space.lg,
    marginBottom: ui.space.md,
  },
  stackNotice: {
    backgroundColor: ui.color.successSoft,
    borderWidth: 1,
    borderColor: ui.color.successBorder,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.sm,
    marginBottom: ui.space.md,
  },
  stackText: {
    flex: 1,
    color: ui.color.success,
    fontSize: 9,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.md,
  },
  dateBlock: {
    flex: 1,
  },
  dateBlockRight: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  dateValue: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  serverHint: {
    color: ui.color.textMuted,
    fontSize: 8,
    lineHeight: 13,
    marginTop: ui.space.md,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ui.space.sm,
    marginBottom: ui.space.lg,
  },
  method: {
    minWidth: '30%',
    minHeight: 54,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.color.border,
    backgroundColor: ui.color.surfaceSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 9,
  },
  methodSelected: {
    backgroundColor: ui.color.brandSoft,
    borderColor: ui.color.brandBorder,
  },
  methodText: {
    color: ui.color.textSecondary,
    fontSize: 9,
    fontWeight: '900',
  },
  methodTextSelected: {
    color: ui.color.brand,
  },
  inputGroup: {
    marginTop: ui.space.md,
  },
  label: {
    color: ui.color.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 7,
  },
  input: {
    minHeight: ui.touch.min,
    borderWidth: 1,
    borderColor: ui.color.border,
    backgroundColor: ui.color.surfaceSubtle,
    borderRadius: ui.radius.md,
    paddingHorizontal: ui.space.md,
    paddingVertical: 11,
    color: ui.color.text,
    fontSize: 13,
  },
  noteInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  summaryCard: {
    padding: ui.space.lg,
    marginBottom: ui.space.md,
  },
  summaryRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: ui.color.divider,
  },
  summaryLabel: {
    color: ui.color.textSecondary,
    fontSize: 10,
  },
  summaryValue: {
    color: ui.color.text,
    fontSize: 10,
    fontWeight: '900',
  },
  summaryPositive: {
    color: ui.color.success,
  },
  totalRow: {
    minHeight: 66,
    borderRadius: ui.radius.md,
    backgroundColor: ui.color.brandSoft,
    marginTop: ui.space.md,
    paddingHorizontal: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: ui.color.brand,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  totalValue: {
    color: ui.color.brandStrong,
    fontSize: 24,
    fontWeight: '900',
  },
  confirmButton: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: ui.color.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ui.space.sm,
  },
  confirmDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  safetyNote: {
    padding: ui.space.md,
    flexDirection: 'row',
    gap: ui.space.sm,
    alignItems: 'flex-start',
  },
  safetyText: {
    flex: 1,
    color: ui.color.success,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '700',
  },
});

export default AddPaymentScreen;
