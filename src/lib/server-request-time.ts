import { cache } from "react";

/** Una marca de tiempo por petición en el servidor (evita Date.now() en el cuerpo del page, regla react-hooks/purity). */
export const getServerRequestTimeMs = cache(() => Date.now());
