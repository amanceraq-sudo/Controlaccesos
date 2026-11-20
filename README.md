# AccesoVivo — Tracking móvil + geocercas

Monorepo para ver en **tiempo real** el movimiento de dispositivos móviles sobre un **mapa Leaflet**, dibujar **geocercas** y detectar **quién entra y quién sale**.

| Pieza | Tecnología |
|-------|------------|
| Web | Svelte + Leaflet |
| API | Node.js + Express |
| DB | MongoDB Atlas |
| Hosting | **Vercel** (frontend + API REST serverless) |
| Móvil | Flutter (**pendiente**) → REST HTTPS |

## Estructura

```text
/
├── api/index.js          # Entry serverless Vercel (móvil + web)
├── apps/
│   ├── api/              # Lógica Express + Socket.IO (local)
│   └── web/              # Cliente Svelte + Leaflet
├── vercel.json
└── package.json          # npm workspaces
```

## Desarrollo local

```bash
cp .env.example apps/api/.env
# Edita MONGODB_URI y JWT_SECRET

npm install
npm run seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000/api/health  

En local, Socket.IO está activo. En Vercel se usa **REST + polling**.

## Siguiente paso crítico: Socket.IO (móvil)

`https://controlaccesos-one.vercel.app` sirve el **panel web + REST**, pero **Vercel no soporta Socket.IO persistente**.

Para el cliente Flutter con GPS en tiempo real necesitas un API Node (incluido en este monorepo) en **Render** (WebSockets OK):

1. Entra a https://dashboard.render.com y crea un **Web Service** desde el repo `Controlaccesos`
2. Usa el `render.yaml` de la raíz (o build `npm install --workspace=@control-accesos/api` / start `npm run start -w @control-accesos/api`)
3. Variables: `MONGODB_URI`, `JWT_SECRET`, `ENABLE_SOCKET=true`, `CORS_ORIGIN=*`
4. Obtén la URL tipo `https://accesovivo-api.onrender.com`
5. Recompila el APK apuntando a esa URL:

```powershell
cd apps/mobile
.\build_apk.ps1 -ApiBaseUrl "https://TU-SERVICIO.onrender.com"
```

En Vercel (frontend) agrega:
- `VITE_API_URL=https://TU-SERVICIO.onrender.com/api`
- `VITE_SOCKET_URL=https://TU-SERVICIO.onrender.com`
- `VITE_ENABLE_SOCKET=true`

Así el mapa web también recibe sockets en vivo.

### APK

- Escritorio: `AccesoVivo.apk`
- Proyecto: `apps/mobile/dist/accesovivo-release.apk`

Login demo móvil: `movil1@accesos.local` / `Movil123!`

## Publicar en Vercel (monorepo)

### 1. Sube el repo y crea un proyecto

- Root Directory: `.` (raíz del monorepo)
- Framework Preset: **Other**
- Build Command / Output: ya vienen en `vercel.json`

### 2. Variables de entorno en Vercel

| Variable | Valor |
|----------|--------|
| `MONGODB_URI` | Connection string de Atlas |
| `JWT_SECRET` | Secreto largo |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `*` (o tu dominio) |
| `SEED_ADMIN_EMAIL` | opcional |
| `SEED_ADMIN_PASSWORD` | opcional |

> No subas `.env` al repositorio. Configura los secretos solo en el dashboard de Vercel.

### 3. Deploy

```bash
npx vercel
# producción:
npx vercel --prod
```

Tras el deploy:

- Web: `https://<proyecto>.vercel.app`
- API health: `https://<proyecto>.vercel.app/api/health`

### 4. Seed (una vez)

El seed se ejecuta en local contra Atlas:

```bash
npm run seed
```

## Acceso desde dispositivos móviles

La API pública (HTTPS) es la misma URL de Vercel. Flutter **no necesita Socket.IO** en este hosting.

### Base URL

```text
https://<proyecto>.vercel.app/api
```

### Flujo móvil recomendado

1. `POST /api/auth/login` → `{ email, password }` → recibe `token`
2. Cada N segundos: `POST /api/tracking/location` con header  
   `Authorization: Bearer <token>`

```json
{
  "lat": 19.4326,
  "lng": -99.1332,
  "accuracy": 12,
  "heading": 90,
  "speed": 1.2,
  "source": "mobile"
}
```

3. El panel web en Vercel refresca posiciones/eventos por **polling** y muestra enter/exit de geocercas.

### Otros endpoints útiles

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/health` | Healthcheck |
| GET | `/api/auth/me` | Usuario del token |
| GET | `/api/geofences` | Listar geocercas |
| GET | `/api/tracking/positions` | Posiciones en vivo (admin/guard) |
| GET | `/api/tracking/events` | Historial enter/exit |

## Socket.IO

| Entorno | Estado |
|---------|--------|
| `npm run dev` (Node local) | Activo (`location:update`) |
| Vercel serverless | **No disponible** (limitación de WebSockets) |

Para producción con WebSockets reales más adelante, se puede mover solo el proceso Socket a un host Node (Railway/Render/Fly) y dejar web+REST en Vercel.

## Credenciales demo (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@accesos.local | Admin123! |
| Operador | guardia@accesos.local | Guardia123! |
| Dispositivo 1 | movil1@accesos.local | Movil123! |
| Dispositivo 2 | movil2@accesos.local | Movil123! |
