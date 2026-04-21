export type AdminScanStatsSortKey = "views" | "uploads" | "zen";

export type AdminScanStatsListRow = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: "SCAN" | "CREATOR";
  totalUploads: number;
  approvedUploads: number;
  rejectedUploads: number;
  totalViews: number;
  zenPoints: number;
  lastUploadAt: string | null;
};

export type AdminScanStatsListResponse = {
  sort: AdminScanStatsSortKey;
  order: "asc" | "desc";
  query: string;
  rows: AdminScanStatsListRow[];
};

export type AdminScanDetailPendingRow = {
  uploadId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string | null;
  chapterLocale: string;
  chapterLanguage: string;
  mangaTitle: string;
  mangaSlug: string;
  coverImage: string | null;
  submittedAt: string;
};

export type AdminScanDetailResponse = {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    role: "SCAN" | "CREATOR";
    zenPoints: number;
    createdAt: string;
  };
  totals: {
    uploaded: number;
    approved: number;
    rejected: number;
    pending: number;
    totalViews: number;
  };
  viewsByPeriod: {
    today: number;
    week: number;
    month: number;
  };
  topChapters: {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string | null;
    mangaTitle: string;
    mangaSlug: string;
    views: number;
  }[];
  topMangas: {
    mangaId: string;
    title: string;
    slug: string;
    coverImage: string | null;
    views: number;
  }[];
  uploadsByDay: { day: string; count: number }[];
  pendingChapters: AdminScanDetailPendingRow[];
};
