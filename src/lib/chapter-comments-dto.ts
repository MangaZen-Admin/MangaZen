export type ChapterCommentAuthor = {
  name: string | null;
  image: string | null;
  /** Segmento para `/${locale}/user/[profileKey]` (username o id). */
  profileKey: string;
};

export type ChapterCommentJson = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  /** Id del usuario autor (para UI: editar solo propios). */
  authorUserId: string;
  locale: string;
  author: ChapterCommentAuthor;
  likeCount: number;
  dislikeCount: number;
  myVote: 1 | -1 | null;
  replies: ChapterCommentJson[];
};
