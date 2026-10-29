# Cómo poner Nia CV en Internet con usuario y contraseña

**Qué vas a conseguir:** una dirección web (por ejemplo `https://tu-usuario.github.io/nia-cv/`)
que podrás abrir en cualquier móvil, tablet u ordenador. Entrarás con tu **correo y
contraseña** y verás siempre los mismos datos en todos los dispositivos.

> **Antes de empezar: sobre el inglés.** Las webs de Supabase y GitHub solo están en
> inglés. En esta guía escribo **el nombre exacto del botón tal como aparece en pantalla**
> (para que lo encuentres) y, entre paréntesis, *su traducción*. Al final tienes un
> diccionario con todos los términos.

## Qué hace cada pieza

| Pieza | Para qué sirve | Precio |
|---|---|---|
| **Supabase** | Guarda las cuentas (correo y contraseña) y los datos en la nube | Gratis |
| **GitHub** | Guarda el código de la app y la publica como página web (función *GitHub Pages*, "páginas de GitHub") | Gratis |
| **Cosyra** (opcional) | Permite modificar el código desde el móvil. **No guarda los datos de Nia** | Según su plan |

Tiempo aproximado: 15 minutos. Todo se hace desde el navegador; no hace falta instalar nada.

---

## Paso 1 · Crear la base de datos en Supabase

1. Entra en <https://supabase.com> y pulsa **Start your project** (*empieza tu proyecto*).
   Crea una cuenta (puedes usar tu cuenta de GitHub o tu correo).
2. Pulsa **New project** (*nuevo proyecto*) y rellena:
   - **Name** (*nombre*): `nia-cv`
   - **Database Password** (*contraseña de la base de datos*): inventa una y guárdala en un
     sitio seguro. La app no la usa, pero Supabase la pide.
   - **Region** (*región*, dónde está el servidor): elige **West EU (Ireland)** (*Europa
     occidental, Irlanda*) o **Central EU (Frankfurt)** (*Europa central, Fráncfort*).
   - Pulsa **Create new project** (*crear proyecto nuevo*) y espera uno o dos minutos.
3. En el menú de la izquierda, entra en **SQL Editor** (*editor de SQL*, donde se escriben
   órdenes para la base de datos) y pulsa **New query** (*nueva consulta*).
4. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** su contenido,
   pégalo en el recuadro y pulsa **Run** (*ejecutar*).
   - Debe aparecer **Success. No rows returned** (*correcto; no hay filas que mostrar*).
   - Con esto se crean tres tablas: **biberones**, **deposiciones** y **ajustes**, con
     las reglas para que cada cuenta solo vea lo suyo.
5. Ahora copia los dos datos de conexión. Pulsa el botón **Connect** (*conectar*) en la
   parte de arriba, o ve a **Project Settings → API Keys** (*ajustes del proyecto → claves
   de acceso*). Necesitas:
   - **Project URL** (*dirección del proyecto*): algo como `https://abcdxyz.supabase.co`
   - **anon public key** o **publishable key** (*clave pública*): un texto largo que
     empieza por `eyJ…` o por `sb_publishable_…`

   ⚠️ **No copies nunca** la clave **service_role** o **secret** (*clave de servicio* o
   *secreta*). Esa clave da acceso a todo y no debe ir en la web.

## Paso 2 · Poner esos dos datos en la app

Abre el archivo `js/config.js` y escribe los dos datos entre las comillas:

