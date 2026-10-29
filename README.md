# Nia CV — Baby Care

Diario elegante y privado para registrar **biberones** y **deposiciones** de Nia desde el iPhone.
Funciona sin conexión, no necesita cuenta y guarda los datos sólo en el dispositivo.

> **Qué es exactamente:** una **aplicación web instalable (PWA)**. Se añade a la pantalla de
> inicio del iPhone desde Safari y se abre a pantalla completa, con su icono, sin barra del
> navegador y sin Internet. **No** es una app nativa compilada con Xcode, no hay archivo IPA
> firmado y no está publicada en la App Store (este proyecto se desarrolló en un entorno
> Linux sin Xcode). Ver “Camino a una app nativa” más abajo.

---

## Versión web con usuario y contraseña (recomendada)

Web publicada con **GitHub Pages** (*páginas de GitHub*, publicación gratuita), cuentas con contraseña y datos en la nube con
**Supabase**. Cada registro se guarda primero en el dispositivo y se sube a la nube; si no hay
conexión, espera y se sube solo. Guía paso a paso: **[PUESTA-EN-MARCHA.md](PUESTA-EN-MARCHA.md)**.

Piezas: `js/config.js` (URL y clave pública de Supabase), `supabase/schema.sql` (tablas y
reglas de seguridad por usuario), `js/auth.js` (acceso), `js/sync.js` (guardar en local +
bandeja de envío + sincronización), `js/remote-supabase.js` (conexión con Supabase),
`js/vendor/supabase.js` (supabase-js 2.117.3, MIT, incluido para funcionar sin conexión).
Con `config.js` vacío la app funciona en modo local, sin cuenta.

Pruebas: `tests/sync.test.mjs` (envío diferido, reintentos, cambios de otro dispositivo) y
`tests/e2e-cloud.mjs` (dos dispositivos contra una nube simulada: registro, acceso, en vivo,
sin conexión, cierre de sesión y aislamiento entre cuentas).

## 0. Versión en claude.ai (alternativa)

Nia CV está publicada como página privada de claude.ai:
**https://claude.ai/artifact/VbZjPjZUgSSML29PVVnZaJ**

- Se abre en cualquier móvil, tablet u ordenador con tu sesión de Claude iniciada.
- Los registros se guardan en la base de datos de esa página y se sincronizan al momento
  entre dispositivos (si el móvil y la tablet están abiertos, los cambios aparecen en ambos).
- Es privada: solo tú puedes abrirla. Para que otra persona registre tomas, compártela desde
  el menú **Compartir** como Colaborador o Editor.
- Necesita conexión. Sin cuenta de Claude o fuera de claude.ai, la app funciona en modo local
  (IndexedDB) como se describe abajo.
- Para pasar datos de la versión local a la nube: en la local, *Ajustes → Crear copia de
  seguridad*; en la nube, *Ajustes → Restaurar copia* (se fusiona sin duplicados).

Detalle técnico: `CloudAdapter` en `js/store.js` guarda un documento por mes
(`months/AAAA-MM`) con mapas `{ bottles: {id: registro}, poops: {...} }`. Cada cambio fusiona
solo su propio registro, así que dos dispositivos que escriben a la vez no se pisan. Los
borrados quedan como `null`. `claude.html` es la página que se publica; `index.html` es la
versión PWA local. Pruebas: `tests/cloud.test.mjs`.

## 1. Instalarla en el iPhone (≈ 5 minutos)

La app tiene que estar publicada en una dirección **HTTPS** para que el iPhone la guarde
y funcione sin conexión. Cualquier hosting estático gratuito sirve. La opción más sencilla:

### Opción A — Netlify Drop (sin cuentas técnicas ni terminal)
1. En un ordenador, abre <https://app.netlify.com/drop>.
2. Arrastra la carpeta `nia-cv` completa (o descomprime `nia-cv.zip` y arrastra la carpeta).
3. Netlify te da una dirección del tipo `https://nombre-aleatorio.netlify.app`.
   (Crea una cuenta gratuita para que la dirección no caduque.)

### Opción B — GitHub Pages
1. Sube el contenido de esta carpeta a un repositorio de GitHub.
2. En el repositorio: **Settings** (*ajustes*) → **Pages** (*páginas*) → **Deploy from a branch**
   (*publicar desde una rama*) → rama `main`, carpeta `/ (root)` (*raíz*) → **Save** (*guardar*).
3. La app quedará en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

### Añadir a la pantalla de inicio
1. Abre la dirección en **Safari** en el iPhone.
2. Pulsa **Compartir** (cuadrado con flecha) → **Añadir a pantalla de inicio** → **Añadir**.
3. Abre **Nia CV** siempre desde ese icono.

