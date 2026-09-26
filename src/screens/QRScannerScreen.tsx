import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  AccessibilityInfo,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useGym } from '../contexts/GymContext';
import { useNetworkStatus } from '../hook/useNetworkStatus';
import { attendanceService } from '../services/attendanceService';
import { ui } from '../ui/theme';

type Result =
  | {
      kind:
        | 'success'
        | 'warning'
        | 'error';
      title: string;
      detail: string;
    }
  | null;

const QRScannerScreen:
  React.FC = () => {
  const navigation =
    useNavigation<any>();

  const { activeGymId } =
    useGym();

  const isConnected =
    useNetworkStatus();

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [locked, setLocked] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [result, setResult] =
    useState<Result>(null);

  const lastValue =
    useRef<string | null>(null);

  const parseToken = (
    data: string
  ) => {
    const value = data.trim();

    const appQr = value.match(
      /^gymapp:member:([0-9a-fA-F-]{36})$/
    );

    if (appQr) {
      return appQr[1];
    }

    if (
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
        value
      )
    ) {
      return value;
    }

    return null;
  };

  const speak = (
    title: string,
    detail: string
  ) => {
    AccessibilityInfo
      .announceForAccessibility(
        `${title}. ${detail}`
      );
  };

  const handleScan = async ({
    data,
  }: {
    data: string;
  }) => {
    if (
      locked ||
      processing ||
      !activeGymId ||
      !isConnected ||
      lastValue.current === data
    ) {
      return;
    }

    const token =
      parseToken(data);

    setLocked(true);
    setProcessing(true);
    lastValue.current = data;

    if (!token) {
      const next = {
        kind: 'error' as const,
        title: 'Not a member card',
        detail:
          'This QR is not a Gym Management member card.',
      };

      setResult(next);
      Vibration.vibrate([
        0,
        60,
        70,
        60,
      ]);
      speak(
        next.title,
        next.detail
      );
      setProcessing(false);
      return;
    }

    try {
      const response =
        await attendanceService.checkInByQr(
          activeGymId,
          token
        );

      const next =
        response.duplicate
          ? {
              kind:
                'warning' as const,
              title:
                response.client.name,
              detail:
                'Already checked in. No duplicate visit was created.',
            }
          : {
              kind:
                'success' as const,
              title:
                response.client.name,
              detail:
                'Check-in confirmed.',
            };

      setResult(next);

      if (
        next.kind === 'success'
      ) {
        Vibration.vibrate(45);
      } else {
        Vibration.vibrate([
          0,
          35,
          50,
          35,
        ]);
      }

      speak(
        next.title,
        next.detail
      );
    } catch (error: any) {
      const next = {
        kind: 'error' as const,
        title: 'Entry blocked',
        detail:
          error?.message ||
          'Membership could not be validated.',
      };

      setResult(next);

      Vibration.vibrate([
        0,
        60,
        70,
        60,
      ]);

      speak(
        next.title,
        next.detail
      );
    } finally {
      setProcessing(false);
    }
  };

  const scanNext = () => {
    lastValue.current = null;
    setResult(null);
    setLocked(false);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={ui.color.brand}
        />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={
          styles.permissionPage
        }
      >
        <View
          style={
            styles.permissionIcon
          }
        >
          <Ionicons
            name="camera-outline"
            size={34}
            color={ui.color.brand}
          />
        </View>

        <Text
          style={
            styles.permissionTitle
          }
        >
          Camera access
        </Text>

        <Text
          style={
            styles.permissionText
          }
        >
          Camera access is only used to
          scan member QR cards at the
          front desk.
        </Text>

        <TouchableOpacity
          style={
            styles.permissionButton
          }
          onPress={requestPermission}
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            Allow camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={styles.backLinkText}
          >
            Back to attendance
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View
        style={
          styles.permissionPage
        }
      >
        <View
          style={[
            styles.permissionIcon,
            styles.offlineIcon,
          ]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={34}
            color={ui.color.warning}
          />
        </View>

        <Text
          style={
            styles.permissionTitle
          }
        >
          QR check-in is offline
        </Text>

        <Text
          style={
            styles.permissionText
          }
        >
          Membership must be validated
          by the server before entry is
          confirmed. Reconnect and scan
          again.
        </Text>

        <TouchableOpacity
          style={
            styles.permissionButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            Back to attendance
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <CameraView
        style={
          StyleSheet.absoluteFill
        }
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={
          locked
            ? undefined
            : handleScan
        }
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            style={
              styles.closeButton
            }
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="close"
              size={23}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View
            style={styles.topCopy}
          >
            <Text
              style={styles.topTitle}
            >
              Scan member
            </Text>
            <Text
              style={
                styles.topSubtitle
              }
            >
              Membership is validated
              before entry
            </Text>
          </View>

          <View
            style={
              styles.closeSpacer
            }
          />
        </View>

        <View
          style={styles.scannerArea}
        >
          <View
            style={[
              styles.scanFrame,
              result?.kind ===
                'success' &&
                styles.frameSuccess,
              result?.kind ===
                'warning' &&
                styles.frameWarning,
              result?.kind ===
                'error' &&
                styles.frameError,
            ]}
          >
            <View
              style={[
                styles.corner,
                styles.topLeft,
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.topRight,
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.bottomLeft,
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.bottomRight,
              ]}
            />

            {processing ? (
              <View
                style={
                  styles.processingOverlay
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#FFFFFF"
                />
                <Text
                  style={
                    styles.processingText
                  }
                >
                  Validating...
                </Text>
              </View>
            ) : null}
          </View>

          {!result ? (
            <Text style={styles.scanHint}>
              Hold the member QR inside
              the frame
            </Text>
          ) : null}
        </View>

        {result ? (
          <View
            style={[
              styles.resultCard,
              result.kind ===
                'success' &&
                styles.resultSuccess,
              result.kind ===
                'warning' &&
                styles.resultWarning,
              result.kind ===
                'error' &&
                styles.resultError,
            ]}
          >
            <View
              style={[
                styles.resultIcon,
                result.kind ===
                  'success' &&
                  styles.resultIconSuccess,
                result.kind ===
                  'warning' &&
                  styles.resultIconWarning,
                result.kind ===
                  'error' &&
                  styles.resultIconError,
              ]}
            >
              <Ionicons
                name={
                  result.kind ===
                  'success'
                    ? 'checkmark'
                    : result.kind ===
                        'warning'
                      ? 'information'
                      : 'close'
                }
                size={27}
                color="#FFFFFF"
              />
            </View>

            <Text
              style={
                styles.resultEyebrow
              }
            >
              {result.kind ===
              'success'
                ? 'ENTRY CONFIRMED'
                : result.kind ===
                    'warning'
                  ? 'ALREADY INSIDE'
                  : 'ENTRY BLOCKED'}
            </Text>

            <Text
              style={
                styles.resultTitle
              }
            >
              {result.title}
            </Text>

            <Text
              style={
                styles.resultDetail
              }
            >
              {result.detail}
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={scanNext}
              style={styles.nextButton}
            >
              <Ionicons
                name="scan-outline"
                size={19}
                color="#FFFFFF"
              />
              <Text
                style={
                  styles.nextText
                }
              >
                Scan next member
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              style={
                styles.finishButton
              }
            >
              <Text
                style={
                  styles.finishText
                }
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bottomNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text
              style={
                styles.bottomNoteText
              }
            >
              Only confirmed server
              check-ins are recorded.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.color.canvas,
  },
  permissionPage: {
    flex: 1,
    backgroundColor: ui.color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineIcon: {
    backgroundColor: ui.color.warningSoft,
  },
  permissionTitle: {
    color: ui.color.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },
  permissionText: {
    color: ui.color.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },
  permissionButton: {
    minHeight: 52,
    minWidth: 190,
    marginTop: 22,
    backgroundColor: ui.color.brand,
    borderRadius: ui.radius.md,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  backLink: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 5,
  },
  backLinkText: {
    color: ui.color.brand,
    fontSize: 11,
    fontWeight: '900',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
    justifyContent: 'space-between',
    padding: 18,
  },
  topBar: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSpacer: {
    width: 46,
  },
  topCopy: {
    flex: 1,
    alignItems: 'center',
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  topSubtitle: {
    color: '#E2E8F0',
    fontSize: 9,
    marginTop: 2,
  },
  scannerArea: {
    alignItems: 'center',
  },
  scanFrame: {
    width: 270,
    height: 270,
    position: 'relative',
    borderRadius: 28,
  },
  frameSuccess: {
    backgroundColor: 'rgba(4,120,87,0.20)',
  },
  frameWarning: {
    backgroundColor: 'rgba(180,83,9,0.20)',
  },
  frameError: {
    backgroundColor: 'rgba(185,28,28,0.20)',
  },
  corner: {
    width: 52,
    height: 52,
    position: 'absolute',
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 22,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 22,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 22,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 22,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 9,
  },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 17,
  },
  bottomNote: {
    alignSelf: 'center',
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bottomNoteText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  resultCard: {
    backgroundColor: ui.color.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: ui.color.border,
  },
  resultSuccess: {
    borderColor: ui.color.successBorder,
  },
  resultWarning: {
    borderColor: ui.color.warningBorder,
  },
  resultError: {
    borderColor: ui.color.dangerBorder,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconSuccess: {
    backgroundColor: ui.color.success,
  },
  resultIconWarning: {
    backgroundColor: ui.color.warning,
  },
  resultIconError: {
    backgroundColor: ui.color.danger,
  },
  resultEyebrow: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 12,
  },
  resultTitle: {
    color: ui.color.text,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  resultDetail: {
    color: ui.color.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  nextButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: ui.color.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  finishButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  finishText: {
    color: ui.color.textSecondary,
    fontSize: 10,
    fontWeight: '900',
  },
});

export default QRScannerScreen;