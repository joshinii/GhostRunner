import { TextStyle } from "react-native";

export const TYPOGRAPHY = {
  body: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "400"
  },
  caption: {
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "400"
  },
  title: {
    fontFamily: "System",
    fontSize: 22,
    fontWeight: "600"
  }
} satisfies Record<string, TextStyle>;
