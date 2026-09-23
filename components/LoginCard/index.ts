"use client";

import { LoginCard } from "./LoginCard";
import { withLoginCard } from "./withLoginCard";

const ConnectedLoginCard = withLoginCard(LoginCard);

export { ConnectedLoginCard as LoginCard };