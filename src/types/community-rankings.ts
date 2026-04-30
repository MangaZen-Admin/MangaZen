export type CommunityRankingEntry = {
  userId: string;
  name: string | null;
  image: string | null;
  /** Perfil público: URL usa username si existe; si no, userId. */
  username: string | null;
  count: number;
  isPro: boolean;
  proPlan: "bronze" | "silver" | "gold" | "platinum" | null;
};

export type CommunityRankingsPayload = {
  topReaders: CommunityRankingEntry[];
  topDonors: CommunityRankingEntry[];
  topScans: CommunityRankingEntry[];
};