```js
export const SUPABASE_URL = 'https://abcdxyz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

(Si me los pasas en el chat, lo hago yo.) Estos dos datos **pueden ser públicos**: por sí
solos no dan acceso a ningún registro, porque las reglas del Paso 1 exigen entrar con
correo y contraseña, y cada cuenta solo ve sus datos.

## Paso 3 · Publicar la web con GitHub

1. Entra en <https://github.com/new> (*crear un repositorio nuevo*; un repositorio es la
   carpeta donde GitHub guarda el código).
   - **Repository name** (*nombre del repositorio*): `nia-cv`
   - Déjalo en **Public** (*público*). Publicar la web desde un repositorio **Private**
     (*privado*) exige pagar GitHub Pro. Que el código sea público no expone tus datos:
     los registros están en Supabase, protegidos por contraseña.
   - Pulsa **Create repository** (*crear repositorio*).
2. Sube los archivos: pulsa **uploading an existing file** (*subir un archivo existente*)
   o **Add file → Upload files** (*añadir archivo → subir archivos*), arrastra **todo el
   contenido** de la carpeta `nia-cv` y pulsa **Commit changes** (*guardar los cambios*).
   (Si conectas GitHub en claude.ai y me dices el nombre del repositorio, lo subo yo.)
3. Activa la publicación: en el repositorio, **Settings** (*ajustes*) → **Pages**
   (*páginas*). En **Build and deployment** (*publicación*), en **Source** (*origen*) elige
   **Deploy from a branch** (*publicar desde una rama*). En **Branch** (*rama*) elige
   `main` y la carpeta `/ (root)` (*raíz*). Pulsa **Save** (*guardar*).
4. Espera uno o dos minutos y recarga la página: arriba aparecerá **Your site is live at…**
   (*tu web está publicada en…*) con tu dirección, por ejemplo
   `https://tu-usuario.github.io/nia-cv/`.

## Paso 4 · Decirle a Supabase cuál es tu web

Así los correos de "confirma tu cuenta" y "recuperar contraseña" llevan a tu web.

En Supabase: **Authentication** (*autenticación*, la parte de usuarios) → **URL
Configuration** (*configuración de direcciones*):
- **Site URL** (*dirección de la web*): pega `https://tu-usuario.github.io/nia-cv/`
- **Redirect URLs** (*direcciones permitidas para volver*): pulsa **Add URL** (*añadir
  dirección*), pega la misma dirección y guarda con **Save** (*guardar*).

## Paso 5 · Crear tu cuenta y cerrar el registro a otras personas

1. Abre tu web y pulsa **Crear una cuenta nueva**. Escribe tu correo y una contraseña
   (mínimo 8 caracteres).
2. Te llegará un correo de Supabase (en inglés) titulado **Confirm Your Signup**
   (*confirma tu registro*). Pulsa el enlace **Confirm your mail** (*confirma tu correo*).
   Si no lo ves, mira en la carpeta de correo no deseado.
3. Vuelve a la web y entra con tu correo y contraseña.
4. **Muy importante:** para que nadie más pueda crearse una cuenta en tu web, en Supabase
   ve a **Authentication → Sign In / Providers** (*autenticación → formas de acceso*) y
   desactiva **Allow new users to sign up** (*permitir que se registren usuarios nuevos*).
   Pulsa **Save changes** (*guardar cambios*). Tu cuenta sigue funcionando.
5. Para que otra persona (la otra mamá o el otro papá, una abuela…) use el diario,
   **comparte con ella el mismo correo y contraseña**. Veréis los mismos datos y los cambios
   aparecerán en vivo en todos los dispositivos.

## Paso 6 · Ponerla en la pantalla de inicio del iPhone

1. Abre tu web en **Safari**.
2. Pulsa el botón **Compartir** (el cuadrado con una flecha hacia arriba).
3. Elige **Añadir a pantalla de inicio** y pulsa **Añadir**.

Se abrirá como una app, a pantalla completa y con la sesión iniciada.

---

## ¿Se guarda todo lo que introduzco?

Sí. Así funciona cada vez que pulsas **Guardar**:

1. El registro se guarda **en el dispositivo al instante** (aunque no haya conexión).
2. Inmediatamente se envía a la nube, a tu cuenta.
3. Arriba, en la pantalla **Hoy**, un indicador te dice en qué punto está:
   - **En la nube** → todo está guardado en tu cuenta.
   - **Guardando…** → se está enviando.
   - **Sin conexión · 1 por subir** → está guardado en el móvil esperando conexión. Se sube
     **solo** cuando vuelve la red, aunque cierres la app entretanto.
