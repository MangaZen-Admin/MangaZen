# 🌌 MangaZen

**MangaZen** es una plataforma web para leer manga, manhwa y manhua,
con foco en el empoderamiento de Scans y Creadores independientes.
Ofrece herramientas de monetización directa, gestión de contenido
y una comunidad activa.

## ✨ Características

- **💎 Economía Zen** — Sistema de monedas internas (ZenCoins/ZenShards) con pagos reales via Lemon Squeezy
- **🌍 Donation Links** — Soporte para Patreon, Ko-fi, Cafecito, Mercado Pago, Pixiv FANBOX, Afdian y más
- **📢 Boost System** — Los Scans pueden promocionar sus obras usando ZenCoins
- **🛡️ Moderación** — Sistema completo de ban/suspensión de usuarios y moderación de contenido
- **📱 Mobile First + PWA** — Navegación inferior nativa, optimizado para Android/iOS
- **🌐 i18n** — 8 idiomas: Español Latino, Español España, English US/UK, Português BR, 日本語, 한국어, 中文
- **🎯 Publicidad autogestionada** — Panel admin para configurar scripts de ads por slot sin tocar código
- **🔞 Control de contenido** — Sistema +18 y moderación de peticiones

## 🛠️ Tech Stack

| Área | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| ORM | Prisma + SQLite (dev) / PostgreSQL (prod) |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| i18n | next-intl |
| Pagos | Lemon Squeezy |
| Auth | Custom JWT + cookie rotation |
| Deploy | Vercel |

## 🚀 Instalación local

### Requisitos
- Node.js 18+
- npm o pnpm

### Pasos

```bash
# 1. Clonar el repo
git clone https://github.com/MangaZen-Admin/MangaZen.git
cd MangaZen

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Inicializar la base de datos
npx prisma migrate dev
npx prisma generate

# 5. (Opcional) Cargar datos de prueba
npx prisma db seed

# 6. Arrancar el servidor de desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

## ⚙️ Variables de entorno

```env
# Base
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Cloudinary (imágenes en producción)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Lemon Squeezy (pagos)
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_WEBHOOK_SECRET=
LEMON_SQUEEZY_VARIANT_MINI=
LEMON_SQUEEZY_VARIANT_STARTER=
LEMON_SQUEEZY_VARIANT_BASIC=
LEMON_SQUEEZY_VARIANT_PLUS=
LEMON_SQUEEZY_VARIANT_PRO=
```

## 📁 Estructura del proyecto

```
src/
├── app/              # Rutas Next.js (App Router)
│   ├── (public)/     # Páginas públicas
│   ├── [locale]/     # Rutas con locale
│   └── api/          # API Routes (62 endpoints)
├── components/       # Componentes React
├── lib/              # Utilidades y helpers
├── messages/         # Traducciones i18n (8 locales)
└── hooks/            # Custom hooks
prisma/
├── schema.prisma     # Schema de BD
└── migrations/       # Historial de migraciones
```

## 🔐 Roles de usuario

| Rol | Permisos |
|-----|---------|
| USER | Lectura, comentarios, favoritos |
| CREATOR | Todo lo de USER + subir obras propias |
| SCAN | Todo lo de CREATOR + panel de scanlation |
| ADMIN | Acceso total + moderación |

## 📄 Licencia

Todos los derechos reservados © 2026 MangaZen
