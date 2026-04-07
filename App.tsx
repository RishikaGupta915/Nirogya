import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import "./global.css";
import { useColorScheme } from "nativewind";

import AppNavigator from "./src/navigation/AppNavigator";
import { AppProvider, useApp } from "./src/context/AppContext";
import { COLORS } from "./src/constants/theme";

function AppShell() {
  const { themeMode } = useApp();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(themeMode);
  }, [setColorScheme, themeMode]);

  const navTheme = themeMode === "dark"
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: COLORS.bg,
          card: COLORS.bgCardHover,
          text: COLORS.textPrimary,
          border: "transparent",
          primary: COLORS.gradStart,
          notification: COLORS.gradStart
        }
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: COLORS.bg,
          card: COLORS.bgCardHover,
          text: COLORS.textPrimary,
          border: "transparent",
          primary: COLORS.gradStart,
          notification: COLORS.gradStart
        }
      };

  return (
    <NavigationContainer theme={navTheme} key={`nav-${themeMode}`}>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
