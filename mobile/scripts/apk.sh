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

npm run icons
npx expo prebuild --platform android --clean --no-install
(cd android && ./gradlew assembleRelease --console=plain)

mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk "release/Trellis-$VERSION-arm64.apk"
"$ANDROID_HOME/build-tools/37.0.0/apksigner" verify --print-certs "release/Trellis-$VERSION-arm64.apk" | head -3
ls -lh "release/Trellis-$VERSION-arm64.apk"
