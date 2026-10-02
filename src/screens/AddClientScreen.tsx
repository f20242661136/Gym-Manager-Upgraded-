import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
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
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import { api } from '../services/api';
import type { Client } from '../types';
import {
  pickImage,
  takePhoto,
} from '../utils/imagePicker';
import { useNetworkStatus } from '../hook/useNetworkStatus';
import { useLiveData } from '../contexts/LiveDataContext';
import {
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../ui/components';
import { ui } from '../ui/theme';

type FormData = {
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  chest: string;
  waist: string;
};

const AddClientScreen: React.FC = () => {
  const navigation =
    useNavigation<any>();

  const route = useRoute<any>();

  const isEditing =
    Boolean(
      route.params?.isEditing
    );

  const existingClient:
    Client | undefined =
      route.params?.client;

  const isConnected =
    useNetworkStatus();

  const {
    refreshNow,
  } = useLiveData();

  const returnFromForm = () => {
    if (
      isEditing &&
      navigation.canGoBack?.()
    ) {
      navigation.goBack();
      return;
    }

    const state =
      navigation.getState?.();

    const hasClientsList =
      state?.routes?.some(
        (item: any) =>
          item.name ===
          'ClientsList'
      );

    if (
      hasClientsList &&
      typeof navigation.popTo ===
        'function'
    ) {
      navigation.popTo(
        'ClientsList'
      );
      return;
    }

    navigation.navigate(
      'ClientsList'
    );
  };

  const [isLoading, setIsLoading] =
    useState(false);

  const [photoUri, setPhotoUri] =
    useState(
      existingClient?.photoUrl || ''
    );

  const [
    showOptional,
    setShowOptional,
  ] = useState(
    Boolean(
      existingClient?.age ||
      existingClient?.gender
    )
  );

  const [
    showMeasurements,
    setShowMeasurements,
  ] = useState(
    Boolean(
      existingClient?.weight ||
      existingClient?.height ||
      existingClient?.chest ||
      existingClient?.waist
    )
  );

  const [formError, setFormError] =
    useState<string | null>(null);

  const [
    formData,
    setFormData,
  ] = useState<FormData>({
    name:
      existingClient?.name || '',
    phone:
      existingClient?.phone || '',
    email:
      existingClient?.email || '',
    age:
      existingClient?.age
        ? String(existingClient.age)
        : '',
    gender:
      existingClient?.gender || '',
    weight:
      existingClient?.weight
        ? String(
            existingClient.weight
          )
        : '',
    height:
      existingClient?.height
        ? String(
            existingClient.height
          )
        : '',
    chest:
      existingClient?.chest
        ? String(
            existingClient.chest
          )
        : '',
    waist:
      existingClient?.waist
        ? String(
            existingClient.waist
          )
        : '',
  });

  const setField = (
    field: keyof FormData,
    value: string
  ) => {
    setFormError(null);

    setFormData(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const bmi = useMemo(() => {
    const weight =
      Number(formData.weight);

    const height =
      Number(formData.height);

    if (
      !Number.isFinite(weight) ||
      !Number.isFinite(height) ||
      weight <= 0 ||
      height <= 0
    ) {
      return null;
    }

    const meters = height / 100;

    return weight / (meters * meters);
  }, [
    formData.height,
    formData.weight,
  ]);

  const validate = () => {
    if (!formData.name.trim()) {
      return 'Enter the member name.';
    }

    if (!formData.phone.trim()) {
      return 'Enter a phone number.';
    }

    if (
      formData.email.trim() &&
      !formData.email.includes('@')
    ) {
      return 'Enter a valid email or leave email empty.';
    }

    const age =
      formData.age.trim()
        ? Number(formData.age)
        : 0;

    if (
      age &&
      (age < 10 || age > 100)
    ) {
      return 'Age should be between 10 and 100.';
    }

    const weight =
      formData.weight.trim()
        ? Number(formData.weight)
        : 0;

    if (
      weight &&
      (weight < 20 || weight > 300)
    ) {
      return 'Check the weight value.';
    }

    const height =
      formData.height.trim()
        ? Number(formData.height)
        : 0;

    if (
      height &&
      (height < 80 || height > 250)
    ) {
      return 'Check the height value.';
    }

    return null;
  };

  const choosePhoto = () => {
    Alert.alert(
      'Member photo',
      'Choose a photo source.',
      [
        {
          text: 'Take photo',
          onPress: async () => {
            const uri =
              await takePhoto();

            if (uri) {
              setPhotoUri(uri);
            }
          },
        },
        {
          text: 'Choose photo',
          onPress: async () => {
            const uri =
              await pickImage();

            if (uri) {
              setPhotoUri(uri);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const submit = async () => {
    const validation =
      validate();

    if (validation) {
      setFormError(validation);
      return;
    }

    setIsLoading(true);

    try {
      let finalPhotoUrl =
        photoUri;

      let finalPhotoPath:
        string | null =
        existingClient
          ?.photoPath || null;

      let skippedOfflinePhoto =
        false;

      let photoUploadFailed =
        false;

      if (
        photoUri &&
        !photoUri.startsWith('http')
      ) {
        if (!isConnected) {
          finalPhotoUrl =
            existingClient
              ?.photoUrl || '';

          skippedOfflinePhoto = true;
        } else {
          const fileName =
            `client_${Date.now()}.jpg`;

          try {
            const uploadedPhoto =
              await api.uploadImage(
                photoUri,
                fileName
              );

            finalPhotoUrl =
              uploadedPhoto.url;

            finalPhotoPath =
              uploadedPhoto.path;
          } catch (
            photoError: any
          ) {
            console.warn(
              'Member photo upload skipped:',
              photoError?.message ||
                photoError
            );

            finalPhotoUrl =
              existingClient
                ?.photoUrl || '';

            photoUploadFailed =
              true;
          }
        }
      }

      const weight =
        Number(formData.weight) || 0;

      const height =
        Number(formData.height) || 0;

      const today = new Date();

      const registrationDate =
        existingClient
          ?.registrationDate ||
        `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, '0')}-${String(
          today.getDate()
        ).padStart(2, '0')}`;

      const clientData:
        Omit<Client, 'id'> = {
          name:
            formData.name.trim(),
          phone:
            formData.phone.trim(),
          email:
            formData.email
              .trim()
              .toLowerCase(),
          age:
            Number(formData.age) ||
            0,
          gender:
            formData.gender.trim(),
          weight,
          height,
          chest:
            Number(formData.chest) ||
            0,
          waist:
            Number(formData.waist) ||
            0,
          bmi:
            weight > 0 &&
            height > 0
              ? weight /
                Math.pow(
                  height / 100,
                  2
                )
              : 0,
          photoUrl:
            finalPhotoUrl,
          photoPath:
            finalPhotoPath,
          membershipStatus:
            existingClient
              ?.membershipStatus ||
            'Unpaid',
          registrationDate,
          membershipDueDate:
            existingClient
              ?.membershipDueDate ||
            '',
          serverUpdatedAt:
            existingClient
              ?.serverUpdatedAt ||
            null,
          syncVersion:
            existingClient
              ?.syncVersion ||
            null,
          syncState:
            existingClient
              ?.syncState ||
            'synced',
        };

      let result: Client;

      if (
        isEditing &&
        existingClient
      ) {
        result =
          await api.updateClient(
            existingClient.id,
            {
              ...clientData,
              id: existingClient.id,
            },
            isConnected
          );
      } else {
        result =
          await api.addClient(
            clientData,
            isConnected
          );
      }

      refreshNow();

      const offline =
        result.syncState ===
        'pending';

      const title = offline
        ? 'Saved offline'
        : isEditing
          ? 'Member updated'
          : 'Member added';

      let message = offline
        ? 'The member is saved on this device and will sync when the connection returns.'
        : isEditing
          ? 'Member details were updated.'
          : 'The member profile is ready.';

      if (skippedOfflinePhoto) {
        message +=
          '\n\nThe new photo was not uploaded because the device is offline. You can add it after reconnecting.';
      }

      if (photoUploadFailed) {
        message +=
          '\n\nThe member was saved, but the new profile photo could not be uploaded. Existing photo data was preserved where possible.';
      }

      Alert.alert(
        title,
        message,
        [
          {
            text: 'Done',
            onPress:
              returnFromForm,
          },
        ]
      );
    } catch (error: any) {
      console.error(
        'Member save failed:',
        error
      );

      setFormError(
        error?.message ||
          `Unable to ${
            isEditing
              ? 'update'
              : 'add'
          } this member.`
      );
    } finally {
      setIsLoading(false);
    }
  };

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
              onPress={
                returnFromForm
              }
              style={
                styles.backButton
              }
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <StatusPill
              label={
                isEditing
                  ? 'EDIT PROFILE'
                  : 'NEW MEMBER'
              }
              toneName="brand"
            />
          </View>

          <Text style={styles.heroTitle}>
            {isEditing
              ? 'Update member'
              : 'Add member'}
          </Text>

          <Text
            style={
              styles.heroSubtitle
            }
          >
            Start with the essentials.
            Optional profile and body
            details can be added now or
            later.
          </Text>
        </View>

        {formError ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={ui.color.danger}
            />
            <Text
              style={styles.errorText}
            >
              {formError}
            </Text>
          </View>
        ) : null}

        <SurfaceCard
          style={styles.photoCard}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Choose member photo"
            onPress={choosePhoto}
            style={styles.photoButton}
          >
            {photoUri ? (
              <Image
                source={{
                  uri: photoUri,
                }}
                style={styles.photo}
              />
            ) : (
              <View
                style={
                  styles.photoPlaceholder
                }
              >
                <Ionicons
                  name="camera-outline"
                  size={25}
                  color={
                    ui.color.brand
                  }
                />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.photoCopy}>
            <Text
              style={
                styles.photoTitle
              }
            >
              Member photo
            </Text>
            <Text
              style={
                styles.photoSubtitle
              }
            >
              Optional. Useful for quick
              recognition at reception.
            </Text>

            <View
              style={styles.photoActions}
            >
              <TouchableOpacity
                onPress={choosePhoto}
                style={
                  styles.smallButton
                }
              >
                <Text
                  style={
                    styles.smallButtonText
                  }
                >
                  {photoUri
                    ? 'Change'
                    : 'Add photo'}
                </Text>
              </TouchableOpacity>

              {photoUri ? (
                <TouchableOpacity
                  onPress={() =>
                    setPhotoUri('')
                  }
                  style={
                    styles.removeButton
                  }
                >
                  <Text
                    style={
                      styles.removeText
                    }
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <SectionHeader
            title="Essentials"
            subtitle="The information reception needs most."
          />

          <Field
            label="Full name"
            required
            value={formData.name}
            onChangeText={value =>
              setField(
                'name',
                value
              )
            }
            placeholder="Ali Raza"
            autoCapitalize="words"
          />

          <Field
            label="Phone"
            required
            value={formData.phone}
            onChangeText={value =>
              setField(
                'phone',
                value
              )
            }
            placeholder="0300 1234567"
            keyboardType="phone-pad"
          />

          <Field
            label="Email"
            value={formData.email}
            onChangeText={value =>
              setField(
                'email',
                value
              )
            }
            placeholder="Optional"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </SurfaceCard>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() =>
            setShowOptional(
              value => !value
            )
          }
          style={styles.disclosure}
        >
          <View
            style={
              styles.disclosureIcon
            }
          >
            <Ionicons
              name="person-outline"
              size={19}
              color={ui.color.brand}
            />
          </View>

          <View
            style={
              styles.disclosureCopy
            }
          >
            <Text
              style={
                styles.disclosureTitle
              }
            >
              Personal details
            </Text>
            <Text
              style={
                styles.disclosureSubtitle
              }
            >
              Age and gender - optional
            </Text>
          </View>

          <Ionicons
            name={
              showOptional
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={20}
            color={ui.color.textMuted}
          />
        </TouchableOpacity>

        {showOptional ? (
          <SurfaceCard
            style={styles.card}
          >
            <View style={styles.twoCol}>
              <View style={styles.flex}>
                <Field
                  label="Age"
                  value={
                    formData.age
                  }
                  onChangeText={value =>
                    setField(
                      'age',
                      value
                    )
                  }
                  placeholder="25"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.flex}>
                <Text style={styles.label}>
                  Gender
                </Text>

                <View
                  style={styles.genderRow}
                >
                  {[
                    'Male',
                    'Female',
                    'Other',
                  ].map(option => {
                    const selected =
                      formData.gender ===
                      option;

                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() =>
                          setField(
                            'gender',
                            selected
                              ? ''
                              : option
                          )
                        }
                        style={[
                          styles.genderChip,
                          selected &&
                            styles.genderChipOn,
                        ]}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            selected &&
                              styles.genderTextOn,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </SurfaceCard>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() =>
            setShowMeasurements(
              value => !value
            )
          }
          style={styles.disclosure}
        >
          <View
            style={
              styles.disclosureIcon
            }
          >
            <Ionicons
              name="fitness-outline"
              size={19}
              color={ui.color.brand}
            />
          </View>

          <View
            style={
              styles.disclosureCopy
            }
          >
            <Text
              style={
                styles.disclosureTitle
              }
            >
              Body measurements
            </Text>
            <Text
              style={
                styles.disclosureSubtitle
              }
            >
              Weight, height, chest and
              waist - optional
            </Text>
          </View>

          <Ionicons
            name={
              showMeasurements
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={20}
            color={ui.color.textMuted}
          />
        </TouchableOpacity>

        {showMeasurements ? (
          <SurfaceCard
            style={styles.card}
          >
            <View style={styles.twoCol}>
              <View style={styles.flex}>
                <Field
                  label="Weight (kg)"
                  value={
                    formData.weight
                  }
                  onChangeText={value =>
                    setField(
                      'weight',
                      value
                    )
                  }
                  placeholder="75"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.flex}>
                <Field
                  label="Height (cm)"
                  value={
                    formData.height
                  }
                  onChangeText={value =>
                    setField(
                      'height',
                      value
                    )
                  }
                  placeholder="175"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {bmi ? (
              <View
                style={
                  styles.bmiSummary
                }
              >
                <View>
                  <Text
                    style={
                      styles.bmiLabel
                    }
                  >
                    CALCULATED BMI
                  </Text>

                  <Text
                    style={
                      styles.bmiValue
                    }
                  >
                    {bmi.toFixed(1)}
                  </Text>
                </View>

                <Text
                  style={
                    styles.bmiHint
                  }
                >
                  Stored with the member
                  profile
                </Text>
              </View>
            ) : null}

            <View style={styles.twoCol}>
              <View style={styles.flex}>
                <Field
                  label="Chest (cm)"
                  value={
                    formData.chest
                  }
                  onChangeText={value =>
                    setField(
                      'chest',
                      value
                    )
                  }
                  placeholder="Optional"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.flex}>
                <Field
                  label="Waist (cm)"
                  value={
                    formData.waist
                  }
                  onChangeText={value =>
                    setField(
                      'waist',
                      value
                    )
                  }
                  placeholder="Optional"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </SurfaceCard>
        ) : null}

        {!isConnected ? (
          <View style={styles.offlineNote}>
            <Ionicons
              name="cloud-offline-outline"
              size={18}
              color={
                ui.color.warning
              }
            />
            <Text
              style={
                styles.offlineText
              }
            >
              Offline: member profile
              changes can be queued, but
              a new photo cannot upload
              until you reconnect.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            isEditing
              ? 'Save member changes'
              : 'Add member'
          }
          disabled={isLoading}
          onPress={submit}
          style={[
            styles.primaryButton,
            isLoading &&
              styles.primaryDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <>
              <Ionicons
                name={
                  isEditing
                    ? 'checkmark-circle-outline'
                    : 'person-add-outline'
                }
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.primaryText
                }
              >
                {isEditing
                  ? 'Save changes'
                  : 'Add member'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          Membership plan and fee can be
          added after the member profile
          is created.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Field = ({
  label,
  required = false,
  ...props
}: {
  label: string;
  required?: boolean;
} & React.ComponentProps<
  typeof TextInput
>) => (
  <View style={styles.field}>
    <Text style={styles.label}>
      {label}
      {required ? (
        <Text style={styles.required}>
          {' '}*
        </Text>
      ) : null}
    </Text>

    <TextInput
      {...props}
      style={styles.input}
      placeholderTextColor={
        ui.color.textMuted
      }
    />
  </View>
);

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },

  content: {
    padding: ui.space.lg,
    paddingBottom: 42,
  },

  hero: {
    backgroundColor:
      ui.color.brandStrong,
    borderRadius: ui.radius.xl,
    padding: ui.space.xl,
    marginBottom: ui.space.md,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
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

  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: ui.type.bodySm,
    lineHeight: 17,
    marginTop: ui.space.xs,
  },

  errorBox: {
    backgroundColor:
      ui.color.dangerSoft,
    borderWidth: 1,
    borderColor:
      ui.color.dangerBorder,
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

  photoCard: {
    padding: ui.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ui.space.md,
  },

  photoButton: {
    width: 76,
    height: 76,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: ui.space.md,
  },

  photo: {
    width: '100%',
    height: '100%',
  },

  photoPlaceholder: {
    flex: 1,
    backgroundColor:
      ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoCopy: {
    flex: 1,
  },

  photoTitle: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
  },

  photoSubtitle: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  photoActions: {
    flexDirection: 'row',
    gap: ui.space.sm,
    marginTop: ui.space.sm,
  },

  smallButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor:
      ui.color.brandSoft,
    justifyContent: 'center',
  },

  smallButtonText: {
    color: ui.color.brand,
    fontSize: 9,
    fontWeight: '900',
  },

  removeButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor:
      ui.color.dangerSoft,
    justifyContent: 'center',
  },

  removeText: {
    color: ui.color.danger,
    fontSize: 9,
    fontWeight: '900',
  },

  card: {
    padding: ui.space.lg,
    marginBottom: ui.space.md,
  },

  field: {
    marginBottom: ui.space.md,
  },

  label: {
    color: ui.color.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 7,
  },

  required: {
    color: ui.color.danger,
  },

  input: {
    minHeight: ui.touch.min,
    borderWidth: 1,
    borderColor: ui.color.border,
    backgroundColor:
      ui.color.surfaceSubtle,
    borderRadius: ui.radius.md,
    paddingHorizontal: ui.space.md,
    paddingVertical: 11,
    color: ui.color.text,
    fontSize: 13,
  },

  disclosure: {
    minHeight: 64,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ui.space.md,
  },

  disclosureIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor:
      ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ui.space.md,
  },

  disclosureCopy: {
    flex: 1,
  },

  disclosureTitle: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },

  disclosureSubtitle: {
    color: ui.color.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },

  twoCol: {
    flexDirection: 'row',
    gap: ui.space.sm,
  },

  flex: {
    flex: 1,
  },

  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  genderChip: {
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: ui.radius.pill,
    borderWidth: 1,
    borderColor: ui.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  genderChipOn: {
    backgroundColor:
      ui.color.brandSoft,
    borderColor:
      ui.color.brandBorder,
  },

  genderText: {
    color: ui.color.textSecondary,
    fontSize: 9,
    fontWeight: '800',
  },

  genderTextOn: {
    color: ui.color.brand,
  },

  bmiSummary: {
    backgroundColor:
      ui.color.successSoft,
    borderWidth: 1,
    borderColor:
      ui.color.successBorder,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: ui.space.md,
  },

  bmiLabel: {
    color: ui.color.success,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  bmiValue: {
    color: ui.color.success,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },

  bmiHint: {
    maxWidth: 150,
    textAlign: 'right',
    color: ui.color.success,
    fontSize: 9,
    lineHeight: 13,
  },

  offlineNote: {
    backgroundColor:
      ui.color.warningSoft,
    borderWidth: 1,
    borderColor:
      ui.color.warningBorder,
    borderRadius: ui.radius.md,
    padding: ui.space.md,
    flexDirection: 'row',
    gap: ui.space.sm,
    alignItems: 'flex-start',
    marginBottom: ui.space.md,
  },

  offlineText: {
    flex: 1,
    color: ui.color.warning,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '700',
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

  primaryDisabled: {
    opacity: 0.65,
  },

  primaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  footerHint: {
    color: ui.color.textMuted,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    paddingHorizontal: ui.space.lg,
    marginTop: ui.space.sm,
  },
});

export default AddClientScreen;