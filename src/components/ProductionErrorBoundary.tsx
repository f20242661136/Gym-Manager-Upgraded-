import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { logger } from '../services/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ProductionErrorBoundary
  extends React.Component<
    Props,
    State
  > {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError():
    State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: React.ErrorInfo
  ) {
    logger.error(
      'Unhandled React render error',
      error,
      {
        componentStack:
          info.componentStack,
      }
    );
  }

  private tryAgain = () => {
    this.setState({
      hasError: false,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>
            SOMETHING WENT WRONG
          </Text>

          <Text style={styles.title}>
            The app hit an unexpected
            error.
          </Text>

          <Text style={styles.body}>
            Your data was not
            intentionally changed by
            this error. Try opening
            the screen again. If the
            problem continues, contact
            support.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={this.tryAgain}
          >
            <Text
              style={
                styles.buttonText
              }
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: ui.color.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ui.color.border,
    padding: 22,
  },
  eyebrow: {
    color: ui.color.danger,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: ui.color.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 7,
  },
  body: {
    color: ui.color.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  button: {
    minHeight: 49,
    borderRadius: 14,
    backgroundColor: ui.color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});