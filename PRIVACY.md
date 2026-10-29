# Política de privacidad — Nia CV

_Última actualización: 29 de octubre de 2026_

Nia CV es un diario personal para anotar biberones y deposiciones de un bebé. Está diseñada
para que tus datos sean sólo tuyos.

## Qué datos se guardan
- El nombre del bebé que escribas en Ajustes (por defecto, “Nia”).
- Los registros que introduces: fecha y hora, cantidades de leche, consistencia de las
  deposiciones y observaciones opcionales.
- Tus preferencias (cantidades rápidas, referencia de próximo biberón).

No se piden fechas de nacimiento, datos de salud adicionales, ubicación, contactos, fotos ni
ningún dato de identificación de la familia.

## Dónde se guardan
**Versión con cuenta (usuario y contraseña):** en el dispositivo y en una base de datos
Supabase (Postgres) del proyecto del responsable de la app, con conexión cifrada (HTTPS).
Reglas de seguridad a nivel de fila (Row Level Security) impiden que una cuenta lea o
modifique registros de otra. La contraseña la gestiona Supabase Auth y nunca se guarda en
texto plano. Al cerrar sesión se borra la copia del dispositivo. Para borrar la cuenta y
todos sus datos, el responsable puede eliminar el usuario en Supabase (los registros se
borran en cascada).

**Versión sin cuenta:** exclusivamente en el almacenamiento local del dispositivo en el que usas la app
(IndexedDB del navegador / de la app instalada). Funciona sin conexión a Internet.

## Qué NO hace la app
- En la versión sin cuenta, no envía tus registros a ningún servidor.
- En la versión con cuenta, solo los envía a la base de datos de Supabase descrita arriba.
- No incluye analíticas, cookies de seguimiento ni publicidad. La única librería externa es
  el cliente oficial de Supabase (en la versión con cuenta), incluido en la propia app.
- No carga recursos externos: las fuentes e ilustraciones van incluidas en la propia app.

Conexiones a Internet: la descarga de los archivos de la propia aplicación desde la
dirección donde está publicada y, solo en la versión con cuenta, la comunicación cifrada
con Supabase para iniciar sesión y guardar o leer tus registros.

## Exportaciones y copias de seguridad
Si usas “Exportar registros (CSV)” o “Crear copia de seguridad”, se genera un archivo en tu
dispositivo. Tú decides dónde guardarlo o con quién compartirlo (Archivos, iCloud Drive,
correo…). A partir de ese momento, ese archivo queda sujeto a la privacidad del servicio que
elijas.

## Borrado
- *Ajustes → Borrar todos los registros* elimina todos los registros del dispositivo.
- Eliminar la app de la pantalla de inicio (o borrar los datos del sitio en Safari) también
  borra los datos.

## Sincronización
La versión actual no sincroniza entre dispositivos. Si en el futuro se añade, será opcional,
requerirá tu autorización explícita, usará conexiones cifradas y esta política se actualizará
explicando claramente cómo y dónde se almacenan los datos.

## Información médica
Nia CV es un registro personal. No ofrece diagnósticos ni recomendaciones médicas y no
sustituye la valoración de un profesional sanitario.

## Contacto
Si distribuyes esta app públicamente, añade aquí un correo de contacto del responsable.
