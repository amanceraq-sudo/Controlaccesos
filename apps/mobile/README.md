# AccesoVivo Mobile (Flutter)

Cliente Android que usa el **GPS físico** y envía ubicaciones por **Socket.IO** (`location:update`).

## Importante sobre el backend

`https://controlaccesos-one.vercel.app` sirve bien el panel web y la API REST, pero **Vercel no mantiene Socket.IO**.

Para sockets necesitas el API Node en un host persistente (Render/Railway). Hay un `render.yaml` en la raíz del monorepo.

## Build APK

```bash
cd apps/mobile
flutter pub get

# Reemplaza la URL por tu API con Socket.IO (Render):
flutter build apk --release --dart-define=API_BASE_URL=https://TU-SERVICIO.onrender.com
```

APK:
`build/app/outputs/flutter-apk/app-release.apk`

## Credenciales demo

- `movil1@accesos.local` / `Movil123!`
- `movil2@accesos.local` / `Movil123!`
