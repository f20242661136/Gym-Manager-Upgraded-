import fs from 'node:fs';

const fail = [];
const warn = [];

const requiredUrl = (
  name
) => {
  const value =
    process.env[name]?.trim();

  if (!value) {
    fail.push(
      `${name} is missing.`
    );
    return;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:'
    ) {
      fail.push(
        `${name} must use HTTPS for production.`
      );
    }
  } catch {
    fail.push(
      `${name} is not a valid URL.`
    );
  }
};

const requiredValue = (
  name
) => {
  if (!process.env[name]?.trim()) {
    fail.push(
      `${name} is missing.`
    );
  }
};

requiredValue(
  'EXPO_PUBLIC_SUPABASE_URL'
);
requiredValue(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
);
requiredUrl(
  'EXPO_PUBLIC_PRIVACY_POLICY_URL'
);
requiredUrl(
  'EXPO_PUBLIC_ACCOUNT_DELETION_URL'
);

if (
  process.env
    .EXPO_PUBLIC_SUPABASE_ANON_KEY
    ?.toLowerCase()
    .includes('service_role')
) {
  fail.push(
    'A Supabase service-role key must never be shipped in the mobile app.'
  );
}

const eas =
  JSON.parse(
    fs.readFileSync(
      'eas.json',
      'utf8'
    )
  );

if (
  eas?.build?.production
    ?.android?.buildType !==
  'app-bundle'
) {
  fail.push(
    'Production Android buildType must be app-bundle.'
  );
}

const app =
  JSON.parse(
    fs.readFileSync(
      'app.json',
      'utf8'
    )
  );

const sdkPackage =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8'
    )
  )?.dependencies?.expo;

if (
  !String(sdkPackage || '')
    .includes('54')
) {
  warn.push(
    'Verify targetSdkVersion is at least API 36 before Google Play submission.'
  );
}

if (
  !app?.expo?.android?.package
) {
  fail.push(
    'expo.android.package is missing.'
  );
}

if (
  !process.env
    .EXPO_PUBLIC_SENTRY_DSN
) {
  warn.push(
    'Sentry DSN is not configured; production crash upload is disabled.'
  );
}

if (
  !process.env.SENTRY_ORG ||
  !process.env.SENTRY_PROJECT ||
  !process.env.SENTRY_AUTH_TOKEN
) {
  warn.push(
    'Sentry source-map upload is not fully configured.'
  );
}

console.log('');
console.log(
  'Gym Management App release validation'
);
console.log(
  '-------------------------------------'
);

warn.forEach(message =>
  console.warn(
    `WARN: ${message}`
  )
);

if (fail.length) {
  fail.forEach(message =>
    console.error(
      `FAIL: ${message}`
    )
  );

  console.error('');
  console.error(
    `Release validation failed with ${fail.length} blocking issue(s).`
  );

  process.exit(1);
}

console.log('');
console.log(
  'Release validation passed.'
);
console.log(
  'Remember to verify Supabase migrations are fully remote before building production.'
);