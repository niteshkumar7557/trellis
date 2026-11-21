// A config plugin (docs/mobile.md §9): `expo prebuild` runs it each time it writes android/,
// so these settings live in the repo while android/ stays generated and git-ignored.
//
// 1. Release builds are signed with OUR key. As generated, React Native signs release
//    builds with the public debug key ("Caution! In production, you need to generate your
//    own keystore"); anyone could sign an "update" with that. The keystore and its passwords
//    come from mobile/.env (git-ignored), which scripts/apk.sh hands to Gradle as
//    TRELLIS_UPLOAD_* properties. If they're missing, the release build FAILS rather than
//    quietly using the debug key.
// 2. Only arm64-v8a is built: every phone sold in years is 64-bit ARM, and leaving out the
//    other three architectures roughly halves the APK.

const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

const SIGNING = `
        release {
            // From mobile/.env through scripts/apk.sh: see docs/mobile.md §9 (Signing).
            if (project.hasProperty('TRELLIS_UPLOAD_STORE_FILE')) {
                storeFile file(TRELLIS_UPLOAD_STORE_FILE)
                storePassword TRELLIS_UPLOAD_STORE_PASSWORD
                keyAlias TRELLIS_UPLOAD_KEY_ALIAS
                keyPassword TRELLIS_UPLOAD_KEY_PASSWORD
            }
        }`;

const GUARD = `
// Trellis: never ship a release signed with the debug key (plugins/with-release-signing.js).
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.toLowerCase().contains("release") } && !project.hasProperty('TRELLIS_UPLOAD_STORE_FILE')) {
        throw new GradleException("Release signing isn't set up: build with npm run apk, which reads mobile/.env (docs/mobile.md §9).")
    }
}
`;

/** The edit itself, as a pure function of build.gradle's text (tested: test/signing.test.ts). */
function addSigning(gradle) {
  if (gradle.includes("TRELLIS_UPLOAD_STORE_FILE")) return gradle; // already done
  // Add our signing config next to the debug one...
  gradle = gradle.replace(/signingConfigs \{\n(\s*debug \{[\s\S]*?\n\s*\})/, (m) => `${m}${SIGNING}`);
  // ...and point the release BUILD TYPE at it. Searched for after "buildTypes", so the
  // release block just added to signingConfigs isn't the one changed.
  const at = gradle.indexOf("buildTypes {");
  gradle = gradle.slice(0, at) + gradle.slice(at).replace(/(release \{[\s\S]*?)signingConfig signingConfigs\.debug/, "$1signingConfig signingConfigs.release");
  return gradle + GUARD;
}

function withReleaseSigning(config) {
  config = withAppBuildGradle(config, (c) => {
    c.modResults.contents = addSigning(c.modResults.contents);
    return c;
  });
  return withGradleProperties(config, (c) => {
    const props = c.modResults.filter((p) => !(p.type === "property" && p.key === "reactNativeArchitectures"));
    props.push({ type: "property", key: "reactNativeArchitectures", value: "arm64-v8a" });
    c.modResults = props;
    return c;
  });
}

module.exports = withReleaseSigning;
module.exports.addSigning = addSigning;
