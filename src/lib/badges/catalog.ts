/**
 * Catálogo de insignias: fuente única para seed y documentación.
 * Las reglas automáticas viven en award-badge.ts (por nombre estable).
 */

export type SeedBadgeRow = {
  name: string;
  description: string;
  iconKey: string | null;
  isHighlighted: boolean;
};

export const SEED_BADGES: SeedBadgeRow[] = [
  {
    name: "Pilar de la Comunidad",
    description: "Apoyás MangaZen navegando sin bloqueador de anuncios. ¡Gracias por sostener el proyecto!",
    iconKey: "Shield",
    isHighlighted: true,
  },
  {
    name: "Primera página",
    description: "Guardaste tu primera posición de lectura en un capítulo.",
    iconKey: "BookOpen",
    isHighlighted: false,
  },
  {
    name: "Explorador de estanterías",
    description: "Tenés progreso de lectura en al menos 5 obras distintas.",
    iconKey: "Library",
    isHighlighted: false,
  },
  {
    name: "Viajero de mundos",
    description: "Tenés progreso de lectura en 15 obras o más. ¡No hay un solo género que se te escape!",
    iconKey: "Globe2",
    isHighlighted: false,
  },
  {
    name: "Primera voz",
    description: "Publicaste tu primer comentario en un capítulo.",
    iconKey: "MessageCircle",
    isHighlighted: false,
  },
  {
    name: "Alma del foro",
    description: "Llegaste a 10 comentarios en capítulos. La comunidad te escucha.",
    iconKey: "MessagesSquare",
    isHighlighted: false,
  },
  {
    name: "Hilo continuo",
    description: "Dejaste 5 respuestas en hilos de comentarios. Te gusta la conversación.",
    iconKey: "Reply",
    isHighlighted: false,
  },
  {
    name: "Corazón manga",
    description: "Agregaste tu primer manga a favoritos.",
    iconKey: "Heart",
    isHighlighted: false,
  },
  {
    name: "Pulgar arriba zen",
    description: "Diste tu primer me gusta a una obra.",
    iconKey: "ThumbsUp",
    isHighlighted: false,
  },
  {
    name: "Voces del mundo",
    description: "Comentaste usando 3 idiomas distintos de la app (locales de interfaz).",
    iconKey: "Languages",
    isHighlighted: false,
  },
  {
    name: "Puntero Zen",
    description: "Alcanzaste 100 ZenShards en tu saldo.",
    iconKey: "Sparkles",
    isHighlighted: false,
  },
  {
    name: "Arcoíris Zen",
    description: "Superaste los 1.000 ZenShards. Brillás con luz propia.",
    iconKey: "Gem",
    isHighlighted: true,
  },
  {
    name: "Primera entrega",
    description: "Subiste tu primer capítulo desde el panel de Scan.",
    iconKey: "Upload",
    isHighlighted: false,
  },
  {
    name: "Motor de sala",
    description: "Registraste 10 envíos de capítulos como scanlator o creador.",
    iconKey: "Layers",
    isHighlighted: false,
  },
  {
    name: "Búho MangaZen",
    description: "Leés de madrugada: guardaste progreso entre las 0:00 y las 4:59 (hora del servidor).",
    iconKey: "Moon",
    isHighlighted: false,
  },
  {
    name: "Plan maestro",
    description: "Tenés al menos 5 obras en Plan para leer.",
    iconKey: "ListTodo",
    isHighlighted: false,
  },
  {
    name: "Final feliz",
    description: "Marcaste 3 obras como completadas en tu lista de lectura.",
    iconKey: "BookCheck",
    isHighlighted: false,
  },
  {
    name: "Autor en la obra",
    description: "Tu rol de Creador fue aprobado. Bienvenido a publicar en MangaZen.",
    iconKey: "PenLine",
    isHighlighted: true,
  },
  {
    name: "Mecenas MangaZen",
    description: "Distinción especial otorgada manualmente por el equipo por apoyo excepcional a la plataforma.",
    iconKey: "Crown",
    isHighlighted: true,
  },
];
