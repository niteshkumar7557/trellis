# React Native: design record

Status: **built, 15 Nov 2026** (`shared/data/react-native.ts`, branch
`feature/subject-react-native`). Stages 1 to 5 done; round 1 of the plan review reported
(8 of 14 reviewers) and was triaged into the file. **Shortened at the owner's request
(15 Nov 2026: "finish this React Native in this session only")**: the owner's plan sign-off
(stage 6's Ask), review round 2 (stage 8) and the screenshots of stage 9 were not done;
the stage 7 and 10 gates were (tests, `npm run subject`, frontend checks, the seed and the
integration tests). **Still to do:** a file-stage round with the three-reviewer panel
(blueprint §5), and looking at the map in the browser (§11).
Versions: **React Native 0.88** (19 Oct 2026), **React 19.3**, **Expo SDK 58** (15 Oct 2026,
ships React Native 0.88).

This is a **redesign from scratch**. The first React Native curriculum (live until this one
replaces it) took its topic names and grouping from roadmap.sh. This one is designed from
official sources (docs/subject-blueprint.md), and the roadmap.sh credit goes. Topic ids may
change: production holds only the owner's trial data, so a reset is fine (owner, 14 Nov
2026). Where a new topic means the same as an old one, it keeps the old id.

## Sources

Every page below was opened during the session (by the session or a `web-fetch` agent
reading the primary page); search snippets were used only as leads.

| Job | Source | URL | Version | Checked |
|---|---|---|---|---|
| What exists, what is current | React Native release posts 0.81 to 0.88 | https://reactnative.dev/blog (0.81: /2025/08/12/react-native-0.81; 0.82: /2025/10/08/…; 0.83: /2025/12/10/…; 0.84: /2026/02/11/…; 0.85: /2026/04/07/…; 0.86: /2026/06/11/…; 0.87: /2026/08/11/…; 0.88: /2026/10/19/…) | 0.81 to 0.88 | 15 Nov 2026 |
| What exists, what is current | React Native docs, Guides sidebar, Components and APIs | https://reactnative.dev/docs/getting-started, /docs/components-and-apis, /docs/environment-setup and one page per sidebar section | 0.88 ("last updated Oct 27, 2026") | 15 Nov 2026 |
| What exists, what is current | Expo changelog, SDK 54 to 58 | https://expo.dev/changelog/sdk-54 … /sdk-58 | SDK 58 (15 Oct 2026) | 15 Nov 2026 |
| What exists, what is current | Expo docs page map | https://docs.expo.dev/llms.txt (the docs' own full page map; its tail came back summarised, marked in Coverage) | SDK 58 | 15 Nov 2026 |
| What exists, what is current | React versions; React Compiler | https://react.dev/versions, https://react.dev/blog | React 19.3 (9 Sep 2026); Compiler 1.0 (7 Oct 2025) | 15 Nov 2026 |
| What exists, what is current | React Navigation | https://reactnavigation.org/docs/getting-started, https://reactnavigation.org/blog | 7.x stable; 8.0 still alpha (latest post 8 Jul 2026) | 15 Nov 2026 |
| What exists, what is current | Library status: AsyncStorage, MMKV, Reanimated, RNTL, NativeWind, TanStack Query | https://react-native-async-storage.github.io/3.0/migration-to-3 (lead), https://github.com/mrousavy/react-native-mmkv, https://docs.swmansion.com/react-native-reanimated/, https://oss.callstack.com/react-native-testing-library/, https://www.nativewind.dev/, https://tanstack.com/query/latest/docs/framework/react/react-native | AsyncStorage 3.x; MMKV 4; Reanimated 4; RNTL 14; NativeWind 4 stable, 5 pre-release | 15 Nov 2026 |
| Scope | **No official certification exists.** Meta (which maintains React Native) offers none; the third-party "certifications" found (StudySection, Edchart) are not the maker's | search, 15 Nov 2026 | none | 15 Nov 2026 |
| Scope | Meta React Native Specialization (Coursera): the maker's own course, 8 courses, 35 modules | https://www.coursera.org/specializations/meta-react-native and each course page | no version named; Expo, function components, AsyncStorage, Expo-SQLite | 15 Nov 2026 |
| Scope and order | Expo tutorial (StickerSmash), 8 chapters | https://docs.expo.dev/tutorial/introduction/ | SDK 58 | 15 Nov 2026 |
| Scope and order | React Native docs, "The Basics" (a linear path) | https://reactnative.dev/docs/getting-started | 0.88 | 15 Nov 2026 |
| Scope (prerequisite) | React docs, Learn | https://react.dev/llms.txt (the Learn table of contents) | React 19.3 | 15 Nov 2026 |
| Order | Meta course module order; Expo tutorial order; React Learn order; the "needs" test | as above | | 15 Nov 2026 |
| Core and stuck | State of React Native 2025 (Software Mansion; 3,501 responses, Dec 2024 to Jan 2025): pain points per area | https://results.stateofreactnative.com/en-US/ (opinions, navigation, styling, animations, debugging-and-profiling, build-and-publish, platform-apis, testing-and-monitoring, component-libraries) | 2025 edition (latest published) | 15 Nov 2026 |
| Core and stuck | Official troubleshooting: React Native, Expo (overview, common development errors), React Navigation | https://reactnative.dev/docs/troubleshooting, https://docs.expo.dev/troubleshooting/overview/, https://docs.expo.dev/workflow/common-development-errors/, https://reactnavigation.org/docs/troubleshooting | 0.88; SDK 58; 7.x | 15 Nov 2026 |
| Core and stuck | Expo's guides that name the usual traps: keyboard handling, safe areas, system bars, environment variables, store data, authentication, protected routes | https://docs.expo.dev/guides/keyboard-handling/ (3 Nov 2026), /develop/user-interface/safe-areas/, /system-bars/, /guides/environment-variables/, /develop/user-interface/store-data/, /develop/authentication/, /router/advanced/authentication/, /router/advanced/protected/ | SDK 58 | 15 Nov 2026 |
| What working people use | State of React Native 2025: libraries, architecture, dev tools, testing, build and publish | as above (libraries, react-native-architecture, dev-tools) | 2025 | 15 Nov 2026 |
| What working people use | State of React 2025 (unofficial): state management, data loading | https://2025.stateofreact.com/en-US/libraries/state-management/, …/data-loading/ | 2025 | 15 Nov 2026 |
| What working people use | Expo's own recommendations: navigation, animation, unit testing, color themes, CNG, using libraries | https://docs.expo.dev/develop/app-navigation/, /develop/user-interface/animation/, /develop/unit-testing/, /develop/user-interface/color-themes/, /workflow/continuous-native-generation/, /workflow/using-libraries/ | SDK 58 | 15 Nov 2026 |
| Security practice | React Native docs, Security; Networking | https://reactnative.dev/docs/security, /docs/network | 0.88 | 15 Nov 2026 |