> Importante: usa siempre el icono de la pantalla de inicio. iOS guarda los datos de la app
> instalada de forma separada a los de Safari, y los conserva aunque cierres la app o
> reinicies el iPhone. Si borras el icono, se borran sus datos: **haz copias de seguridad**
> desde *Ajustes → Crear copia de seguridad* (puedes guardarlas en Archivos / iCloud Drive).

## 2. Ejecutarla en local (desarrollo)

Requisitos: Node.js 18 o superior. No hay dependencias que instalar.

```bash
npm start          # servidor en http://localhost:5173
npm test           # pruebas de lógica (fechas, totales, CSV, importación) en 4 zonas horarias
```

Pruebas de extremo a extremo en un iPhone emulado (requieren Playwright con Chromium):

```bash
npm start &                      # en otra terminal
node tests/e2e.mjs               # flujos completos + capturas en docs/screenshots
node tests/offline.mjs           # comprueba que abre sin conexión
node scripts/make-icons.mjs      # regenera los iconos PNG desde la ilustración SVG
```

## 3. Qué incluye

| Pantalla | Funciones |
|---|---|
| **Hoy** | Saludo con nombre y fecha · tarjeta de biberones (tomas, ml del día, último, próximo orientativo opcional) · tarjeta de pañales (nº, último, consistencia) · cronología del día; tocar un registro permite editarlo o eliminarlo |
| **Biberones** | Vista por día con flechas, gesto de deslizar y calendario · lista con hora, preparado, tomado y observaciones · resumen: total preparado, total tomado, nº de tomas y promedio |
| **Cacas** | Calendario mensual con punto (1) o contador (varias) · detalle del día tocado o “Sin registros” · historial agrupado (Hoy, Ayer, Hace N días…) con filtros por consistencia |
| **Diario** | Semana: gráfico discreto de ml por día, deposiciones por día y tabla para comparar días · Mes: calendario de actividad · detalle de cualquier día |
| **Ajustes** (icono arriba a la derecha en Hoy) | Nombre del bebé · cantidades rápidas configurables · referencia de próximo biberón (desactivada por defecto) · exportar CSV · copia de seguridad y restauración sin duplicados · borrar todo · privacidad |

**Formulario de biberón:** fecha y hora actuales rellenadas · atajos “Ahora / Hace 15 min /
30 min / 1 h” · cantidades rápidas 30–240 ml · botones ±10 ml y entrada manual de cualquier
valor · “preparado” recuerda la última cantidad usada y nunca queda por debajo de lo tomado ·
observación opcional.

**Formulario de deposición:** fecha, hora y consistencia con iconos de formas distintas
(gotita, forma redondeada, bolitas; “Muy líquida” aparte) · observaciones opcionales con
etiquetas rápidas · botón único “Guardar deposición”.

Otros detalles: **modo claro, oscuro o automático** (Ajustes → Apariencia; se recuerda en cada dispositivo), confirmación visual al guardar, confirmación antes de eliminar, mensajes
vacíos ilustrados, compatible con
el **tamaño de texto dinámico** de iOS, VoiceOver (etiquetas accesibles), áreas táctiles
≥ 44 pt y respeto a “Reducir movimiento”.

## 4. Arquitectura técnica

```
index.html               Contenedor de la app (pestañas + barra inferior)
manifest.webmanifest     Nombre, icono y modo pantalla completa
sw.js                    Service worker: caché de la app para uso sin conexión
css/styles.css           Sistema visual (tokens de color, tipografía, componentes, modo noche)
js/app.js                Arranque, navegación, estado de la interfaz y eventos
js/store.js              Capa de datos (IndexedDB → localStorage → memoria) + ajustes
js/dates.js              Fechas en hora local: claves de día, calendario, formato en español
js/stats.js              Totales y resúmenes calculados al vuelo + validaciones
js/data-io.js            CSV, copia de seguridad JSON e importación sin duplicados
js/forms.js              Formularios de biberón y deposición (crear / editar / eliminar)
js/ui.js                 Componentes: hoja inferior, diálogo, aviso, calendario, gestos
js/art.js                Iconos de trazo fino, logotipo e ilustraciones originales (SVG)
js/views/*.js            Pantallas: Hoy, Biberones, Cacas, Diario, Ajustes
fonts/                   Cormorant Garamond y DM Sans (SIL Open Font License), locales
tests/                   Pruebas unitarias, de extremo a extremo y sin conexión
```

- **Sin frameworks ni compilación:** JavaScript moderno (módulos ES), arranque inmediato.
- **Totales nunca almacenados:** se calculan siempre a partir de los registros, así que al
  editar o borrar se actualizan solos.
