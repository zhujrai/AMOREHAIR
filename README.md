# AMOREHAIR — despachos, pedidos y catálogo de Amore Salon

Web estática (Vite + React + Tailwind) que habla con Supabase. En producción se publica solo `dist/` (Vercel hoy; Cloudflare Pages previsto). `server.ts` (Express) es solo para desarrollo local y **no corre en producción**.

## Páginas
| Ruta | Quién | Qué es |
|---|---|---|
| `/` | administradores | Tablero de despachos (requiere iniciar sesión con Supabase Auth) |
| `/pedidos` | público | Formulario de pedido. Acepta `?ref=AMR_049` (origen), `?c=CO-1` (consulta) y `?items=texto` (productos) |
| `/catalogo` · `/catalogo/<rutina>` | público | Catálogo por escenas: foto de la rutina con productos tocables → consulta por WhatsApp |
| `/consultas` | administradores | Bandeja de consultas del catálogo: estado, precio final con motivo, enlace de despacho |

## Desarrollo local
```bash
bun install            # o npm install
cp .env.example .env.local   # y rellenar VITE_SUPABASE_URL / VITE_SUPABASE_KEY (usar el proyecto de PRUEBAS)
node node_modules/vite/bin/vite.js --port 5173
node node_modules/typescript/bin/tsc --noEmit   # revisión de tipos
```
Compilar solo el frontend (lo que se despliega): `vite build` (el script `build` del package.json también empaqueta `server.ts`, que no se usa en producción).
**No desplegar desde un equipo con `.env.local`**: el build incrusta esos valores.

## Seguridad (resumen)
- Los administradores entran con **Supabase Auth**; la sesión se cierra tras 8 h sin actividad (máx. 12 h). Ver `src/utils/auth.ts`.
- La base usa **RLS**: el público solo puede *crear* pedidos y consultas y *leer* configuración, agencias y catálogo; los administradores (tabla `admins`) hacen el resto.
- No hay contraseñas ni claves en el código; los secretos viven en el panel del hosting y en el gestor de secretos del arnés de conocimiento.
- Migraciones SQL, pruebas de políticas y plan de paso a producción: repositorio **Amore-Conocimiento** (`supabase/migraciones`, `scripts/probar-rls.mjs`, `docs/plan-paso-a-produccion.md`).

## Estructura
- `src/components/` pantallas y modales · `src/utils/dbApi.ts` acceso a datos · `src/utils/auth.ts` sesión de administradores
- `public/fotos-catalogo/` fotos de las rutinas del catálogo (copias optimizadas)
