# Poner Nia CV en Internet con usuario y contraseña

Resultado final: una dirección web (por ejemplo `https://tu-usuario.github.io/nia-cv/`)
que abres en cualquier móvil, tablet u ordenador, entras con **correo y contraseña** y ves
siempre los mismos datos.

| Pieza | Para qué sirve | Coste |
|---|---|---|
| **GitHub** (repositorio + GitHub Pages) | Guarda el código y publica la web con HTTPS | Gratis |
| **Supabase** | Cuentas con contraseña y base de datos en la nube | Gratis (plan Free) |
| **Cosyra** (opcional) | Editar el código y subir cambios a GitHub desde el móvil | Según su plan |

Tiempo aproximado: 15 minutos. Todo se puede hacer desde el navegador.

---

## Paso 1 · Crear la base de datos en Supabase

1. Entra en <https://supabase.com> → **Start your project** y crea una cuenta.
2. **New project**. Nombre: `nia-cv`. Escribe una contraseña de base de datos (guárdala,
   aunque la app no la usa). Región: **West EU (Ireland)** o la más cercana. **Create**.
3. Cuando termine de prepararse, menú izquierdo → **SQL Editor** → **New query**.
4. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** su contenido,
   pégalo y pulsa **Run**. Debe decir *Success. No rows returned*.
5. Menú → **Project Settings → API** (o el botón **Connect**). Copia dos datos:
   - **Project URL** (algo como `https://abcdxyz.supabase.co`)
   - **anon public key** (una clave larga que empieza por `eyJ…`, o `sb_publishable_…`)

   ⚠️ No uses nunca la clave **service_role / secret**: esa sí es secreta.

## Paso 2 · Poner esos datos en la app

Abre `js/config.js` y rellena:

```js
export const SUPABASE_URL = 'https://abcdxyz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

Estos dos valores pueden estar en un repositorio público: solo permiten lo que dejan las
reglas de seguridad del Paso 1 (cada cuenta ve únicamente sus propios registros).

## Paso 3 · Publicar la web con GitHub Pages

1. En <https://github.com/new> crea un repositorio llamado `nia-cv` (puede ser público;
   para GitHub Pages en repositorios **privados** hace falta GitHub Pro).
2. Sube todos los archivos de la carpeta `nia-cv` (botón **Add file → Upload files**, o
   desde Cosyra con `git push`).
3. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch → Branch: `main` / `(root)` → Save**.
4. En uno o dos minutos la web estará en `https://TU-USUARIO.github.io/nia-cv/`.

## Paso 4 · Decirle a Supabase cuál es tu web

Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://TU-USUARIO.github.io/nia-cv/`
- **Redirect URLs** → *Add URL*: la misma dirección.

Así los correos de confirmación y de "he olvidado la contraseña" llevan a tu web.

## Paso 5 · Crear tu cuenta y cerrar el registro

1. Abre tu web → **Crear una cuenta nueva** → correo + contraseña (mínimo 8 caracteres).
2. Confirma el correo que te llega (revisa spam) y entra.
3. **Importante:** para que nadie más pueda crear cuentas en tu web, en Supabase →
   **Authentication → Sign In / Providers** (o *Settings*) desactiva **Allow new users to
   sign up**. Tu cuenta sigue funcionando.
4. Comparte el correo y la contraseña con quien cuide de Nia: entrando con la misma cuenta
   veis los mismos datos y los cambios aparecen en vivo en todos los dispositivos.

## Paso 6 · En el iPhone

Safari → tu web → **Compartir → Añadir a pantalla de inicio**. Se abrirá como una app,
con la sesión iniciada.

---

## ¿Se guarda todo lo que introduzco?

Sí, así funciona:
1. Al pulsar **Guardar**, el registro se guarda **en el dispositivo al instante**.
2. Inmediatamente se envía a la nube. El indicador de la pantalla **Hoy** muestra:
   - **En la nube**: todo está guardado en tu cuenta.
   - **Guardando…**: se está enviando.
   - **Sin conexión · N por subir**: hay cambios guardados en el móvil esperando red. Se
     suben **solos** al volver la conexión, aunque cierres la app entretanto.
3. Si cierras la sesión con cambios sin subir, la app te avisa antes.

## Copias de seguridad

Aunque los datos están en la nube, conviene descargar de vez en cuando una copia:
*Ajustes → Crear copia de seguridad* (y *Exportar CSV* para Numbers o Excel). En el plan
gratuito, Supabase pausa los proyectos que pasan **una semana sin ningún uso**; se
reactivan desde su panel con un clic y los datos no se pierden. Usando la app a diario
no ocurre.

## Si ya usabas Nia CV sin cuenta

Al entrar por primera vez en el mismo dispositivo, la app detecta los registros antiguos y
pregunta si quieres subirlos a tu cuenta (sin duplicar).

## Actualizar la app desde el móvil con Cosyra

Cosyra no guarda los datos de Nia, pero sirve para modificar el código desde el teléfono:
abre un espacio de trabajo, clona tu repositorio (`git clone https://github.com/TU-USUARIO/nia-cv`),
pide los cambios a Claude Code y súbelos con `git push`. GitHub Pages publica la nueva
versión en un par de minutos.
