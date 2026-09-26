import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { useGym } from '../contexts/GymContext';
import { receiptService } from '../services/receiptService';
import {
  openWhatsApp,
  receiptWhatsAppMessage,
} from '../utils/whatsapp';
import { formatMoney } from '../utils/currency';
import type {
  PaymentReceipt,
} from '../types/receipt';
import {
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../ui/components';
import { ui } from '../ui/theme';

const labelize = (
  value: string
) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char =>
      char.toUpperCase()
    );

const ReceiptScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const route = useRoute<any>();

  const { activeGymId } =
    useGym();

  const paymentId: string =
    route.params.paymentId;

  const [receipt, setReceipt] =
    useState<PaymentReceipt | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [sharing, setSharing] =
    useState(false);

  const load =
    useCallback(async () => {
      if (!activeGymId) return;

      try {
        const data =
          await receiptService.getReceipt(
            activeGymId,
            paymentId
          );

        setReceipt(data);
      } catch (error: any) {
        Alert.alert(
          'Receipt unavailable',
          error?.message ||
            'Please try again.'
        );
      } finally {
        setLoading(false);
      }
    }, [
      activeGymId,
      paymentId,
    ]);

  useEffect(() => {
    load();
  }, [load]);

  const sharePdf = async () => {
    if (!receipt) return;

    try {
      setSharing(true);
      await receiptService.sharePdf(
        receipt
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to share PDF',
        error?.message ||
          'Please try again.'
      );
    } finally {
      setSharing(false);
    }
  };

  const whatsapp = async () => {
    if (!receipt) return;

    try {
      await openWhatsApp(
        receipt.client.phoneE164 ||
          receipt.client.phone,
        receipt.gym.countryCode,
        receiptWhatsAppMessage(
          receipt
        )
      );
    } catch (error: any) {
      Alert.alert(
        'WhatsApp unavailable',
        error?.message ||
          'Check the member phone number.'
      );
    }
  };

  if (
    loading ||
    !receipt
  ) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={ui.color.brand}
        />
        <Text
          style={styles.loadingText}
        >
          Preparing receipt...
        </Text>
      </View>
    );
  }

  const {
    payment,
    client,
    gym,
    plan,
    membership,
  } = receipt;

  const voided =
    payment.status === 'Voided';

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
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
            label={payment.status.toUpperCase()}
            toneName={
              voided
                ? 'danger'
                : 'success'
            }
          />
        </View>

        <View
          style={styles.successIcon}
        >
          <Ionicons
            name={
              voided
                ? 'close'
                : 'checkmark'
            }
            size={31}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.eyebrow}>
          {voided
            ? 'VOIDED RECEIPT'
            : 'PAYMENT CONFIRMED'}
        </Text>

        <Text style={styles.heroTitle}>
          {formatMoney(
            payment.amount,
            gym.currencyCode
          )}
        </Text>

        <Text
          style={
            styles.receiptNumber
          }
        >
          {payment.receiptNumber}
        </Text>

        {!voided ? (
          <Text
            style={
              styles.heroSubtitle
            }
          >
            Membership payment was
            confirmed by the server.
          </Text>
        ) : null}
      </View>

      <SurfaceCard style={styles.card}>
        <SectionHeader
          title={client.name}
          subtitle={
            client.phone ||
            'Member receipt'
          }
        />

        <ReceiptRow
          label="Payment date"
          value={new Date(
            payment.paymentDate
          ).toLocaleDateString()}
        />

        <ReceiptRow
          label="Method"
          value={labelize(
            payment.paymentMethod
          )}
        />

        {payment.referenceNumber ? (
          <ReceiptRow
            label="Reference"
            value={
              payment.referenceNumber
            }
          />
        ) : null}

        {plan?.name ? (
          <ReceiptRow
            label="Membership"
            value={plan.name}
          />
        ) : null}

        {membership ? (
          <>
            <ReceiptRow
              label="Starts"
              value={new Date(
                membership.startDate
              ).toLocaleDateString()}
            />

            <ReceiptRow
              label="Valid until"
              value={new Date(
                membership.endDate
              ).toLocaleDateString()}
            />
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionHeader
          title="Payment breakdown"
          subtitle="Confirmed receipt values"
        />

        {plan ? (
          <ReceiptRow
            label={plan.name}
            value={formatMoney(
              plan.price,
              gym.currencyCode
            )}
          />
        ) : null}

        {payment.admissionFee > 0 ? (
          <ReceiptRow
            label="Admission fee"
            value={formatMoney(
              payment.admissionFee,
              gym.currencyCode
            )}
          />
        ) : null}

        {payment.discountAmount > 0 ? (
          <ReceiptRow
            label="Discount"
            value={`- ${formatMoney(
              payment.discountAmount,
              gym.currencyCode
            )}`}
            positive
          />
        ) : null}

        <View style={styles.totalBox}>
          <Text
            style={
              styles.totalLabel
            }
          >
            AMOUNT RECEIVED
          </Text>

          <Text
            style={
              styles.totalValue
            }
          >
            {formatMoney(
              payment.amount,
              gym.currencyCode
            )}
          </Text>
        </View>
      </SurfaceCard>

      {!voided ? (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={sharing}
            onPress={sharePdf}
            style={[
              styles.primaryButton,
              sharing &&
                styles.buttonDisabled,
            ]}
          >
            {sharing ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#FFFFFF"
                />
                <Text
                  style={
                    styles.primaryText
                  }
                >
                  Share PDF receipt
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={whatsapp}
            style={
              styles.whatsappButton
            }
          >
            <Ionicons
              name="logo-whatsapp"
              size={21}
              color={ui.color.success}
            />

            <Text
              style={
                styles.whatsappText
              }
            >
              Send on WhatsApp
            </Text>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.trustNote}>
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={
            voided
              ? ui.color.textMuted
              : ui.color.success
          }
        />

        <Text
          style={
            styles.trustText
          }
        >
          {voided
            ? 'This payment record is marked voided and should not be treated as an active receipt.'
            : 'This digital receipt reflects the payment record stored by the gym.'}
        </Text>
      </View>
    </ScrollView>
  );
};

const ReceiptRow = ({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>
      {label}
    </Text>

    <Text
      style={[
        styles.rowValue,
        positive &&
          styles.positive,
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
  hero: {
    backgroundColor: ui.color.brandStrong,
    borderRadius: ui.radius.xl,
    padding: ui.space.xl,
    alignItems: 'center',
    marginBottom: ui.space.md,
  },
  heroTop: {
    width: '100%',
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
  successIcon: {
    width: 61,
    height: 61,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 11,
  },
  eyebrow: {
    color: '#C7D2FE',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 4,
  },
  receiptNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: 10,
    marginTop: 7,
  },
  card: {
    padding: ui.space.lg,
    marginBottom: ui.space.md,
  },
  row: {
    minHeight: 46,
    borderTopWidth: 1,
    borderTopColor: ui.color.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ui.space.md,
  },
  rowLabel: {
    color: ui.color.textSecondary,
    fontSize: 10,
  },
  rowValue: {
    flex: 1,
    color: ui.color.text,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },
  positive: {
    color: ui.color.success,
  },
  totalBox: {
    minHeight: 70,
    backgroundColor: ui.color.brandSoft,
    borderRadius: ui.radius.md,
    paddingHorizontal: ui.space.md,
    marginTop: ui.space.md,
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
    fontSize: 23,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: ui.color.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ui.space.sm,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  whatsappButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: ui.color.successSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ui.space.sm,
    marginTop: ui.space.sm,
  },
  whatsappText: {
    color: ui.color.success,
    fontSize: 12,
    fontWeight: '900',
  },
  trustNote: {
    marginTop: ui.space.md,
    backgroundColor: ui.color.surfaceSubtle,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    gap: ui.space.sm,
    alignItems: 'flex-start',
  },
  trustText: {
    flex: 1,
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
  },
});

export default ReceiptScreen;