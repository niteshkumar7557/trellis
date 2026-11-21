#!/usr/bin/env bash
# Build the signed release APK (docs/mobile.md §9): icons from the SVG mark, a fresh
# android/ from app.config.ts, then Gradle. Run from mobile/: npm run apk
set -euo pipefail
cd "$(dirname "$0")/.."

# The development switches must never reach a release: an EXPO_PUBLIC_API_URL left in the
# shell would point every student's app at a laptop.
unset EXPO_PUBLIC_API_URL EXPO_PUBLIC_SITE_URL

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
# Gradle wants JDK 17 (the Homebrew one); the Mac's default Java is 25.
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"

VERSION=$(node -p "require('./package.json').version")
CONFIG_VERSION=$(grep -E '^const VERSION = ' app.config.ts | sed -E 's/.*"(.*)".*/\1/')
if [ "$VERSION" != "$CONFIG_VERSION" ]; then
  echo "package.json says $VERSION but app.config.ts says $CONFIG_VERSION: make them the same." >&2
  exit 1
fi

# The release signing key, from mobile/.env (git-ignored; docs/mobile.md §9). The keystore
# is stored there as base64 text, so it's written to a temporary file for this build only
# and deleted when the script ends, however it ends. Gradle reads ORG_GRADLE_PROJECT_<name>
# environment variables as project properties, which is what
# plugins/with-release-signing.js looks for; nothing secret goes on a command line, where
# other programs could see it in the process list.
if [ ! -f .env ]; then
  echo "mobile/.env is missing: it holds the release signing key (docs/mobile.md §9)." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
KEYSTORE=$(mktemp -t trellis-keystore)
trap 'rm -f "$KEYSTORE"' EXIT
chmod 600 "$KEYSTORE"
printf '%s' "$TRELLIS_UPLOAD_KEYSTORE_BASE64" | base64 -d > "$KEYSTORE"
export ORG_GRADLE_PROJECT_TRELLIS_UPLOAD_STORE_FILE="$KEYSTORE"
export ORG_GRADLE_PROJECT_TRELLIS_UPLOAD_KEY_ALIAS="$TRELLIS_UPLOAD_KEY_ALIAS"
export ORG_GRADLE_PROJECT_TRELLIS_UPLOAD_STORE_PASSWORD="$TRELLIS_UPLOAD_STORE_PASSWORD"
export ORG_GRADLE_PROJECT_TRELLIS_UPLOAD_KEY_PASSWORD="$TRELLIS_UPLOAD_KEY_PASSWORD"
unset TRELLIS_UPLOAD_KEYSTORE_BASE64 TRELLIS_UPLOAD_STORE_PASSWORD TRELLIS_UPLOAD_KEY_PASSWORD

npm run icons
npx expo prebuild --platform android --clean --no-install
(cd android && ./gradlew assembleRelease --console=plain)

mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk "release/Trellis-$VERSION-arm64.apk"
"$ANDROID_HOME/build-tools/37.0.0/apksigner" verify --print-certs "release/Trellis-$VERSION-arm64.apk" | head -3
ls -lh "release/Trellis-$VERSION-arm64.apk"