**Stack Overflow** (added 15 Nov 2026, after round 1 started): the page itself refuses
automated fetches, so the 98 most-voted `react-native` questions were read through the
Stack Exchange API (`api.stackexchange.com/2.3/questions?sort=votes&tagged=react-native`,
run with the owner's permission). Most date from 2015 to 2019, so they show lasting pain
rather than current APIs; they agree with the survey and the troubleshooting pages. Rows
P31 to P44 group them by theme, with vote counts.

## What changed recently

From the release posts and changelogs above. **Bold** = a curriculum must not show the old
way as current.

**React Native 0.81 to 0.88 (Aug 2025 to Oct 2026)**

- **The New Architecture is the only architecture** from 0.82 (`newArchEnabled=false` is
  ignored); legacy code removed step by step in 0.84, 0.85 and 0.87. The old "bridge"
  belongs in history, not in a lesson.
- **Hermes V1 is the default engine** (0.84). **Built-in JavaScriptCore removed** (0.81;
  a community package now).
- **`<SafeAreaView>` deprecated** (0.81): use react-native-safe-area-context.
- **`ImageBackground` deprecated** (0.87): a View with an absolutely positioned Image.
- **`InteractionManager` removed** (0.87): `requestIdleCallback`.
- **`StatusBar` `backgroundColor` and `translucent` removed** (0.87); Android 16 is
  edge-to-edge with no opt-out (0.81), so the app draws under the system bars and must
  respect safe areas.
- **`StyleSheet.absoluteFillObject` removed** (0.85): `StyleSheet.absoluteFill`.
- `Modal`'s `animated` prop removed; boolean `keyboardShouldPersistTaps` removed (0.87).
- `DrawerLayoutAndroid` deprecated (0.87); iOS `InputAccessoryView` deprecated (0.88) for
  react-native-keyboard-controller's `KeyboardStickyView`.
- **Jest preset moved** to `@react-native/jest-preset` (0.85). React's **test renderer is
  deprecated** (Expo unit-testing page; React Native Testing Library replaces it).
- **Strict TypeScript API is the default** (0.87): deep imports into
  `react-native/Libraries/*` are type errors. TypeScript is the norm: 676 of 928 survey
  respondents write 100% TypeScript; the default template is TypeScript.
- React Native DevTools gained Network and Performance panels and a desktop app (0.83);
  the standalone react-devtools connection was removed (0.87). It is the debugger now
  (95% of survey respondents use it).
- React 19.2 (`<Activity>`, `useEffectEvent`) in 0.83; React 19.3 in 0.88.
- 0.88: web-style event dispatching (no user-facing change), variable fonts, iOS
  SceneDelegate (Xcode 27 requires the scene lifecycle).
- Swift Package Manager is experimental (0.87), planned default in 0.89; CocoaPods to be
  removed later. A curriculum should not hang a topic on `pod install`.
- The docs now **recommend a framework (Expo)** to start; "without a framework" (the
  Community CLI) is for apps with special constraints.

**Expo SDK 54 to 58 (Sep 2025 to Oct 2026)**

- **SDK 54 was the last with the Legacy Architecture.**
- **`expo-av` is gone** (no patches from SDK 55): `expo-audio` and `expo-video`.
- **Expo Go is "a playground for students and learners"**; real projects use a
  **development build**. Push notifications in Expo Go on Android throw an error (SDK 55).
- **Expo Router no longer builds on React Navigation** (SDK 56): app code may not import
  `@react-navigation/*`. Protected routes (`Stack.Protected`) are the auth pattern; data
  loaders, server rendering and middleware are stable (SDK 58).
- The default template: Expo Router, routes in `src/app`, native tabs, Reanimated,
  react-native-safe-area-context, TypeScript.
- `expo-file-system`'s object API (`File`, `Directory`) is the default (SDK 54); the old one
  is at `/legacy`.
- `@expo/vector-icons` is being replaced by `@react-native-vector-icons/*` (SDK 56).
- `expo/fetch` is the default `fetch` (SDK 56).
- Hermes bytecode diffing for over-the-air updates by default (SDK 56).
- `expo prebuild` regenerates the native folders by default (SDK 57): native changes go in
  config plugins (Continuous Native Generation; "managed vs bare" and "ejecting" are
  deprecated words).
- **EAS is now "Expo Services"** in the docs (Expo Build, Expo Submit, Expo Update); the
  `eas` commands and `eas.json` keep their names. Topic names use what students will type:
  "EAS Build" is what the commands and most search results say.
- Expo UI (SwiftUI and Jetpack Compose components) is stable (SDK 56).

**Libraries**

- React Navigation 7.x is the stable line; 8.0 is alpha (React 19, native bottom tabs).
- AsyncStorage 3.x: storage instances must be created before use ("scoped storages").
- MMKV 4 (a Nitro module). Reanimated 4 (needs react-native-worklets and the New
  Architecture). React Native Testing Library 14 (queries by role first).
- NativeWind: 4 stable, 5 pre-release (42% of survey respondents use it; StyleSheet 90%).
- End-to-end testing: Maestro (46% of respondents) has overtaken Detox (26%); Expo's docs
  and CI tutorial use Maestro.

## Coverage

The inventory (stage 3): every item the sources list, one row each, and where it went.
"Went to" is filled in stage 5.

Counted against the sources:

| Source | Rows | Ids |
|---|---|---|
| React Native docs, Guides sidebar (12 sections, every page) and the Architecture section (added in triage, round 1) | 82 | D1 to D82 |
| React Native Core Components (sidebar, incl. Android and iOS groups) | 24 | C1 to C24 |
| React Native APIs (sidebar, incl. Hooks, Android, iOS groups) | 35 | A1 to A35 |
| Expo docs (page level for learner guides, group level for the services and reference; see note) | 120 | X1 to X120 |
| Expo tutorial chapters | 8 | T1 to T8 |
| Meta React Native Specialization modules (8 courses) | 35 | M1 to M35 |
| React Learn (the prerequisite), pages | 37 | R1 to R37 |
| Learner pain (survey pain points, troubleshooting pages, Stack Overflow, review round 1) | 48 | P1 to P48 |
| What working people use (survey, State of React) | 22 | U1 to U22 |
| **Total** | **411** | |

**Note on Expo's two levels.** Expo's docs are far bigger than the subject (they document
a company's whole product line). They are inventoried page by page where a learner reads
them (Get started, Develop, Review, Deploy, Linking, Push notifications, Expo Router's
Router 101 and Navigation patterns, the tutorial) and group by group elsewhere (Router
Advanced, Web and Reference; the Modules API; Integrations; each Expo service; the AI and
agentic-workflow sections; the SDK reference).

### React Native docs, Guides and Architecture (0.88)

| # | Section | Page | Went to |
|---|---|---|---|
| D1 | The Basics | Introduction | rn-what |
| D2 | The Basics | Core Components and Native Components | rn-what, rn-view |
| D3 | The Basics | React Fundamentals | rn-components, rn-props, rn-state |
| D4 | The Basics | Handling Text Input | rn-textinput |
| D5 | The Basics | Using a ScrollView | rn-scrollview |
| D6 | The Basics | Using List Views | rn-flatlist, rn-sectionlist |
| D7 | The Basics | Troubleshooting | rn-metro, rn-device (their mistakes) |
| D8 | The Basics | Platform-Specific Code | rn-platform-module, rn-file-ext |
| D9 | The Basics | More Resources | left out: a page of links |
| D10 | Environment setup | Get Started with React Native | rn-expo |
| D11 | Environment setup | Set Up Your Environment | rn-device, rn-cli |
| D12 | Environment setup | Integration with Existing Apps | rn-brownfield |
| D13 | Environment setup | Integration with an Android Fragment | left out: brownfield, Android only |
| D14 | Environment setup | Building For TV Devices (deprecated) | left out: deprecated in the docs |
| D15 | Environment setup | Out-of-Tree Platforms | left out: Windows, macOS and other platforms; the web is in rn-web |
| D16 | Workflow | Running On Device | rn-device |
| D17 | Workflow | Fast Refresh | rn-fast-refresh |
| D18 | Workflow | Metro | rn-metro |
| D19 | Workflow | Using Libraries | rn-libraries |
| D20 | Workflow | Using TypeScript | rn-typescript |
| D21 | Workflow | Strict TypeScript API | rn-typescript (deep imports), rn-upgrading |
| D22 | Workflow | Release Levels | left out: release channels for contributors |
| D23 | Workflow | Upgrading to New Versions | rn-upgrading |
| D24 | UI & Interaction | Style | rn-stylesheets |
| D25 | UI & Interaction | Height and Width | rn-flexbox, rn-dimensions |
| D26 | UI & Interaction | Layout with Flexbox | rn-flexbox |
| D27 | UI & Interaction | Images | rn-image |
| D28 | UI & Interaction | Color Reference | rn-stylesheets (a reference list, folded) |
| D29 | UI & Interaction › Interaction | Handling Touches | rn-pressable, rn-button |
| D30 | UI & Interaction › Interaction | Navigating Between Screens | rn-react-navigation, rn-routes |
| D31 | UI & Interaction › Interaction | Animations | rn-animated, rn-reanimated |
| D32 | UI & Interaction › Interaction | Gesture Responder System | rn-gestures (the low-level system; apps use Gesture Handler) |
| D33 | UI & Interaction › Connectivity | Networking | rn-fetch, rn-websockets, rn-net-security |
| D34 | UI & Interaction › Connectivity | Security | rn-secrets, rn-securestore, rn-net-security, rn-oauth |
| D35 | UI & Interaction › Inclusion | Accessibility | rn-a11y |
| D36 | Debugging | Debugging Basics | rn-devmenu, rn-logbox |
| D37 | Debugging | React Native DevTools | rn-devtools |
| D38 | Debugging | Debugging Native Code | rn-native-debug |
| D39 | Debugging | Debugging Release Builds | rn-crash |
| D40 | Debugging | Other Debugging Methods | rn-devtools (folded) |
| D41 | Testing | Testing | rn-jest, rn-rntl, rn-maestro, rn-detox |
| D42 | Performance | Performance Overview | rn-framerate, rn-perf-sources, rn-memo, rn-release-local ("always test performance in release builds") |
| D43 | Performance | Speeding up your Build phase | rn-build-speed |
| D44 | Performance | Optimizing FlatList Configuration | rn-flatlist-perf, rn-memo |
| D45 | Performance | Optimizing JavaScript loading | rn-startup |
| D46 | Performance | Profiling | rn-profiling |
| D47 | JavaScript Runtime | JavaScript Environment | rn-how, rn-async |
| D48 | JavaScript Runtime | Timers | rn-effects (clearing timers, folded) |
| D49 | JavaScript Runtime | Using Hermes | rn-hermes |
| D50 | Codegen | What is Codegen? | rn-turbo-modules |
| D51 | Codegen | Using Codegen | rn-turbo-modules |
| D52 | Codegen | The Codegen CLI | rn-turbo-modules |
| D53 | Native Development | Introduction | rn-expo-modules, rn-turbo-modules |
| D54 | Native Development › Modules | Android and iOS (Turbo Native Modules) | rn-turbo-modules |
| D55 | Native Development › Modules | Cross-Platform with C++ | left out: C++ modules; niche, past every goal |
| D56 | Native Development › Modules | Advanced Topics | rn-turbo-modules (folded) |
| D57 | Native Development › Components | Android & iOS (Fabric Native Components) | rn-native-views |
| D58 | Native Development › Components | Advanced Topics | rn-native-views |
| D59 | Native Development | Miscellaneous (appendix) | left out: a reference appendix |
| D60 | Android and iOS › Android | Headless JS | rn-background |
| D61 | Android and iOS › Android | Publishing to Google Play Store | rn-playstore |
| D62 | Android and iOS › Android | Communication between native and React Native | rn-brownfield |
| D63 | Android and iOS › Android | React Native Gradle Plugin | left out: native build internals |
| D64 | Android and iOS › iOS | Linking Libraries | rn-libraries (autolinking, folded) |
| D65 | Android and iOS › iOS | Running On Simulator | rn-device |
| D66 | Android and iOS › iOS | Communication between native and React Native | rn-brownfield |
| D67 | Android and iOS › iOS | App Extensions | left out: iOS app extensions and widgets; past every goal |
| D68 | Android and iOS › iOS | Publishing to Apple App Store | rn-appstore |
| D69 | Legacy Architecture › Native Modules | Native Modules Intro | left out: the Legacy Architecture is gone since 0.82; rn-how mentions it as history |
| D70 | Legacy Architecture › Native Modules | Android Native Modules | left out: the Legacy Architecture is gone since 0.82; rn-how mentions it as history |
| D71 | Legacy Architecture › Native Modules | iOS Native Modules | left out: the Legacy Architecture is gone since 0.82; rn-how mentions it as history |
| D72 | Legacy Architecture › Native Modules | Native Modules NPM Package Setup | left out: the Legacy Architecture is gone since 0.82; rn-how mentions it as history |
| D73 | Legacy Architecture › Native Modules | Local libraries setup | left out: the Legacy Architecture is gone since 0.82; rn-how mentions it as history |
| D74 | Legacy Architecture | Native Components | left out: the Legacy Architecture is gone since 0.82; rn-how mentions it as history |
| D75 | Architecture | Overview | rn-how, rn-jsi |
| D76 | Architecture | Fabric | rn-fabric |
| D77 | Architecture | Render, Commit, and Mount | rn-fabric |
| D78 | Architecture | Threading Model | rn-threads |
| D79 | Architecture | View Flattening | rn-fabric |
| D80 | Architecture | Cross Platform Implementation | rn-fabric (folded) |
| D81 | Architecture | Bundled Hermes | rn-hermes |
| D82 | Architecture | Glossary | left out: a reference list |

### React Native Core Components (0.88)

| # | Component | Went to |
|---|---|---|
| C1 | ActivityIndicator | rn-loading |
| C2 | Button | rn-button |
| C3 | FlatList | rn-flatlist, rn-pagination (onEndReached) |
| C4 | Image | rn-image |
| C5 | ImageBackground (deprecated 0.87) | left out: deprecated 0.87 (rn-image's mistakes name it) |
| C6 | KeyboardAvoidingView | rn-keyboard-avoid |
| C7 | Modal | rn-modal |
| C8 | Pressable | rn-pressable |
| C9 | RefreshControl | rn-refresh |
| C10 | ScrollView | rn-scrollview |
| C11 | SectionList | rn-sectionlist |
| C12 | StatusBar | rn-statusbar |
| C13 | Switch | rn-pickers |
| C14 | Text | rn-text |
| C15 | TextInput | rn-textinput |
| C16 | TouchableHighlight | rn-touchables |
| C17 | TouchableOpacity | rn-touchables |
| C18 | TouchableWithoutFeedback | rn-touchables |
| C19 | View | rn-view |
| C20 | VirtualizedList | rn-flatlist-perf (the base of FlatList, folded) |
| C21 | DrawerLayoutAndroid (deprecated 0.87) | left out: deprecated 0.87; drawers are in rn-drawer |
| C22 | TouchableNativeFeedback (Android) | rn-touchables |
| C23 | InputAccessoryView (iOS, deprecated 0.88) | left out: deprecated 0.88; rn-keyboard-controller replaces it |
| C24 | SafeAreaView (deprecated 0.81) | rn-safearea (the library's, not the deprecated core one) |

### React Native APIs (0.88)

| # | API | Went to |
|---|---|---|
| A1 | AccessibilityInfo | rn-a11y |
| A2 | Alert | rn-modal |
| A3 | Animated | rn-animated |
| A4 | Animated.Value | rn-animated |
| A5 | Animated.ValueXY | rn-animated |
| A6 | Appearance | rn-dark-mode |
| A7 | AppRegistry | rn-how (the entry point, folded) |
| A8 | AppState | rn-background, rn-app-lifecycle |
| A9 | DevSettings | rn-devmenu |
| A10 | Dimensions | rn-dimensions |
| A11 | Easing | rn-animated, rn-reanimated |
| A12 | I18nManager | rn-i18n |
| A13 | Keyboard | rn-keyboard-avoid |
| A14 | LayoutAnimation | rn-layout-anim (Reanimated's layout animations are what apps use) |
| A15 | Linking | rn-linking, rn-share |
| A16 | PanResponder | rn-gestures (low-level, folded) |
| A17 | PixelRatio | rn-dimensions |
| A18 | Platform | rn-platform-module |
| A19 | PlatformColor | rn-dark-mode |
| A20 | ReactNativeVersion | rn-upgrading |
| A21 | RootTag | left out: an internal API |
| A22 | Share | rn-share |
| A23 | StyleSheet | rn-stylesheets |
| A24 | Systrace | rn-profiling |
| A25 | Transforms | rn-reanimated (folded) |
| A26 | Vibration | left out: a one-call API; named in Phone features' summary |
| A27 | Globals (`__DEV__` and others) | rn-perf-sources (`__DEV__`) |
| A28 | useColorScheme | rn-dark-mode |
| A29 | useWindowDimensions | rn-dimensions |
| A30 | BackHandler (Android) | rn-back-button |
| A31 | PermissionsAndroid (Android) | rn-permissions |
| A32 | ToastAndroid (Android) | left out: Android only, one call |
| A33 | ActionSheetIOS (iOS) | left out: iOS only, one call |
| A34 | DynamicColorIOS (iOS) | rn-dark-mode |
| A35 | Settings (iOS) | left out: iOS only, niche |

### Expo docs (SDK 58)

| # | Section | Page or group | Went to |
|---|---|---|---|
| X1 | Get started | Create a project | rn-create-expo |
| X2 | Get started | Set up your environment | rn-device |
| X3 | Get started | Start developing | rn-device, rn-fast-refresh |
| X4 | Get started | Next steps | left out: a page of links |
| X5 | Develop | Tools for development | rn-devmenu, rn-devtools |
| X6 | Develop | Navigation in Expo and React Native apps | rn-routes, rn-react-navigation |
| X7 | Develop | Databases in Expo and React Native apps | rn-sqlite, rn-storage-other, rn-auth-services |
| X8 | Develop | Authentication in Expo and React Native apps | rn-auth, rn-oauth, rn-auth-services, rn-biometrics |
| X9 | Develop | Unit testing with Jest | rn-jest, rn-test-mocks |
| X10 | Develop › User interface | Splash screen and app icon | rn-icon-splash |
| X11 | Develop › User interface | Safe areas | rn-safearea |
| X12 | Develop › User interface | System bars | rn-statusbar |
| X13 | Develop › User interface | Fonts | rn-fonts |
| X14 | Develop › User interface | Assets | rn-image (local assets, folded) |
| X15 | Develop › User interface | Color themes | rn-dark-mode |
| X16 | Develop › User interface | Animation | rn-reanimated |
| X17 | Develop › User interface | Store data | rn-asyncstorage, rn-securestore, rn-filesystem, rn-sqlite |
| X18 | Develop › User interface | Next steps | left out: a page of links |
| X19 | Develop › Development builds | Introduction to development builds | rn-dev-build |
| X20 | Develop › Development builds | Use a development build | rn-dev-build |
| X21 | Develop › Development builds | Share a development build with your team | rn-dev-build (internal distribution, folded) |
| X22 | Develop › Development builds | Tools, workflows and extensions | rn-dev-build |
| X23 | Develop › Development builds | Development builds FAQ | rn-dev-build |
| X24 | Develop › Config plugins | Introduction to config plugins | rn-config-plugins |
| X25 | Develop › Config plugins | Create and use config plugins | rn-config-plugins |
| X26 | Develop › Config plugins | Mods; dangerous mods; plugin development for libraries; developing and debugging a plugin; patch-project (5 pages) | rn-config-plugins (advanced, folded) |
| X27 | Develop › Debugging | Errors and warnings | rn-logbox |
| X28 | Develop › Debugging | Debugging runtime issues | rn-devtools |
| X29 | Develop › Debugging | Debugging and profiling tools | rn-devtools, rn-profiling |
| X30 | Develop › Debugging | Dev tools plugins; create a dev tools plugin (2 pages) | left out: building your own debugging tools |
| X31 | Review | Overview of distributing apps for review | rn-release-build |
| X32 | Review | Share previews with your team | rn-ota |
| X33 | Review | Launch an update using Expo Orbit | left out: a desktop helper app, a convenience |
| X34 | Deploy | Build your project for app stores | rn-release-build |
| X35 | Deploy | Submit to app stores | rn-appstore, rn-playstore |
| X36 | Deploy | App stores metadata | rn-appstore, rn-playstore, rn-store-privacy |
| X37 | Deploy | Send over-the-air updates | rn-ota |
| X38 | Deploy | Publish your web app | rn-web |
| X39 | Monitor | Monitoring services | rn-crash, rn-monitoring |
| X40 | More | Core concepts | rn-expo |
| X41 | More | FAQ | rn-expo |
| X42 | Guides › Development process | Develop an app with Expo | rn-expo, rn-dev-build |
| X43 | Guides › Development process | Configure with app config | rn-app-config |
| X44 | Guides › Development process | Continuous Native Generation (CNG) | rn-prebuild |
| X45 | Guides › Development process | Using Expo SDK, React Native, and third-party libraries | rn-libraries |
| X46 | Guides › Development process | Privacy manifests | rn-appstore (an App Store requirement, folded), rn-store-privacy |
| X47 | Guides › Development process | Permissions | rn-permissions |
| X48 | Guides › Development process | Environment variables in Expo | rn-env-vars, rn-secrets |
| X49 | Guides › Linking | Overview of linking, deep links, App Links and Universal Links | rn-linking |
| X50 | Guides › Linking | Linking into other apps | rn-share |
| X51 | Guides › Linking | Linking into your app | rn-linking |
| X52 | Guides › Linking | Android App Links | rn-universal-links |
| X53 | Guides › Linking | iOS Universal Links | rn-universal-links |
| X54 | Guides › Write native code | Add custom native code; adopt Prebuild in an existing project | rn-expo-modules, rn-prebuild |
| X55 | Guides › Build locally | Overview; debug build; release build; build cache providers; precompiled modules (5 pages) | rn-cli, rn-build-speed |
| X56 | Guides › Web | Develop websites with Expo; publish websites | rn-web |
| X57 | Guides › Web | Using React DOM in native apps (DOM components) | left out: web code inside a native app; Expo-only, past every goal |
| X58 | Guides › Web | React Server Components in Expo Router; testing them | left out: server components; web-first |
| X59 | Guides › Web | Progressive web apps; local HTTPS | left out: web publishing beyond rn-web |
| X60 | Guides › Web | Tailwind CSS | rn-nativewind |
| X61 | Guides › Bundling | Metro bundler; Why Metro? | rn-metro |
| X62 | Guides › Bundling | Analyzing bundles (Expo Atlas, Lighthouse); tree shaking; minifying | rn-startup |
| X63 | Guides › Reference | Work with monorepos | left out: a team setup, not a skill of the subject |
| X64 | Guides › Reference | View logs | rn-logbox |
| X65 | Guides › Reference | Development and production modes | rn-perf-sources |
| X66 | Guides › Reference | Common development errors | rn-metro, rn-device, rn-libraries (their mistakes) |
| X67 | Guides › Reference | Android Studio Emulator | rn-device |
| X68 | Guides › Reference | iOS Simulator | rn-device |
| X69 | Guides › Reference | React Native's New Architecture | rn-jsi, rn-new-arch |
| X70 | Guides › Reference | React Compiler | rn-memo |
| X71 | Guides › Existing React Native apps | Use Expo in an existing app; migrate from the Community CLI; add expo-updates or expo-dev-client; upgrade helper (6 pages) | rn-cli |
| X72 | Guides › Existing native apps | Integrating Expo into existing native apps (4 pages) | rn-brownfield |
| X73 | Expo Router | Introduction; manual installation | rn-routes |
| X74 | Expo Router › Router 101 | Core concepts of file-based routing | rn-routes |
| X75 | Expo Router › Router 101 | Expo Router notation | rn-routes |
| X76 | Expo Router › Router 101 | Navigation layouts | rn-routes, rn-stack |
| X77 | Expo Router › Router 101 | Navigating between pages | rn-stack, rn-params |
| X78 | Expo Router › Router 101 | Common navigation patterns | rn-nesting |
| X79 | Expo Router › Navigation patterns | Stack | rn-stack |
| X80 | Expo Router › Navigation patterns | JavaScript tabs | rn-tabs |
| X81 | Expo Router › Navigation patterns | Native tabs | rn-tabs |
| X82 | Expo Router › Navigation patterns | Drawer | rn-drawer |
| X83 | Expo Router › Navigation patterns | Authentication; authentication using redirects | rn-auth, rn-protected |
| X84 | Expo Router › Navigation patterns | Nesting navigators | rn-nesting |
| X85 | Expo Router › Navigation patterns | Modals; custom web modals | rn-modal |
| X86 | Expo Router › Navigation patterns | Shared routes | rn-nesting (folded) |
| X87 | Expo Router › Navigation patterns | Protected routes | rn-protected |
| X88 | Expo Router › Navigation patterns | Prevent screen removal | rn-stack (folded) |
| X89 | Expo Router › Advanced | Platform extensions, links, settings, Handoff, transitions, inactive routes, custom tabs and navigators, Stack Toolbar, zoom transition (10 pages) | rn-file-ext (platform extensions); the rest left out: polish past every goal |
| X90 | Expo Router › Web | API routes; data loaders; middleware; headers; static and server rendering; async routes (7 pages) | left out: server features for web apps; the subject is mobile apps |
| X91 | Expo Router › Reference | Using URL parameters | rn-params |
| X92 | Expo Router › Reference | Error handling and loading states | rn-loading, rn-error-boundaries |
| X93 | Expo Router › Reference | Typed routes | rn-params |
| X94 | Expo Router › Reference | Handle screen focus | rn-stack (screen focus, folded) |
| X95 | Expo Router › Reference | Testing configuration for Expo Router | rn-rntl |
| X96 | Expo Router › Reference | Color, sitemap, redirects, link preview, analytics, src directory, troubleshooting, reserved paths (8 pages) | left out: reference pages |
| X97 | Expo Router › Migration | From React Navigation; from Webpack; SDK 55 to 56; SDK 57 to 58 | rn-react-navigation, rn-upgrading |
| X98 | Expo Modules API | Overview, get started, tutorials (native module, native view, inline module, config plugin, wrap a library), reference | rn-expo-modules, rn-native-views |
| X99 | Push notifications | Overview; what you need to know | rn-push-setup, rn-local-notif |
| X100 | Push notifications | Expo push notifications setup | rn-push-setup |
| X101 | Push notifications | Send notifications with the Expo Push Service | rn-push-send |
| X102 | Push notifications | Handle incoming notifications | rn-push-handle |
| X103 | Push notifications › Reference | FCM V1 keys; FCM and APNs directly; troubleshooting and FAQ | rn-push-setup, rn-push-send |
| X104 | Integrations | Analytics and error reports (Sentry, BugSnag, LogRocket, PostHog) | rn-crash |
| X105 | Integrations | Authentication SDKs (Clerk, Facebook, Google) | rn-oauth, rn-auth-services |
| X106 | Integrations | CMS; databases and SDKs (Convex, Firebase, Supabase); email; feature flags | rn-auth-services (hosted backends named); left out: a backend is its own subject, rn-backend |
| X107 | Integrations | In-app purchases | left out: in-app purchases; for paid apps, past every goal (open question) |
| X108 | Integrations | Testing (e2e) | rn-maestro |
| X109 | Integrations | Tools: ESLint and Prettier; TypeScript | rn-typescript, rn-create-expo (the template's lint script) |
| X110 | Integrations | TV apps; Next.js for web | left out: TV and Next.js; niche |
| X111 | More › Assorted | Upgrade Expo SDK; SDK library migrations | rn-upgrading |
| X112 | More › Assorted | Authentication with OAuth or OpenID providers | rn-oauth |
| X113 | More › Assorted | Keyboard handling | rn-keyboard-avoid, rn-keyboard-controller |
| X114 | More › Assorted | Localization | rn-i18n |
| X115 | More › Assorted | Hermes; iOS Developer Mode; vector icons; Bun; rich text; app store assets; local-first; controlled components | rn-icons (vector icons), rn-how (Hermes); the rest left out: niche |
| X116 | More › Troubleshooting | Overview; not registered; caches; long paths; Expo Go mismatch; sign-in; version mismatch; proxies | rn-metro, rn-device (their mistakes) |
| X117 | Expo Services | Expo Build (EAS Build): first build, eas.json, internal distribution, app signing and credentials, version management, build errors | rn-release-build, rn-dev-build |
| X118 | Expo Services | Expo Submit (EAS Submit): Play Store, App Store, TestFlight | rn-appstore, rn-playstore |
| X119 | Expo Services | Expo Update (EAS Update): get started, preview, deploy, rollouts and rollbacks, runtime versions | rn-ota, rn-rollouts |
| X120 | Expo Services and other sections | Expo Workflows (CI/CD), Expo Hosting, Observe, Simulators, Metadata, Insights, Distribution, Reference, Configuration files, Expo UI, SDK API reference, third-party library pages, AI and agentic workflows, regulatory compliance, technical specs (summarised in the page map) | rn-ci (Workflows), rn-crash (Observe), rn-web (Hosting), SDK reference: rn-location (Location), rn-media (Audio, Video), rn-connectivity (Network); the rest left out: product services past every goal, rn-expo-ui (Expo UI), rn-monitoring (Observe) |

### Expo tutorial

| # | Chapter | Went to |
|---|---|---|
| T1 | Create your first app | rn-create-expo, rn-device |
| T2 | Add navigation | rn-routes, rn-tabs |
| T3 | Build a screen | rn-image, rn-pressable, rn-flexbox |
| T4 | Use an image picker | rn-image-picker |
| T5 | Create a modal | rn-modal |
| T6 | Add gestures | rn-gestures |
| T7 | Take a screenshot | rn-share (saving and sharing an image) |
| T8 | Configure status bar, splash screen and app icon | rn-statusbar, rn-icon-splash |

### Meta React Native Specialization (Coursera)

| # | Course | Module | Went to |
|---|---|---|---|
| M1 | 1 Intro to Mobile Development | Mobile Applications | rn-what; left out: how the web works |
| M2 | 1 | Introduction to HTML and CSS | left out: HTML and CSS are web; styles are taught in rn-stylesheets |
| M3 | 1 | React and React Native | rn-what, rn-alternatives, rn-how |
| M4 | 1 | Course summary and graded assessment | left out: an assessment |
| M5 | 2 Programming with JavaScript | Introduction to Javascript | rn-js |
| M6 | 2 | The Building Blocks of a Program | rn-js |
| M7 | 2 | Programming Paradigms | rn-js-modern, rn-js |
| M8 | 2 | Testing | rn-jest, rn-node |
| M9 | 2 | End-of-Course Graded Assessment | left out: an assessment |
| M10 | 3 Version Control | Software collaboration | left out: Git is its own subject |
| M11 | 3 | Command Line | rn-node (the commands the subject needs) |
| M12 | 3 | Working with Git | left out: Git is its own subject |
| M13 | 3 | Graded Assessment | left out: an assessment |
| M14 | 4 React Basics | React Components | rn-jsx, rn-components, rn-props |
| M15 | 4 | Data and State | rn-state, rn-lifting, rn-context |
| M16 | 4 | Navigation, Updating and Assets in React.js | rn-jsx-lists, rn-routes; left out: web assets |
| M17 | 4 | Your first React app | left out: a project |
| M18 | 5 React Native | Introduction to React Native | rn-view, rn-text, rn-scrollview, rn-stylesheets, rn-expo |
| M19 | 5 | Lists and Text Input in React Native | rn-flatlist, rn-sectionlist, rn-textinput, rn-keyboard-avoid |
| M20 | 5 | Pressable, Images and Hooks in React Native | rn-pressable, rn-image, rn-dark-mode, rn-dimensions, rn-custom-hooks |
| M21 | 5 | React Navigation | rn-react-navigation, rn-stack, rn-tabs |
| M22 | 5 | Final project assessment | left out: an assessment |
| M23 | 6 Working with Data | Introduction to REST APIs | rn-http |
| M24 | 6 | Interacting with REST APIs in React Native | rn-fetch, rn-async (promises) |
| M25 | 6 | Introduction to Databases & SQL | rn-sqlite; left out: SQL itself is its own subject |
| M26 | 6 | Data in React Native | rn-asyncstorage, rn-sqlite |
| M27 | 6 | Project assessment | left out: a project |
| M28 | 7 Principles of UX/UI Design | Introduction to UX and UI Design | left out: UX and UI design is its own subject; rn-a11y covers accessibility |
| M29 | 7 | Evaluating Interactive Design | left out: UX and UI design is its own subject; rn-a11y covers accessibility |
| M30 | 7 | Applied Design Fundamentals | left out: UX and UI design is its own subject; rn-a11y covers accessibility |
| M31 | 7 | Designing your UI | left out: UX and UI design is its own subject; rn-a11y covers accessibility |
| M32 | 7 | Course Summary and Final Assessment | left out: UX and UI design is its own subject; rn-a11y covers accessibility |
| M33 | 8 Capstone | Starting the Project | left out: a project |
| M34 | 8 | Project Functionality | left out: a project |
| M35 | 8 | Project Assessment (incl. optional store submission) | rn-appstore, rn-playstore (store submission); the rest left out: a project |

### React Learn (the prerequisite)

| # | Section | Page | Went to |
|---|---|---|---|
| R1 | Get started | Quick Start | rn-components |
| R2 | Get started | Tutorial: Tic-Tac-Toe | left out: a web tutorial |
| R3 | Get started | Thinking in React | rn-lifting |
| R4 | Setup | Using TypeScript | rn-typescript |
| R5 | Setup | React Developer Tools | rn-devtools (components panel) |
| R6 | React Compiler | Introduction, installation, adoption, debugging | rn-memo |
| R7 | Describing the UI | Your First Component | rn-components |
| R8 | Describing the UI | Importing and Exporting Components | rn-components |
| R9 | Describing the UI | Writing Markup with JSX | rn-jsx |
| R10 | Describing the UI | JavaScript in JSX with Curly Braces | rn-jsx |
| R11 | Describing the UI | Passing Props to a Component | rn-props |
| R12 | Describing the UI | Conditional Rendering | rn-jsx-lists |
| R13 | Describing the UI | Rendering Lists | rn-jsx-lists |
| R14 | Describing the UI | Keeping Components Pure | rn-components (pure rendering, folded) |
| R15 | Describing the UI | Your UI as a Tree | rn-components |
| R16 | Adding Interactivity | Responding to Events | rn-state (event handlers) |
| R17 | Adding Interactivity | State: A Component's Memory | rn-state |
| R18 | Adding Interactivity | Render and Commit | rn-state |
| R19 | Adding Interactivity | State as a Snapshot | rn-state |
| R20 | Adding Interactivity | Queueing a Series of State Updates | rn-state-updates |
| R21 | Adding Interactivity | Updating Objects in State | rn-state-updates |
| R22 | Adding Interactivity | Updating Arrays in State | rn-state-updates |
| R23 | Managing State | Reacting to Input with State | rn-textinput, rn-validation |
| R24 | Managing State | Choosing the State Structure | rn-lifting |
| R25 | Managing State | Sharing State Between Components | rn-lifting |
| R26 | Managing State | Preserving and Resetting State | rn-lifting (folded) |
| R27 | Managing State | Extracting State Logic into a Reducer | rn-reducer |
| R28 | Managing State | Passing Data Deeply with Context | rn-context |
| R29 | Managing State | Scaling Up with Reducer and Context | rn-reducer, rn-context |
| R30 | Escape Hatches | Referencing Values with Refs | rn-refs-focus |
| R31 | Escape Hatches | Manipulating the DOM with Refs | rn-refs-focus |
| R32 | Escape Hatches | Synchronizing with Effects | rn-effects |
| R33 | Escape Hatches | You Might Not Need an Effect | rn-effects |
| R34 | Escape Hatches | Lifecycle of Reactive Effects | rn-effects |
| R35 | Escape Hatches | Separating Events from Effects | rn-effects |
| R36 | Escape Hatches | Removing Effect Dependencies | rn-effects |
| R37 | Escape Hatches | Reusing Logic with Custom Hooks | rn-custom-hooks |

React Learn's installation pages (Creating a React App, Build from Scratch, Add to an
Existing Project, Editor Setup) are about web projects and are not rows.

### Learner pain

| # | Problem | Source | Went to |
|---|---|---|---|
| P1 | Ecosystem and dependencies: library versions that don't fit together (82 mentions, the top pain) | Survey, opinions | rn-libraries |
| P2 | Version changes and upgrades (38 + 35 mentions) | Survey, opinions | rn-upgrading |
| P3 | Building: build failures, configuration, environments (36 mentions; build page: CI 9, config 8, env 8, stores 8, build time 8, signing 4) | Survey, opinions, build-and-publish | rn-release-build, rn-dev-build, rn-env-vars |
| P4 | Android experience (34) and iOS experience (24) | Survey, opinions | rn-platform-module, rn-cli |
| P5 | Debugging: top request (54%); profiling, network, breakpoints, memory | Survey, debugging | rn-devtools, rn-memory |
| P6 | Navigation: Stack, Expo Router, types (25), deep links (15), modals (10) | Survey, navigation | rn-stack, rn-nesting, rn-params, rn-linking |
| P7 | Styling: light and dark themes (26), NativeWind (20), no CSS API (16), responsiveness (10) | Survey, styling | rn-dark-mode, rn-nativewind, rn-dimensions |
| P8 | Animations: Reanimated (27), performance (19), learning curve (11) | Survey, animations | rn-reanimated |
| P9 | Platform APIs: Android (41), notifications (18), WebView (18), maps (17), permissions (16), accessibility (15), background work (15), deep linking (12) | Survey, platform-apis | rn-permissions, rn-push-setup, rn-background, rn-a11y, rn-linking, rn-webview; maps left out: one library with its own setup |
| P10 | Testing and monitoring: unreadable stack traces (14), error handling (7) | Survey, testing-and-monitoring | rn-crash, rn-error-boundaries |
| P11 | "Unable to resolve module" and stale Metro caches | React Navigation troubleshooting; Expo common errors | rn-metro |
| P12 | Native dependency not linked or app not rebuilt (RNScreens, safe-area-context, gesture-handler) | React Navigation troubleshooting | rn-dev-build, rn-libraries |
| P13 | Duplicate copies of a native package | React Navigation troubleshooting | rn-libraries |
| P14 | Nothing shows after adding a View: the container needs `flex: 1` | React Navigation troubleshooting | rn-flexbox |
| P15 | Non-serializable values in navigation params | React Navigation troubleshooting | rn-params |
| P16 | "Couldn't find a navigation object"; NAVIGATE not handled by any navigator (route names, nesting) | React Navigation troubleshooting | rn-nesting |
| P17 | Options set on the wrong navigator; goBack doing nothing | React Navigation troubleshooting | rn-nesting, rn-stack |
| P18 | Screens remounting because components are made during render | React Navigation troubleshooting | rn-stack |
| P19 | React Native version mismatch; "Application has not been registered" | Expo common errors and troubleshooting | rn-libraries, rn-device |
| P20 | Expo Go doesn't match the project's SDK | Expo troubleshooting | rn-device |
| P21 | Port 8081 in use; Metro can't connect (ECONNREFUSED) | RN troubleshooting; Expo common errors | rn-metro |
| P22 | Android build tooling: adb, gradlew permissions, Windows path length | RN troubleshooting; Expo troubleshooting | rn-cli |
| P23 | The keyboard covering inputs; KeyboardAvoidingView settings per platform; padding with "pan" moving the input twice | Expo keyboard handling | rn-keyboard-avoid |
| P24 | Content under the notch or the system bars (edge-to-edge) | Expo safe areas, system bars; RN 0.81 | rn-safearea |
| P25 | Secrets in the bundle (`EXPO_PUBLIC_` variables are inlined) | Expo environment variables; RN security | rn-secrets |
| P26 | Tokens in AsyncStorage (unencrypted) | RN security; Expo store data | rn-securestore |
| P27 | Plain http blocked (iOS ATS, Android cleartext) | RN networking | rn-net-security, rn-fetch |
| P28 | Cookie auth with fetch unreliable | RN networking | rn-auth |
| P29 | Push notifications: needs a development build; Expo Go on Android errors | Expo SDK 55; push docs | rn-push-setup |
| P30 | Protected screens are not server-side security | Expo protected routes | rn-protected |
| P31 | Toolchain and bundler errors: ENOSPC file watchers (655 votes), SDK location not found (604), unable to load script / no bundle URL (432, 362, 332), version mismatch (279), xcodebuild error 65 (202), `node` not found (201), gradlew EACCES (196), EMFILE (186), how to clear the cache (185 votes, 755k views), can't connect to the dev server (170) | Stack Overflow, top 100 by votes | rn-metro, rn-device, rn-cli |
| P32 | Layout: centring text (346), 100% width (292), float right (238), absolute centring (165), fixed footer (191), auto width (199), a view's size (253) | Stack Overflow, top 100 by votes | rn-flexbox |
| P33 | Text: line breaks (666, 1.1M views), wrapping (342), ellipsis (320), bold words (193), "Text strings must be rendered within a <Text>" (209) | Stack Overflow, top 100 by votes | rn-text |
| P34 | The keyboard: hiding it (729), moving to the next TextInput (335), numeric-only (188), password fields (222) | Stack Overflow, top 100 by votes | rn-keyboard-avoid, rn-refs-focus, rn-textinput |
| P35 | Debugging and logging: how to log (482), how to debug (352), viewing network requests (212), hiding warnings (220), the dev menu in an emulator (303) | Stack Overflow, top 100 by votes | rn-devtools, rn-logbox, rn-devmenu |
| P36 | What it is: React vs React Native (925, the top question), Expo vs React Native (365) | Stack Overflow, top 100 by votes | rn-what, rn-expo |
| P37 | Storing data: the options (370) | Stack Overflow, top 100 by votes | rn-asyncstorage, rn-sqlite, rn-securestore |
| P38 | App identity: icons (365), app name (182), Android package name (291), version number (161) | Stack Overflow, top 100 by votes | rn-icons, rn-app-config, rn-release-build |
| P39 | Release builds: an APK that runs without the dev server (338, 222), package signatures don't match (213), SHA-1 for sign-in (205) | Stack Overflow, top 100 by votes | rn-release-build, rn-oauth |
| P40 | Environment variables (253) | Stack Overflow, top 100 by votes | rn-env-vars |
| P41 | Networking: fetch "Network request failed" (243), authorization headers (230), axios params (262) | Stack Overflow, top 100 by votes | rn-fetch, rn-net-security |
| P42 | Hooks: what useState is (234), forcing a re-render (236), maximum update depth (311), events in useEffect (160) | Stack Overflow, top 100 by votes | rn-state, rn-effects |
| P43 | Lists: a VirtualizedList inside a ScrollView (228), FlatList key warnings (162) | Stack Overflow, top 100 by votes | rn-flatlist |
| P44 | Other: hiding the stack header (364), photo-library permission text in Info.plist (225), SVG (225), background images (178), locking rotation (174), Jest mocks (171), JSX comments (393) and if-else in JSX (160) | Stack Overflow, top 100 by votes | rn-stack, rn-permissions, rn-icons, rn-image, rn-dimensions, rn-jest, rn-jsx, rn-jsx-lists |
| P45 | Store rules a first release fails on: in-app account deletion (Apple 5.1.1(v); Play's web link), privacy policy, App Privacy labels and privacy manifest, Play Data safety, a new Play account's 12 testers for 14 days, the paid Apple account for any iPhone build | Apple App Review Guidelines; developer.apple.com/news/upcoming-requirements; Play Console help 13327111, 9859455, 14151465 (round 1, P3) | rn-delete-account, rn-store-privacy, rn-store-accounts, rn-dev-build |
| P46 | Interview topics: architecture (JSI, Fabric, threads, Hermes), re-renders and memoization, offline-first sync, client vs server state, testing levels | React Native interview handbooks cited in round 1 (P5); reactnative.dev/architecture | rn-threads, rn-jsi, rn-fabric, rn-memo, rn-offline, rn-tanstack, rn-test-mocks |
| P47 | False friends for web React developers (no DOM, Text for every string, no style inheritance, screens that stay mounted, no server-side env) and the native-to-React-Native map for Swift, Kotlin and Flutter developers | Round 1, P4 and P4b; reactnative.dev/docs/text; reactnavigation.org/docs/navigation-lifecycle | rn-from-web, rn-from-native, rn-text, rn-stack |
| P48 | Staged releases and app health after release: Play staged rollouts, App Store phased release, freezes and ANRs | Round 1, P8; expo.dev/blog/introducing-observe | rn-rollouts, rn-monitoring |

### What working people use

| # | Finding | Source | Went to |
|---|---|---|---|
| U1 | Expo CLI 86%, Community CLI 48%; create-expo-app 82% | Survey, architecture, dev-tools | rn-expo, rn-cli |
| U2 | EAS CLI 65%, development builds (Expo DevClient) 65%, Expo Go 53%, config plugins 44% | Survey, dev-tools | rn-dev-build, rn-device, rn-config-plugins |
| U3 | EAS Build 68%, GitHub Actions 62%, Xcode by hand 60%, EAS Submit 54%, Fastlane 47% | Survey, build-and-publish | rn-release-build, rn-ci, rn-appstore |
| U4 | Over-the-air updates 42%; of those, EAS Update 80%, CodePush 20% | Survey, architecture | rn-ota |
| U5 | react-navigation 79%, react-native-screens 73%, expo-router 71% | Survey, navigation | rn-routes, rn-react-navigation |
| U6 | StyleSheet 90%, inline styles 91%, NativeWind 42%, styled-components 38%, Unistyles 29% | Survey, styling | rn-stylesheets, rn-nativewind |
| U7 | Reanimated 93%, Animated 73%, Lottie 61%, Skia 44% | Survey, animations | rn-reanimated, rn-animated, rn-lottie |
| U8 | UI kits: react-native-paper 37%, Elements 22%; react-native-svg 85% | Survey, component libraries | rn-icons (SVG); UI kits left out: a choice, not a skill (no clear leader: Paper 37%) |
| U9 | Jest 77%, Testing Library 59%, Maestro 46%, Storybook 38%, Detox 26%, Appium 18% | Survey, testing | rn-jest, rn-rntl, rn-maestro, rn-detox |
| U10 | Sentry 81%, Crashlytics 42%; Firebase Analytics 68% | Survey, testing and monitoring | rn-crash |
| U11 | React Native DevTools 95%; console 95%, network panel 60%, element inspector 57% | Survey, debugging | rn-devtools |
| U12 | Most-used platform APIs: camera 70%, deep links 68%, notifications 66%, permissions 66%, persistent storage 65%, appearance 59%, file system 58%, WebView 55% | Survey, platform-apis | rn-camera, rn-linking, rn-push-setup, rn-permissions, rn-asyncstorage, rn-dark-mode, rn-filesystem, rn-webview |
| U13 | New Architecture 74%, Hermes 60%, Expo Modules API 53%, Nitro Modules 35% | Survey, architecture | rn-how, rn-expo-modules, rn-turbo-modules; Nitro left out: a third-party module system |
| U14 | TypeScript: 676 of 928 write 100% TypeScript | Survey, dev-tools | rn-typescript |
| U15 | Code shared with web: none 43%, React Native Web 39% | Survey, architecture | rn-web |
| U16 | State: Redux / Redux Toolkit most widespread; Zustand rising fast with top satisfaction; Context common | State of React 2025 | rn-context, rn-zustand, rn-redux |
| U17 | Data loading: TanStack Query climbing, top satisfaction | State of React 2025 | rn-tanstack |
| U18 | Storage by kind (Expo): SecureStore for secrets, AsyncStorage for small non-sensitive data, SQLite for structured data, FileSystem for files; MMKV the fast option | Expo store data; MMKV README | rn-asyncstorage, rn-securestore, rn-sqlite, rn-filesystem, rn-storage-other |
| U19 | Auth: hosted providers (Clerk, Supabase, Cognito, Firebase, Better Auth); OAuth with PKCE; Sign in with Apple when Google sign-in is offered | Expo authentication; RN security | rn-auth-services, rn-oauth |
| U20 | Keyboard: react-native-keyboard-controller for anything past a prototype | Expo keyboard handling | rn-keyboard-controller |
| U21 | Images: expo-image; lists: FlashList available in Expo Go | Expo SDK changelogs; Expo library pages | rn-image, rn-flashlist |
| U22 | Lint and format: ESLint (flat config, 0.84) and Prettier | RN 0.84; Expo integrations | rn-create-expo (the template's lint script) |

## Learners and goals

### Who studies React Native

Adapted from the blueprint's roster (§5). Prerequisite stated by the subject: **some
programming**, not necessarily JavaScript. React is taught inside the subject (as it is in
Meta's course), because most Trellis students meet React and React Native together.

| | Persona | For React Native specifically |
|---|---|---|
| P1 | **Complete beginner** | Has written some code (Python, C, a little HTML), never JavaScript or React. Needs JavaScript and React inside the map, and a first app on their own phone within the first evening. |
| P2 | **University student with a deadline** | A semester project: "a mobile app that does X", demonstrated on a phone in class. Rarely publishes to a store. Wants the shortest honest path, and to know what to skip. |
| P3 | **Builder shipping a first real app** | Wants it in the App Store and Google Play: sign-in, data from a server, saved on the phone, push, a real release. |
| P4 | **Coming from React on the web** (the biggest neighbour) | Knows components, state and hooks. False friends: no DOM, no CSS cascade, `div` and `span` are View and Text, flexbox defaults to a column, `onClick` is `onPress`, routing differs, no `localStorage`. |
| P4b | **Coming from native iOS or Android, or from Flutter** | Knows mobile; doesn't know JavaScript or React. Wants to know where native code still fits. |
| P5 | **Job seeker** | Interviews ask about the threads and the New Architecture, re-renders and memoisation, list performance, navigation, state management, offline, testing. |
| P6 | **Following Meta's React Native course** (no official certification exists; this is the nearest official scope) | Wants every module of Meta's course covered: lists, text input, Pressable, images, hooks, React Navigation, REST, AsyncStorage, SQLite. |
| P7 | **Returning learner who knew an older React Native** | Remembers class components, the bridge, `react-native init`, AsyncStorage in core, expo-av, "ejecting", "managed vs bare". Needs what changed, and none of that shown as current. |
| P8 | **Professional going deep** | Performance and profiling, native modules (Turbo Modules, Expo Modules), testing end to end, CI, over-the-air updates, monitoring. |
| P9 | **Very little time** | A weekend. Needs core vs optional to be honest, and minutes to be believable. |
| P10 | **Non-native English speaker** | Many Trellis users. Plain names, no idioms. |

### Every goal a student could come with

| | Candidate goal | What "done" means |
|---|---|---|
| G1 | **Build my first app** (a semester project) | A multi-screen app on their own phone: lists, a form, data from an API, saved between launches, looks right on both platforms, can be debugged. No store. |
| G2 | **Publish an app to the stores** | G1, plus sign-in, secrets kept out of the bundle, a development build, a signed release, in the App Store and Google Play. |
| G3 | **The whole of React Native** | Everything a working React Native developer is expected to know, including testing, performance, native code and updates after release. |
| G4 | **From React (web) to React Native** | G1 for someone who already knows React: everything except the React and JavaScript foundations. (Trellis's "already know" claims handle this; not a goal of its own.) |
| G5 | **Get a React Native job** | G2 plus testing, performance, state management at scale, and the architecture interviewers ask about. |
| G6 | **Run an app in production** | G2 plus over-the-air updates, crash reporting, CI builds, end-to-end tests, upgrades. |
| G7 | **Write native code for React Native** | Turbo Native Modules or the Expo Modules API, config plugins, Codegen. |
| G8 | **Just the basics** | Know what React Native is and get a first screen running. |
| G9 | **Cover Meta's React Native course** | Every module of Meta's specialization that is about React Native or React. |

**Shipped (owner, 15 Nov 2026): G1, G2 and G3.** Students, Trellis's first users, mostly
demo on a phone and never publish, so their goal (G1) must not require signing and store
review; G2 adds them. Every other candidate is still walked in stage 8.

## The plan

**Built**, after round 1's triage: **25 big topics, 159 subtopics (80 core)**, about 92
hours in all. The subject file is now the plan: `cd backend && npm run subject --
react-native` prints it in route order with every link, and `--goal a,b` any goal's route.
The stage-5 draft (24 big topics, 136 subtopics) is in git history (commit `aeafda1`).

Big topics in route order, with what each one stands on (worked out from the subtopics):

| Big topic | id | Stands on |
|---|---|---|
| What is React Native? | rn-intro | (a foundation) |
| JavaScript foundations | rn-prereq | (a foundation) |
| React basics | rn-react | JavaScript foundations |
| Getting set up | rn-env | What is React Native?, JavaScript foundations |
| Development workflow | rn-workflow | Getting set up |
| Core components | rn-core | React basics, Getting set up |
| Data from a server | rn-network | Core components |
| State management | rn-app-state | React basics |
| Saving data on the phone | rn-storage | React basics |
| How React Native works inside | rn-internals | React basics |
| Styling and layout | rn-styling | Core components |
| Lists | rn-lists | Core components |
| Forms and the keyboard | rn-forms | Core components |
| Navigation | rn-nav | Core components |
| Phone features | rn-device-apis | Development workflow, Core components |
| iOS and Android differences | rn-platform | Core components |
| Builds and configuration | rn-builds | Development workflow |
| Testing | rn-testing | Core components |
| Animation and gestures | rn-animation | Styling and layout |
| Sign-in and security | rn-signin | Navigation, Data from a server, State management, Saving data on the phone |
| Push notifications | rn-push | Data from a server, Phone features, Builds and configuration |
| Performance | rn-perf | Lists, How React Native works inside, Builds and configuration |
| Native code | rn-native | How React Native works inside, Builds and configuration |
| Publishing to the stores | rn-publish | Builds and configuration |
| Running in production | rn-production | Publishing to the stores |

**Goals** (`npm run subject` prints each route):

| Goal | Targets | Size |
|---|---|---|
| Build my first app (`goal-rn-first-app`) | Development workflow, Styling and layout, Lists, Forms and the keyboard, Navigation, Data from a server, State management, Saving data on the phone, iOS and Android differences | 45 subtopics, about 28 h (about 15 h with JavaScript and React known) |
| Publish to the app stores (`goal-rn-publish`) | the above, plus Sign-in and security and Publishing to the stores | 59 subtopics, about 36 h |
| All of React Native (`goal-rn-full`) | every big topic nothing else needs | 80 subtopics, about 51 h |

## Decisions

- **Subject id `react-native` and prefix `rn-` kept** (15 Nov 2026). The id is in students'
  records and the subject list; changing it gains nothing. Topic ids are reused only where
  the topic means the same as before, so an old check-in can never point at a topic that
  now means something else.
- **No certification persona as written.** React Native has no official certification
  (checked 15 Nov 2026); P6 is adapted to Meta's own course, the nearest thing to the
  maker's statement of scope.
- **React and JavaScript are inside the subject**, as in Meta's course. A student who
  knows them marks them known on /start.
- **CSS basics dropped as a prerequisite** (stage 5). React Native has no CSS; the box
  model and flexbox a student needs are taught in Styling and layout. The old curriculum
  required 90 minutes of web CSS first.
- **Node, npm and the terminal added as core** (stage 5): every command in the subject
  runs through them, and the old map assumed them (P1's "hidden assumptions").
- **Async split out of JavaScript basics** (stage 5): fetching, storage and every device API
  need promises, and "JavaScript basics" at 240 minutes was already the longest sitting.
- **React gained effects, updating objects and arrays, and lifting state** (stage 5): from
  React Learn; "my list doesn't update" (mutating state) and effects are where React
  beginners stall. Context moved to App-wide state: a first app can pass params instead.
- **Navigation is a big topic, Expo Router first** (stage 5). The old curriculum had one
  90-minute box. The template uses Expo Router and Expo recommends it; React Navigation
  stays as an optional subtopic because 79% have used it and Meta's course teaches it.
  Since SDK 56 the two can't be mixed in app code, so a student learns one first.
- **Deep linking folded into Navigation** (stage 5) to keep within 25 big topics; it is
  about which screen a URL opens.
- **Security merged into Sign-in** (stage 5): two core subtopics alone (secrets, HTTPS)
  made a thin big topic, and both shipped goals that need one need the other.
- **React Native DevTools is core** (was optional): 95% use it and debugging is the
  survey's top request.
- **Development builds are core in Builds and configuration**, not in Getting set up: a
  first app runs in Expo Go (Expo calls it the playground for learners); push, native
  libraries and publishing need a development build.
- **Retired ids** (their topic is split, folded or gone; an id is never reused with a new
  meaning): `rn-why` (into rn-alternatives), `rn-css` (dropped), `rn-snack` (Expo Go covers
  the job; nothing in the inventory backs it), `rn-sourcemaps` (into rn-devtools and
  rn-crash), `rn-imagebg` (deprecated), `rn-switch` (into rn-pickers), `rn-spinner` (into
  rn-loading), `rn-navigation` (split into the Navigation big topic, `rn-nav`, and its
  subtopics), `rn-scrolling` (into rn-gestures and rn-flatlist), `rn-animations` (split
  into rn-reanimated and rn-animated), `rn-test-renderer` (deprecated), `rn-appium` (18%
  use it; rn-maestro and rn-detox cover end to end), `rn-ram-bundles` (outdated with
  Hermes; into rn-startup), `rn-native-ios` and `rn-native-android` (split by approach
  now: Expo Modules or Turbo Modules), `rn-secure-storage` (into rn-securestore and
  rn-secrets), `rn-security` (merged into rn-auth), `rn-deeplink` (into rn-nav),
  `rn-interactions` (into rn-nav and rn-animation).
- **The big topic of sign-in is `rn-signin`** (stage 7): `rn-auth` stays the subtopic
  "Sign-in and sessions", the old topic of the same meaning.
- **Memoization and the React Compiler are one core box** (round 1): the compiler is on in
  new Expo apps, so the box says what it does and when hand-written memo is still needed.
- **Profiling is core and needs a local release build** (round 1): "always test
  performance in release builds". The release build on your own machine sits in Builds and
  configuration; store builds and signing stay in Publishing.
- **State management is in the first-app goal** (round 1): route params arrive as strings,
  so "a form adds an item that another tab shows" needs shared state.
- **AsyncStorage is the 2.x API** (round 1): Expo SDK 58 installs 2.2.0; 3.x is named only
  as newer.
- **Left out on purpose** (each also in Coverage): the Legacy Architecture, brownfield
  integration, TV and other platforms, server features of Expo Router for the web, in-app
  purchases, maps, UI kits, Git, UX design.

## Review log

### Round 1 (plan stage, 15 Nov 2026): reported and triaged

Run with the old 14-reviewer panel; stopped by the owner after 8 reports to save the
session's limit. **Reported:** P2 student with a deadline, P3 builder, P4 from React on
the web, P4b from native or Flutter, P5 job seeker, P8 professional, P9 little time, P10
non-native English. **Stopped before reporting:** P1, P6 (Meta course), P7 (returning
learner), E1 practitioner, E2 teacher, E4 coverage auditor; the next round's three
reviewers cover their roles.

The findings, merged where reviewers agreed (who raised each in brackets). Verify each
before accepting it: the reviewers cite pages, but the triage must open them.

**Must (a student would be misled or blocked):**

1. **AsyncStorage version.** Expo SDK 58 installs AsyncStorage **2.2.0** (in Expo Go), not
   3.x; "v3: storage instances" would make the student's AI write code that doesn't run.
   Fix rn-asyncstorage and "What changed recently"; v3 to rn-storage-other or
   rn-upgrading. (P2, P9; docs.expo.dev/versions/v58.0.0/sdk/async-storage/)
2. **`localhost` from the phone.** A G1 student's own backend at `localhost` fails with
   "Network request failed"; needs the laptop's LAN address (10.0.2.2 on the Android
   emulator), the same Wi-Fi or a tunnel; plain http is blocked in release builds. Name it
   in rn-fetch, or add a core "Calling your own server" in Data from a server. (P2, P4)
3. **Expo Go and SDK 58.** The store Expo Go may still run SDK 57 (SDK 58's changelog says
   the new Expo Go comes "within a few weeks"; until then `create-expo-app` makes SDK 57
   projects); iOS Expo Go needs signing in on both ends. rn-create-expo: pick the SDK the
   phone's Expo Go supports; rn-device: login, mismatch, tunnel; 45 min. Re-check on the
   day the file is written. (P2, P9; expo.dev/changelog/sdk-58,
   expo.dev/changelog/expo-go-57-login)
4. **Store requirements G2 misses** (P3, P4, P8):
   - in-app **account deletion** (Apple 5.1.1(v); Play's web link): new core
     `rn-delete-account` in Sign-in;
   - **privacy policy, App Privacy labels, privacy manifest, Play Data safety**: new core
     `rn-store-privacy` in Publishing;
   - **Google Play's 12 testers for 14 days** for new personal accounts: say "start now"
     early; a core `rn-store-accounts` (Apple $99/yr, Play $25, identity checks) that
     opens early (needs only rn-expo);
   - a **paid Apple account** for any development build on an iPhone (rn-dev-build).
5. **Env vars and secrets reach G1 too late** (P2, P4): a G1 student calling an API with a
   key will add `EXPO_PUBLIC_` and ship it. Move rn-env-vars into Data from a server (or
   Development workflow) so G1 meets it, and so Sign-in no longer drags in Builds.
6. **Architecture underplayed and not inventoried** (P5, P4b): reactnative.dev/architecture/
   (overview, Fabric, render-commit-mount, threading model, view flattening, Hermes,
   glossary) has no Coverage rows. rn-how is one optional 30-minute box for JSI, Fabric,
   Turbo Modules, Hermes and threads. Proposal: inventory those pages; keep rn-how short;
   add a 25th big topic "How React Native works inside" after Performance (threads, JSI
   vs the bridge, Fabric, Turbo Modules and Codegen in concept, Hermes, what the New
   Architecture enables).
7. **Profiling in dev mode** (P8): Performance comes before any release build, so students
   would measure dev builds ("always test performance in release builds",
   reactnative.dev/docs/performance). Add a local release build (`npx expo run:* 
   --configuration Release`) in Builds and configuration; rn-profiling and rn-startup
   need it; rn-profiling core.
8. **App lifecycle missing; rn-background wrongly needs permissions** (P4b): add
   `rn-app-lifecycle` (AppState: refetch on return, pause timers); rn-background needs it
   and app config, not permissions (expo-background-task asks for none).
9. **Names** (P10): rn-routes says `app/` but the template uses `src/app`; rename
   "Screens as files" to "File-based routing"; "Entering and exiting" to
   "Entering/exiting animations".

**Should (clearly better):**

10. **React Compiler is on by default** in new Expo apps since SDK 54
    (react.dev/blog/2025/10/07/react-compiler-1). Make rn-compiler core or merge it with
    rn-memo ("it's on; when you still memoise by hand"). Check the SDK 58 template's
    app.json first. (P4, P5, P8)
11. **Context for G1** (P2, P9): Expo Router params are strings, so "a form adds an item
    another tab shows" needs shared state. Add App-wide state to G1 (its one core is
    rn-context, 40 min); drop "a first app can pass params instead".
12. **Screen focus** (P4, P4b, P5): stack screens stay mounted, so `useEffect` doesn't
    re-run on "back"; `useFocusEffect`. In rn-stack's summary and mistakes, or a new
    optional `rn-screen-focus`.
13. **G1's total** (P2, P9): about 28 h of core (15 h if JS and React are known). Show
    each goal's core total (the printer could), trim: core "Tabs" only (drawers and JS
    tabs optional), rn-devtools 30, rn-jsx/components/props 30 each, rn-flatlist 40,
    rn-pressable 20; consider merging Fast Refresh and the developer menu, and folding
    rn-expo into rn-create-expo. Consider dropping iOS and Android differences from G1's
    targets.
14. **TypeScript** (P2, P5, P9): every template file is `.tsx`. Keep rn-typescript
    optional but add "reading the template's TypeScript" to rn-create-expo (or a 15-min
    core box); job seekers want it core in G3.
15. **Publishing details** (P3, P8): rn-appstore is about eight jobs in 60 min (demo
    account, age rating, EU trader status, export compliance, common rejections); name
    `eas submit` and the Play service-account key; yearly store deadlines (Play target
    API 36 since 31 Aug 2026; Apple Xcode 26 since 28 Apr 2026; 16 KB pages); rn-release-
    build needs rn-env-vars (production env on EAS) and "test the release build on a
    phone"; identifiers are permanent; icon and splash needed for the stores; Apple 4.8
    reworded (any social sign-in needs a private equivalent). Consider rn-crash and
    rn-ota in G2.
16. **Production depth** (P8): rn-ota summary (runtime versions, fingerprint, channels,
    rollouts, rollbacks; CodePush retired Mar 2025); rn-crash covers native too (dSYMs,
    R8 mapping, Hermes source maps); new optional rn-monitoring (ANRs, hangs, Observe),
    rn-rollouts (staged and phased releases), rn-memory (leaks), rn-app-size (or fold
    into rn-startup); rn-prebuild core and a need of rn-config-plugins; FlashList v2
    (New Architecture only, no estimatedItemSize) and Legend List.
17. **Native developers** (P4b, P8): Expo UI (SwiftUI and Compose, stable) as optional
    `rn-expo-ui`; brownfield as optional `rn-brownfield` (expo-brownfield); debugging
    native code (D38) folded into rn-expo-modules or a new optional rn-native-debug;
    Nitro named in rn-turbo-modules; teach the Expo Modules 1.0 API (2.0 is beta);
    threads: rn-expo-modules needs rn-how; rn-reanimated helped by the thread topic;
    async/await is one thread (rn-async's mistakes).
18. **"Coming from" boxes** (P4, P4b): optional `rn-from-web` and `rn-from-native` in What
    is React Native?, listing the false friends (no DOM, Text for every string, no style
    inheritance, onPress, column flexbox, stacks stay mounted, no server-side env; and
    the native-to-React-Native map). Also a "skip React" claim set for /start.
19. **Re-renders, server vs client state, error boundaries, testing levels** (P5): a core
    "Why components re-render"; "Choosing where state lives"; error boundaries (Expo
    Router's per-route ErrorBoundary); rn-rntl needs rn-effects; mocking native modules
    and the network; an optional offline-first subtopic.
20. **Names** (P10): "Errors and warnings" → "Error screens (LogBox)"; "Keyboard
    controller" → "Keyboard Controller library"; "Tuning FlatList" → "Optimizing
    FlatList"; "Without Expo: the CLI" → "React Native Community CLI"; "Updating objects
    and arrays" → "Objects and arrays in state"; "Expo" → "What Expo is"; "App-wide state"
    → "State management"; "After release" → "Running in production"; "Web pages in the
    app" → "Showing web pages (WebView)"; "Picking photos" → "Image picker"; goal name
    "All of React Native" (the same name everywhere); US spellings for technical words.
21. **Smaller fixes**: rn-keyboard-avoid medium (padding on both platforms; header offset;
    helped by rn-stack) (P9); certificate pinning optional, not core (P3, P2);
    keyboard-controller may be in Expo Go (Expo's pages disagree) (P9); native tabs
    import path differs SDK 57/58 (P2); "Choosing a backend" optional (Supabase setup,
    10 Nov 2026) (P2); a demo-day APK via internal distribution (P2); the survey edition
    and its figures need re-checking (P5: 74% vs 80% New Architecture).

**Triage** (15 Nov 2026, straight into the file at the owner's request). Accepted: 1 to 14,
17, 18 (the two "coming from" boxes; the /start claim set deferred), 19 (error boundaries,
mocks, offline-first; re-renders folded into rn-perf-sources and rn-memo rather than a new
box), 20, 21 (except the demo-day APK). Partly accepted: 15 and 16 (named in summaries
and mistakes; rn-monitoring and rn-rollouts added; rn-memory added; app size folded into
rn-startup; rn-crash and rn-ota left out of G2 to keep it a first release); 6 (a 25th big
topic, "How React Native works inside", with two core subtopics). Rejected: a core
"Calling your own server" box (2): the trap went into rn-fetch's mistakes, where the
stuck ranking can match it; a separate "Choosing where state lives" box (19): rn-context's
and rn-tanstack's summaries carry it; making rn-typescript core (14): a first app works in
JavaScript, and rn-create-expo now names the TypeScript template. Deferred to the owner, then
accepted (15 Nov 2026): an "I know React" shortcut on /start/sort (18; `reactNativeShortcuts`,
marking JavaScript, React basics, Context, useReducer, custom hooks, refs, memoization and
HTTP known) and the demo-day build (21; optional `rn-demo-build` in Getting set up).
Two link changes came from the tests rather than the reviewers: FlatList needs "Objects
and arrays in state" (its own mistake is changing the array in place; the sample student's
words point there), and "Loading and error states" needs View (a spinner and a message are
views), which also fixed a line drawn through the React frame with every big topic open.

**Good, keep** (said by several): Expo first and Expo Router first; the New Architecture
only, the bridge as history; DevTools, Metro, libraries and keyboard handling core; Expo Go
for G1 with development builds later; G1 free of signing and stores; component names as
in the docs; plain big-topic names.

## Open questions

- In-app purchases are left out (no goal needs them). Say if a goal should include them.
- The remaining review (the file-stage round, and looking at the map): next session?
