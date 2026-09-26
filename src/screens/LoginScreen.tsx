import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { onboardingStorage } from '../services/onboardingStorage';
import {
  useAppearanceTheme,
} from '../theme/appearance';
import { AuthShell } from '../components/auth/AuthShell';
import { BrandMark } from '../components/auth/BrandMark';

type Stage =
  | 'boot'
  | 'onboarding'
  | 'signin'
  | 'signup'
  | 'forgot'
  | 'check-email';

const slides = [
  {
    icon: 'people-outline' as const,
    eyebrow: 'MEMBERSHIP DESK',
    title: 'Your gym,\nunder control.',
    body:
      'Members, memberships and fees in one clean workspace.',
    stat: '148',
    statLabel: 'active members',
  },
  {
    icon: 'scan-outline' as const,
    eyebrow: 'FAST ENTRY',
    title: 'A faster\nfront desk.',
    body:
      'Scan QR, verify membership and confirm entry in seconds.',
    stat: '< 3 sec',
    statLabel: 'target check-in',
  },
  {
    icon: 'receipt-outline' as const,
    eyebrow: 'PAYMENTS',
    title: 'Get paid.\nKeep proof.',
    body:
      'PKR / INR payments, receipts and WhatsApp sharing.',
    stat: 'Rs. 3,500',
    statLabel: 'receipt confirmed',
  },
];