- **Fechas fiables:** cada registro guarda el instante exacto (`at`, milisegundos); el día se
  obtiene siempre en la zona horaria local del iPhone. Probado con cambios de horario,
  fin de mes/año y años bisiestos en Madrid, Nueva York, Sídney y UTC.
- **Preparada para sincronizar:** todos los registros tienen `id` (UUID), `createdAt` y
  `updatedAt`. La fusión de copias usa “gana la modificación más reciente”, que es la misma
  base que necesitaría una sincronización futura (p. ej. con iCloud/CloudKit o un servidor
  propio cifrado). Basta con añadir otro adaptador en `store.js`.

### Modelo de datos

En el código, los nombres internos (variables, funciones) están en inglés, que es lo
habitual en programación; todos los comentarios, textos de la app y documentos están en
castellano. En Supabase las tablas y columnas están en castellano:
`biberones(id, usuario_id, fecha_hora, preparado_ml, tomado_ml, observaciones, creado, modificado)`,
`deposiciones(id, usuario_id, fecha_hora, consistencia, observaciones, creado, modificado)` y
`ajustes(usuario_id, valor)`.

Formato interno en la app:

```js
// Biberón (almacén "bottles")
{ id: "uuid", at: 1761730500000, prepared: 150, taken: 120, notes: "",
  createdAt: 1761730510000, updatedAt: 1761730510000 }

// Deposición (almacén "poops")
{ id: "uuid", at: 1761730500000, consistency: "blanda" | "normal" | "dura" | "liquida",
  notes: "", createdAt: 1761730510000, updatedAt: 1761730510000 }
```

### Formato del CSV
Separador `;` y codificación UTF-8 con BOM (se abre directamente en Numbers y Excel en español):
`tipo;fecha;hora;preparado_ml;tomado_ml;consistencia;observaciones;creado;modificado;id`

## 5. Camino a una app nativa (SwiftUI + SwiftData)

La estructura está pensada para trasladarse 1:1 a una app nativa cuando se disponga de un Mac
con Xcode y una cuenta de Apple Developer:

| PWA | Nativo |
|---|---|
| `store.js` (IndexedDB) | `@Model Bottle`, `@Model Poop` con SwiftData; CloudKit para sincronizar |
| `dates.js` | `Calendar.current` (`startOfDay`, `dateComponents`) |
| `stats.js` | Propiedades calculadas / `@Query` filtradas por día |
| `views/*.js` | `TabView` con `HomeView`, `BottlesView`, `PoopsView`, `DiaryView` |
| `forms.js` | `.sheet` con `Form`, `DatePicker`, botones de cantidades |
| Gráfico del diario | Swift Charts (`BarMark`) |
| Copia JSON | Mismo formato → la app nativa puede importar las copias de la PWA |

## 6. Ilustraciones y marca

La app tiene su propia familia de **caniches**, dibujados en SVG en `js/characters.js`, de
cuerpo entero y con rasgos de la raza (pelo rizado, cara y hocico alargados, pompón en la
cabeza, orejas largas rizadas, patas finas con pompones):

| Personaje | Cómo es | Dónde aparece |
|---|---|---|
| **Nube** | Caniche gris plata, collar con medalla de estrella | Hoy, Biberones, tarjeta de biberones, estados vacíos |
| **Canela** | Caniche albaricoque, lazo azul en el pompón | Hoy, Cacas, tarjeta de pañales |
| **Mamá** | Caniche crema, con una flor | Diario y pantalla de acceso |
| **Papá** | Caniche chocolate, con bufanda | Diario y pantalla de acceso |

Son **diseños originales** de Nia CV: no se usan logotipos, personajes ni ilustraciones de
ninguna serie. Las fuentes son de uso libre (SIL OFL, licencias en `fonts/`).

## Pestaña "Nia": datos personales y álbum

- **Foto de cabecera** (también aparece en Hoy), reducida en el dispositivo (`js/photo.js`).
- **Datos personales**: nombre, fecha de nacimiento (la **edad** se calcula sola y aparece
  también en Hoy), **grupo sanguíneo** (A+, A−, B+, B−, AB+, AB−, 0+, 0− o "No lo sé") y
  **talla** en centímetros con la fecha de la medición. Se guardan con los ajustes.
- **Álbum del primer año**: nacimiento y meses 1 a 12. Cada mes muestra su fecha (calculada
  desde el nacimiento; si el día no existe en ese mes se usa el último), marca el mes
  actual y admite una foto y una nota. Tabla `album` en Supabase.
- "Borrar todos los registros" (Ajustes) **no** borra el álbum ni los datos personales.

## 7. Privacidad
Ver [`PRIVACY.md`](PRIVACY.md). En resumen: sin cuentas, sin servidores, sin analíticas;
los datos sólo salen del iPhone si tú exportas un archivo.
