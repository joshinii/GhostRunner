import { Session } from "../services/sessions";

export type RootStackParamList = {
  HomeScreen: undefined;
  RecordScreen: undefined;
  RaceScreen: {
    session: Session;
  };
  SessionDetailScreen: {
    session: Session;
  };
};
