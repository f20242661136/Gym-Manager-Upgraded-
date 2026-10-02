Set-Location "D:\GymManagementApp\GymManagementApp"

$root = (Get-Location).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "D:\GymManagementApp\_GymManagementAppBackups\perf-nav-dashboard-$stamp"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$targets = @(
    "src\navigation\AppNavigator.tsx",
    "src\screens\AddClientScreen.tsx",
    "src\screens\ClientsScreen.tsx",
    "src\screens\DashboardScreen.tsx",
    "src\ui\components.tsx"
)

foreach ($relative in $targets) {
    $source = Join-Path $root $relative
    if (-not (Test-Path $source)) {
        throw "Missing file: $source"
    }

    $safeName = $relative.Replace("\", "__")
    Copy-Item $source (Join-Path $backupDir $safeName)
}

function Replace-Exact {
    param(
        [string]$Path,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    $text = [System.IO.File]::ReadAllText($Path)
    $normalized = $text.Replace("`r`n", "`n")

    if (-not $normalized.Contains($Old)) {
        throw "Patch block not found: $Label"
    }

    $normalized = $normalized.Replace($Old, $New)
    $final = $normalized.Replace("`n", "`r`n")
    [System.IO.File]::WriteAllText($Path, $final, $utf8)

    Write-Host "Patched: $Label" -ForegroundColor Green
}

$navPath = Join-Path $root "src\navigation\AppNavigator.tsx"
$addPath = Join-Path $root "src\screens\AddClientScreen.tsx"
$clientsPath = Join-Path $root "src\screens\ClientsScreen.tsx"
$dashPath = Join-Path $root "src\screens\DashboardScreen.tsx"
$uiPath = Join-Path $root "src\ui\components.tsx"

# 1) Stop focus/blur from forcibly remounting screens.
# Apply a live-data revision only when that screen is actually focused.
$old = @'
    const {
      revision,
    } = useLiveData();

    const isFocused =
      useIsFocused();

    return (
      <Component
        key={
          `${revision}-${isFocused ? 'focused' : 'blurred'}`
        }
        {...props}
      />
    );
'@

$new = @'
    const {
      revision,
    } = useLiveData();

    const isFocused =
      useIsFocused();

    const [
      appliedRevision,
      setAppliedRevision,
    ] = React.useState(
      revision
    );

    React.useEffect(() => {
      if (
        isFocused &&
        appliedRevision !== revision
      ) {
        setAppliedRevision(
          revision
        );
      }
    }, [
      appliedRevision,
      isFocused,
      revision,
    ]);

    return (
      <Component
        key={`live-${appliedRevision}`}
        {...props}
      />
    );
'@

Replace-Exact $navPath $old $new "AppNavigator live refresh"

# 2) AddClient: explicit route back to ClientsList + invalidate live data after save.
$old = @'
import { useNetworkStatus } from '../hook/useNetworkStatus';
import {
  SectionHeader,
'@

$new = @'
import { useNetworkStatus } from '../hook/useNetworkStatus';
import { useLiveData } from '../contexts/LiveDataContext';
import {
  SectionHeader,
'@

Replace-Exact $addPath $old $new "AddClient live-data import"

$old = @'
  const isConnected =
    useNetworkStatus();

  const [isLoading, setIsLoading] =
'@

$new = @'
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
'@

Replace-Exact $addPath $old $new "AddClient safe return helper"

$old = @'
      const offline =
        result.syncState ===
        'pending';
'@

$new = @'
      refreshNow();

      const offline =
        result.syncState ===
        'pending';
'@

Replace-Exact $addPath $old $new "AddClient refresh after save"

$old = @'
            text: 'Done',
            onPress: () =>
              navigation.goBack(),
'@

$new = @'
            text: 'Done',
            onPress:
              returnFromForm,
'@

Replace-Exact $addPath $old $new "AddClient success navigation"

$old = @'
              onPress={() =>
                navigation.goBack()
              }
'@

$new = @'
              onPress={
                returnFromForm
              }
'@

Replace-Exact $addPath $old $new "AddClient back button"

# 3) Clients: show cached data immediately, then refresh in background.
$old = @'
import { api } from '../services/api';
'@

$new = @'
import { api } from '../services/api';
import { storage } from '../services/storage';
'@

Replace-Exact $clientsPath $old $new "Clients cache import"

$old = @'
  useEffect(() => {
    loadClients();
  }, [loadClients]);
'@

$new = @'
  useEffect(() => {
    let mounted = true;

    const hydrateThenRefresh =
      async () => {
        try {
          const cached =
            await storage.getClients();

          if (
            mounted &&
            cached.length > 0
          ) {
            setClients(cached);
            setIsLoading(false);
          }
        } catch (cacheError) {
          console.warn(
            'Member cache hydrate failed:',
            cacheError
          );
        }

        if (mounted) {
          await loadClients();
        }
      };

    hydrateThenRefresh();

    return () => {
      mounted = false;
    };
  }, [loadClients]);
'@

Replace-Exact $clientsPath $old $new "Clients cache-first loading"

# 4) Dashboard: cache-first startup and keep KPI cards horizontal.
$old = @'
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
'@

$new = @'
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
'@

Replace-Exact $dashPath $old $new "Dashboard remove width-forced vertical mode"

$old = @'
import { api } from '../services/api';
'@

$new = @'
import { api } from '../services/api';
import { storage } from '../services/storage';
'@

Replace-Exact $dashPath $old $new "Dashboard cache import"

$old = @'
  const navigation = useNavigation<any>();
  const { activeGym } = useGym();
  const { width, fontScale } = useWindowDimensions();
  const compactMetrics = width < 390 || fontScale >= 1.25;
'@

$new = @'
  const navigation = useNavigation<any>();
  const { activeGym } = useGym();
'@

Replace-Exact $dashPath $old $new "Dashboard compact metric trigger"

$old = @'
  useEffect(() => {
    load();
  }, [load]);
'@

$new = @'
  useEffect(() => {
    let mounted = true;

    const hydrateThenRefresh =
      async () => {
        try {
          const [
            cachedClients,
            cachedPayments,
          ] = await Promise.all([
            storage.getClients(),
            storage.getPayments(),
          ]);

          if (
            mounted &&
            (
              cachedClients.length > 0 ||
              cachedPayments.length > 0
            )
          ) {
            const sortedClients =
              [...cachedClients].sort(
                (a, b) =>
                  new Date(
                    b.registrationDate
                  ).getTime() -
                  new Date(
                    a.registrationDate
                  ).getTime()
              );

            const sortedPayments =
              [...cachedPayments].sort(
                (a, b) =>
                  new Date(
                    b.paymentDate
                  ).getTime() -
                  new Date(
                    a.paymentDate
                  ).getTime()
              );

            setStats({
              totalClients:
                cachedClients.length,
              paidClients:
                cachedClients.filter(
                  client =>
                    client
                      .membershipStatus ===
                    'Paid'
                ).length,
              unpaidClients:
                cachedClients.filter(
                  client =>
                    client
                      .membershipStatus ===
                    'Unpaid'
                ).length,
            });

            setRecentClients(
              sortedClients.slice(0, 5)
            );

            setRecentPayments(
              sortedPayments.slice(0, 5)
            );

            setIsLoading(false);
          }
        } catch (cacheError) {
          console.warn(
            'Dashboard cache hydrate failed:',
            cacheError
          );
        }

        if (mounted) {
          await load();
        }
      };

    hydrateThenRefresh();

    return () => {
      mounted = false;
    };
  }, [load]);
'@

Replace-Exact $dashPath $old $new "Dashboard cache-first loading"

$old = @'
      <View
        style={[
          styles.metricGrid,
          compactMetrics && styles.metricGridCompact,
        ]}
      >
'@

$new = @'
      <View style={styles.metricGrid}>
'@

Replace-Exact $dashPath $old $new "Dashboard KPI horizontal layout"

$old = @'
              navigation.navigate(
                'Clients',
                { screen: 'AddClient' }
              )
'@

$new = @'
              navigation.navigate(
                'Clients',
                {
                  screen: 'AddClient',
                  initial: false,
                }
              )
'@

Replace-Exact $dashPath $old $new "Dashboard Add Member navigation history"

$old = @'

  metricGridCompact: {
    flexDirection: 'column',
  },
'@

$new = ""

Replace-Exact $dashPath $old $new "Dashboard remove vertical KPI mode"

# 5) Make those dashboard KPI cards denser.
$old = @'
  metricCard: {
    flex: 1,
    minHeight: 139,
    padding: ui.space.lg,
  },
'@

$new = @'
  metricCard: {
    flex: 1,
    minHeight: 112,
    padding: ui.space.md,
  },
'@

Replace-Exact $uiPath $old $new "MetricCard compact height"

$old = @'
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ui.space.md,
  },
'@

$new = @'
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ui.space.sm,
  },
'@

Replace-Exact $uiPath $old $new "MetricCard compact icon"

Write-Host "`nBackup created at:" -ForegroundColor Cyan
Write-Host $backupDir -ForegroundColor Cyan

Write-Host "`n=== TYPECHECK ===" -ForegroundColor Cyan
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "TypeScript failed. Restore from backup before continuing."
}

Write-Host "`n=== EXPO DOCTOR ===" -ForegroundColor Cyan
npx expo-doctor

Write-Host "`nPatch complete." -ForegroundColor Green
Write-Host "Now test Dashboard <-> Members switching, Add Member back/save, and cold restart." -ForegroundColor Green
