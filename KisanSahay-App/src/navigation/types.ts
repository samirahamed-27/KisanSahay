import { Scheme } from '../store/schemeStore';
import { LocalLoanRecord } from '../services/database';

export type RootStackParamList = {
  MainTabs: undefined;
  SchemeDetail: { scheme: Scheme };
  AddLoan: { loan?: LocalLoanRecord };
  Vault: undefined;
  AIChat: undefined;
  SoilAnalysis: undefined;
  Notifications: undefined;
  Settings: undefined;
  LanguageSelect: undefined;
  SwitchProfile: undefined;
  Onboarding: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  SchemesTab: undefined;
  LoansTab: undefined;
  ProfileTab: undefined;
  MoreTab: undefined;
};