const LoginScreen:
  React.FC = () => {
  const {
    signIn,
    signUp,
  } = useAuth();

  const theme =
    useAppearanceTheme();

  const [stage, setStage] =
    useState<Stage>('boot');

  const [slide, setSlide] =
    useState(0);

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    onboardingStorage
      .isComplete()
      .then(done => {
        setStage(
          done
            ? 'signin'
            : 'onboarding'
        );
      })
      .catch(() =>
        setStage('signin')
      );
  }, []);

  const normalizedEmail =
    email.trim().toLowerCase();

  const authError = (
    value: any
  ) => {
    const message =
      String(
        value?.message || ''
      ).toLowerCase();

    if (
      message.includes(
        'invalid login'
      ) ||
      message.includes(
        'invalid credentials'
      )
    ) {
      return 'Email or password is incorrect.';
    }

    if (
      message.includes(
        'already registered'
      ) ||
      message.includes(
        'already exists'
      )
    ) {
      return 'An account already exists for this email.';
    }

    if (
      message.includes('password')
    ) {
      return 'Check the password and try again.';
    }

    if (
      message.includes('email')
    ) {
      return 'Check the email address and try again.';
    }

    return (
      value?.message ||
      'Something went wrong. Please try again.'
    );
  };

  const validEmail =
    normalizedEmail.includes('@') &&
    normalizedEmail.includes('.');

  const submitSignIn =
    async () => {
      setError(null);

      if (!validEmail) {
        setError(
          'Enter a valid email address.'
        );
        return;
      }

      if (!password) {
        setError(
          'Enter your password.'
        );
        return;
      }

      try {
        setBusy(true);
        await signIn(
          normalizedEmail,
          password
        );
      } catch (value) {
        setError(
          authError(value)
        );
      } finally {
        setBusy(false);
      }
    };

  const submitSignUp =
    async () => {
      setError(null);

      if (!validEmail) {
        setError(
          'Enter a valid email address.'
        );
        return;
      }

      if (
        password.length < 8
      ) {
        setError(
          'Use at least 8 characters for your password.'
        );
        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          'Passwords do not match.'
        );
        return;
      }

      try {
        setBusy(true);

        await signUp(
          normalizedEmail,
          password
        );

        setStage(
          'check-email'
        );
      } catch (value) {
        setError(
          authError(value)
        );
      } finally {
        setBusy(false);
      }
    };

  const submitForgot =
    async () => {
      setError(null);

      if (!validEmail) {
        setError(
          'Enter the email address you use for Gym Manager.'
        );
        return;
      }

      try {
        setBusy(true);

        const {
          error: resetError,
        } =
          await supabase.auth
            .resetPasswordForEmail(
              normalizedEmail
            );

        if (resetError) {
          throw resetError;
        }

        setStage(
          'check-email'
        );
      } catch (value) {
        setError(
          authError(value)
        );
      } finally {
        setBusy(false);
      }
    };

  const completeOnboarding =
    async () => {
      await onboardingStorage
        .complete()
        .catch(() => {});

      setStage('signin');
    };

  const colors =
    theme.colors;

  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      backgroundColor:
        colors.input,
      borderColor:
        colors.inputBorder,
    },
  ];

  const authTitle =
    stage === 'signup'
      ? 'Create your account'
      : stage === 'forgot'
        ? 'Reset password'
        : 'Welcome back';

  const authSubtitle =
    stage === 'signup'
      ? 'Set up your login, then create or join your gym workspace.'
      : stage === 'forgot'
        ? "We'll send a reset link to your account email."
        : 'Run your gym with less admin.';

  if (stage === 'boot') {
    return (
      <AuthShell centered>
        <View
          style={
            styles.splash
          }
        >
          <BrandMark
            dark={theme.isDark}
          />

          <View
            style={
              styles.splashMark
            }
          >
            <View
              style={
                styles.splashInner
              }
            />
          </View>

          <Text
            style={[
              styles.splashTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Run your gym.
          </Text>

          <Text
            style={[
              styles.splashSubtitle,
              {
                color:
                  colors.secondary,
              },
            ]}
          >
            Without the paperwork.
          </Text>

          <ActivityIndicator
            color={colors.brand}
            style={{
              marginTop: 34,
            }}
          />
        </View>
      </AuthShell>
    );
  }

  if (
    stage ===
    'onboarding'
  ) {
    const item =
      slides[slide];

    return (
      <AuthShell>
        <View
          style={
            styles.onboardingTop
          }
        >
          <BrandMark
            dark={theme.isDark}
          />

          <TouchableOpacity
            accessibilityRole="button"
            onPress={
              completeOnboarding
            }
            style={
              styles.skipButton
            }
          >
            <Text
              style={{
                color:
                  colors.secondary,
                fontSize: 10,
                fontWeight: '900',
              }}
            >
              SKIP
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.visualCard,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={
              styles.visualIcon
            }
          >
            <Ionicons
              name={item.icon}
              size={34}
              color="#FFFFFF"
            />
          </View>

          <Text
            style={
              styles.visualStat
            }
          >
            {item.stat}
          </Text>

          <Text
            style={[
              styles.visualLabel,
              {
                color:
                  colors.secondary,
              },
            ]}
          >
            {item.statLabel}
          </Text>
        </View>

        <View
          style={
            styles.onboardingCopy
          }
        >
          <Text
            style={[
              styles.eyebrow,
              {
                color:
                  colors.brand,
              },
            ]}
          >
            {item.eyebrow}
          </Text>

          <Text
            style={[
              styles.onboardingTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {item.title}
          </Text>

          <Text
            style={[
              styles.body,
              {
                color:
                  colors.secondary,
              },
            ]}
          >
            {item.body}
          </Text>
        </View>

        <View
          style={styles.dots}
        >
          {slides.map(
            (_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index ===
                      slide
                        ? colors.brand
                        : colors.border,
                    width:
                      index ===
                      slide
                        ? 26
                        : 8,
                  },
                ]}
              />
            )
          )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            if (
              slide ===
              slides.length - 1
            ) {
              completeOnboarding();
            } else {
              setSlide(
                value =>
                  value + 1
              );
            }
          }}
          style={[
            styles.primary,
            {
              backgroundColor:
                colors.brand,
            },
          ]}
        >
          <Text
            style={
              styles.primaryText
            }
          >
            {slide ===
            slides.length - 1
              ? 'Get started'
              : 'Continue'}
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </AuthShell>
    );
  }

  if (
    stage ===
    'check-email'
  ) {
    return (
      <AuthShell centered>
        <View
          style={styles.authTop}
        >
          <BrandMark
            dark={theme.isDark}
          />
        </View>

        <View
          style={[
            styles.successCard,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={
              styles.successIcon
            }
          >
            <Ionicons
              name="mail-outline"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <Text
            style={[
              styles.successTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Check your inbox
          </Text>

          <Text
            style={[
              styles.successBody,
              {
                color:
                  colors.secondary,
              },
            ]}
          >
            We sent the next step to{' '}
            {normalizedEmail ||
              'your email address'}.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setPassword('');
              setConfirmPassword('');
              setStage('signin');
            }}
            style={[
              styles.primary,
              {
                backgroundColor:
                  colors.brand,
                marginTop: 24,
              },
            ]}
          >
            <Text
              style={
                styles.primaryText
              }
            >
              Back to sign in
            </Text>
          </TouchableOpacity>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <View style={styles.authTop}>
        <BrandMark
          dark={theme.isDark}
        />
      </View>

      <View style={styles.authHeading}>
        <Text
          style={[
            styles.authTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          {authTitle}
        </Text>

        <Text
          style={[
            styles.body,
            {
              color:
                colors.secondary,
            },
          ]}
        >
          {authSubtitle}
        </Text>
      </View>

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor:
                theme.isDark
                  ? '#3F1D24'
                  : '#FEF2F2',
              borderColor:
                theme.isDark
                  ? '#7F1D1D'
                  : '#FECACA',
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={colors.danger}
          />

          <Text
            style={[
              styles.errorText,
              {
                color:
                  colors.danger,
              },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.formCard,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              color:
                colors.secondary,
            },
          ]}
        >
          Email
        </Text>

        <View
          style={
            styles.inputWrap
          }
        >
          <Ionicons
            name="mail-outline"
            size={18}
            color={colors.muted}
            style={
              styles.inputIcon
            }
          />

          <TextInput
            value={email}
            onChangeText={value => {
              setEmail(value);
              setError(null);
            }}
            style={[
              inputStyle,
              styles.inputWithIcon,
            ]}
            placeholder="you@gym.com"
            placeholderTextColor={
              colors.muted
            }
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
        </View>

        {stage !== 'forgot' ? (
          <>
            <Text
              style={[
                styles.label,
                styles.labelSpace,
                {
                  color:
                    colors.secondary,
                },
              ]}
            >
              Password
            </Text>

            <View
              style={
                styles.inputWrap
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.muted}
                style={
                  styles.inputIcon
                }
              />

              <TextInput
                value={password}
                onChangeText={value => {
                  setPassword(value);
                  setError(null);
                }}
                style={[
                  inputStyle,
                  styles.inputWithIcon,
                  styles.inputWithAction,
                ]}
                placeholder={
                  stage ===
                  'signup'
                    ? 'At least 8 characters'
                    : 'Your password'
                }
                placeholderTextColor={
                  colors.muted
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType={
                  stage ===
                  'signup'
                    ? 'next'
                    : 'done'
                }
                onSubmitEditing={
                  stage ===
                  'signin'
                    ? submitSignIn
                    : undefined
                }
              />

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                onPress={() =>
                  setShowPassword(
                    value => !value
                  )
                }
                style={
                  styles.eyeButton
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={19}
                  color={
                    colors.secondary
                  }
                />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {stage === 'signup' ? (
          <>
            <Text
              style={[
                styles.label,
                styles.labelSpace,
                {
                  color:
                    colors.secondary,
                },
              ]}
            >
              Confirm password
            </Text>

            <TextInput
              value={
                confirmPassword
              }
              onChangeText={value => {
                setConfirmPassword(
                  value
                );
                setError(null);
              }}
              style={inputStyle}
              placeholder="Repeat password"
              placeholderTextColor={
                colors.muted
              }
              secureTextEntry={
                !showPassword
              }
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={
                submitSignUp
              }
            />

            <View
              style={
                styles.passwordHint
              }
            >
              <Ionicons
                name={
                  password.length >= 8
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={15}
                color={
                  password.length >= 8
                    ? colors.success
                    : colors.muted
                }
              />

              <Text
                style={{
                  color:
                    colors.secondary,
                  fontSize: 9,
                  fontWeight: '700',
                }}
              >
                At least 8 characters
              </Text>
            </View>
          </>
        ) : null}

        {stage === 'signin' ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setError(null);
              setStage('forgot');
            }}
            style={
              styles.forgotButton
            }
          >
            <Text
              style={[
                styles.linkText,
                {
                  color:
                    colors.brand,
                },
              ]}
            >
              Forgot password?
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{
            disabled: busy,
            busy,
          }}
          disabled={busy}
          onPress={
            stage === 'signup'
              ? submitSignUp
              : stage === 'forgot'
                ? submitForgot
                : submitSignIn
          }
          style={[
            styles.primary,
            {
              backgroundColor:
                colors.brand,
              opacity:
                busy
                  ? 0.65
                  : 1,
              marginTop: 20,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text
                style={
                  styles.primaryText
                }
              >
                {stage ===
                'signup'
                  ? 'Create account'
                  : stage ===
                      'forgot'
                    ? 'Send reset link'
                    : 'Sign in'}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={styles.switchRow}
      >
        <Text
          style={[
            styles.switchCopy,
            {
              color:
                colors.secondary,
            },
          ]}
        >
          {stage === 'signup'
            ? 'Already have an account?'
            : stage === 'forgot'
              ? 'Remembered your password?'
              : 'New to Gym Manager?'}
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setError(null);
            setPassword('');
            setConfirmPassword('');
            setStage(
              stage === 'signin'
                ? 'signup'
                : 'signin'
            );
          }}
        >
          <Text
            style={[
              styles.switchLink,
              {
                color:
                  colors.brand,
              },
            ]}
          >
            {stage === 'signin'
              ? 'Create an account'
              : 'Sign in'}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.trustCard,
          {
            backgroundColor:
              colors.surfaceSubtle,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={19}
          color={colors.success}
        />

        <Text
          style={[
            styles.trustText,
            {
              color:
                colors.secondary,
            },
          ]}
        >
          Your gym workspace is separated from other gyms and protected by your account access.
        </Text>
      </View>
    </AuthShell>
  );
};

const styles = StyleSheet.create({
  splash: {
    alignItems: 'center',
  },

  splashMark: {
    width: 92,
    height: 92,
    borderRadius: 29,
    backgroundColor: '#312E81',
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      {
        rotate: '8deg',
      },
    ],
  },

  splashInner: {
    width: 34,
    height: 34,
    borderWidth: 7,
    borderRadius: 9,
    borderColor: '#FFFFFF',
    transform: [
      {
        rotate: '37deg',
      },
    ],
  },

  splashTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 36,
    letterSpacing: -0.7,
  },

  splashSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },

  onboardingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  skipButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  visualCard: {
    height: 250,
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 44,
    padding: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },

  visualIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  visualStat: {
    color: '#4338CA',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 26,
  },

  visualLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },

  onboardingCopy: {
    marginTop: 38,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  onboardingTitle: {
    fontSize: 35,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 8,
  },

  body: {
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
    maxWidth: 330,
  },

  dots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 28,
    marginBottom: 22,
  },

  dot: {
    height: 8,
    borderRadius: 8,
  },

  primary: {
    minHeight: 56,
    borderRadius: 17,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  primaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  authTop: {
    marginBottom: 44,
  },

  authHeading: {
    marginBottom: 24,
  },

  authTitle: {
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  formCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },

  label: {
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 7,
  },

  labelSpace: {
    marginTop: 16,
  },

  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    fontSize: 13,
  },

  inputWithIcon: {
    paddingLeft: 43,
  },

  inputWithAction: {
    paddingRight: 48,
  },

  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
  },

  eyeButton: {
    position: 'absolute',
    right: 2,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  forgotButton: {
    alignSelf: 'flex-end',
    minHeight: 42,
    justifyContent: 'center',
  },

  linkText: {
    fontSize: 9,
    fontWeight: '900',
  },

  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },

  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 13,
  },

  errorText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '800',
  },

  switchRow: {
    alignItems: 'center',
    marginTop: 24,
  },

  switchCopy: {
    fontSize: 10,
  },

  switchLink: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 7,
  },

  trustCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 26,
  },

  trustText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
  },

  successCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 26,
    alignItems: 'center',
  },

  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 22,
  },

  successBody: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
});

export default LoginScreen;
