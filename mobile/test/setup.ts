// Native modules don't exist under Jest (it runs in Node, not on a phone). jest-expo fakes
// Expo's own modules; AsyncStorage ships its own fake, which we switch on here.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
