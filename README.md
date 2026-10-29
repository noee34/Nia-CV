# Nia CV — Baby Care

Diario elegante y privado para registrar **biberones** y **deposiciones** de Nia desde el iPhone.
Funciona sin conexión, no necesita cuenta y guarda los datos sólo en el dispositivo.

> **Qué es exactamente:** una **aplicación web instalable (PWA)**. Se añade a la pantalla de
> inicio del iPhone desde Safari y se abre a pantalla completa, con su icono, sin barra del
> navegador y sin Internet. **No** es una app nativa compilada con Xcode, no hay archivo IPA
> firmado y no está publicada en la App Store (este proyecto se desarrolló en un entorno
> Linux sin Xcode). Ver “Camino a una app nativa” más abajo.

---

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
2. *Settings → Pages → Deploy from a branch → `main` / root*.
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

Otros detalles: confirmación visual al guardar, confirmación antes de eliminar, mensajes
vacíos ilustrados, modo noche cálido automático (según el ajuste del iPhone), compatible con
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

El cachorro azul (“Nube”), las estrellas, nubes y huellitas son **dibujos originales** creados
para Nia CV en SVG. No se usan logotipos, personajes ni ilustraciones de Bluey ni de ninguna
otra marca. Las fuentes son de uso libre (SIL OFL, licencias en `fonts/`).

## 7. Privacidad
Ver [`PRIVACY.md`](PRIVACY.md). En resumen: sin cuentas, sin servidores, sin analíticas;
los datos sólo salen del iPhone si tú exportas un archivo.
