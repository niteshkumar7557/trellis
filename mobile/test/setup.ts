// Native modules don't exist under Jest (it runs in Node, not on a phone). jest-expo fakes
// Expo's own modules; AsyncStorage ships its own fake, which we switch on here.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The safe-area library asks the phone how big the status and navigation bars are; its fake
// answers with fixed sizes.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
