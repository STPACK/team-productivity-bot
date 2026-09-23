export interface WithLoginCardProps {
  nextPath: string;
}

export interface LoginCardProps {
  isLoading: boolean;
  onSignIn: () => void;
}
