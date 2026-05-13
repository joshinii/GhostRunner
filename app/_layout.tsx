import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import HomeScreen from "../screens/HomeScreen";
import RaceScreen from "../screens/RaceScreen";
import RecordScreen from "../screens/RecordScreen";
import SessionDetailScreen from "../screens/SessionDetailScreen";
import { RootStackParamList } from "../navigation/types";

const Stack = createStackNavigator<RootStackParamList>();

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  console.log("[GhostStrategist] Root navigator rendering");

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="RecordScreen" component={RecordScreen} />
          <Stack.Screen name="RaceScreen" component={RaceScreen} />
          <Stack.Screen name="SessionDetailScreen" component={SessionDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