4. Si intentas cerrar la sesión con algo sin subir, la app te avisa antes.

## Copias de seguridad

Aunque todo está en la nube, conviene descargar de vez en cuando una copia: **Ajustes →
Crear copia de seguridad**. Para abrir los datos en Numbers o Excel: **Ajustes → Exportar
registros (CSV)**.

En el plan gratuito, Supabase **pausa los proyectos que pasan una semana sin ningún uso**.
Si te ocurre, entra en supabase.com y pulsa **Restore project** (*reactivar el proyecto*):
los datos no se pierden. Usando la app a diario no ocurre.

## Si ya usabas Nia CV sin cuenta

La primera vez que entres con tu cuenta en ese mismo dispositivo, la app detectará los
registros antiguos y te preguntará si quieres subirlos a tu cuenta (sin duplicarlos).

## Ver tus datos directamente en Supabase

En Supabase → **Table Editor** (*editor de tablas*) verás las tablas **biberones**,
**deposiciones** y **ajustes**, con columnas en castellano: `fecha_hora`, `preparado_ml`,
`tomado_ml`, `consistencia`, `observaciones`… La fecha está guardada como número
(milisegundos); la app la muestra en tu hora local. Te recomiendo **no editar** los datos
desde ahí: usa la app.

## Modificar la app desde el móvil con Cosyra (opcional)

Cosyra no guarda los datos de Nia, pero sirve para cambiar el código desde el teléfono:

1. En Cosyra, abre un espacio de trabajo y escribe:
   `git clone https://github.com/TU-USUARIO/nia-cv` (*copia tu repositorio*).
2. Pide a Claude Code los cambios que quieras, en castellano.
3. Súbelos con `git push` (*enviar los cambios a GitHub*). En un par de minutos la web se
   actualiza sola.

---

## Diccionario de términos

| Aparece en pantalla | Qué significa |
|---|---|
| Add file / Upload files | Añadir archivo / Subir archivos |
| Add URL | Añadir dirección |
| Allow new users to sign up | Permitir que se registren usuarios nuevos |
| anon public key / publishable key | Clave pública (se puede poner en la web) |
| API Keys | Claves de acceso |
| Authentication | Autenticación (usuarios y contraseñas) |
| Branch | Rama (versión del código; usa `main`, la principal) |
| Build and deployment | Publicación de la web |
| Commit changes | Guardar los cambios en GitHub |
| Confirm your mail / Confirm Your Signup | Confirma tu correo / Confirma tu registro |
| Connect | Conectar (muestra los datos de conexión) |
| Create new project / Create repository | Crear proyecto nuevo / Crear repositorio |
| Database Password | Contraseña de la base de datos |
| Deploy from a branch | Publicar desde una rama |
| New project / New query | Proyecto nuevo / Consulta nueva |
| Pages (GitHub Pages) | Páginas de GitHub: publica la web gratis |
| Private / Public | Privado / Público |
| Project Settings | Ajustes del proyecto |
| Project URL | Dirección del proyecto |
| Redirect URLs | Direcciones a las que se puede volver desde los correos |
| Region | Región (dónde está el servidor) |
| Repository | Repositorio (carpeta del código en GitHub) |
| Restore project | Reactivar el proyecto |
| Run | Ejecutar |
| Save / Save changes | Guardar / Guardar cambios |
| service_role / secret key | Clave secreta: **nunca** la pongas en la web |
| Settings | Ajustes |
| Sign In / Providers | Formas de acceso |
| Site URL | Dirección de la web |
| Source | Origen (de dónde se publica la web) |
| SQL Editor | Editor de SQL (para dar órdenes a la base de datos) |
| Start your project | Empieza tu proyecto |
| Success. No rows returned | Correcto; no hay filas que mostrar |
| Table Editor | Editor de tablas (ver los datos guardados) |
| Your site is live at… | Tu web está publicada en… |
| git clone / git push | Copiar un repositorio / Enviar cambios a GitHub |
