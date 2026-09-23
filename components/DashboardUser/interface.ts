export interface WithDashboardUserProps {
  email: string;
}

export interface DashboardUserProps {
  email: string;
  isLoading: boolean;
  onSignOut: () => void;
}
