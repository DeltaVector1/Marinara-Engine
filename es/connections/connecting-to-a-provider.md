# Conectarte a un proveedor de IA

Esta guía te muestra cómo conectar Marinara Engine a un proveedor de IA para que tus personajes puedan responder. Crearás una conexión, pegarás una API key (clave de API), elegirás un modelo y comprobarás que funciona.

## Qué es una conexión

Una conexión es una configuración guardada que le dice a Marinara Engine cómo llegar a un servicio de IA. Cada conexión guarda cuatro cosas: el proveedor, la API key o el inicio de sesión, la base URL (la dirección web del servicio) y el modelo.

Una API key es un código secreto de tu proveedor de IA. Funciona como una contraseña. Le permite a Marinara hablar con el servicio de IA y usar tu cuenta allí. Marinara guarda tu clave cifrada, y nunca se incluye cuando exportas una conexión.

Marinara Engine no viene con una conexión ya lista ni con una clave inicial gratuita. Una instalación nueva tiene cero conexiones. Debes crear al menos una conexión antes de poder empezar un chat.

## Abrir el panel Connections

Gestionas las conexiones en el panel **Connections** (Conexiones), en el lado derecho de la app.

Si todavía no tienes conexiones e intentas empezar un chat, Marinara muestra una ventana **Set Up** (Configurar). Esa ventana tiene un botón **Open Connections** (Abrir conexiones). Haz clic en él para saltar directo al panel **Connections**.

En la parte superior del panel verás tres botones. Muestran solo iconos, sin etiquetas de texto.

- **New** (Nuevo) (un icono de más) abre la ventana **Create Connection** (Crear conexión).
- **Import** (Importar) (un icono de flecha de descarga) carga conexiones desde un archivo.
- **Select** (Seleccionar) (un icono de marca de verificación) activa la selección en lote para que puedas exportar o eliminar varias conexiones a la vez.

## Crear una conexión

Sigue estos pasos para añadir tu primer proveedor.

1. En el panel **Connections**, haz clic en el botón **New** (el icono de más).
2. En la ventana **Create Connection**, escribe un **Name** (Nombre) para la conexión. Elige algo que reconozcas después, por ejemplo `GPT-4o Main`.
3. En **Provider** (Proveedor), haz clic en el botón del servicio que quieras, por ejemplo **OpenAI**, **Anthropic** u **OpenRouter**.
4. Haz clic en **Create** (Crear). Marinara crea la conexión y abre el **Connection Editor** (Editor de conexión) completo para ella.
5. Busca el campo **API Key**. Pega aquí tu clave del proveedor. Si todavía no tienes una clave, haz clic en el enlace **Get your {Provider} API key** debajo del campo. Ese enlace abre la página de claves del proveedor en tu navegador.
6. Abre el menú desplegable **Model** (Modelo) y elige un modelo. Puedes escribir en el cuadro **Search models…** para filtrar la lista. Si la lista está vacía, haz clic en **Fetch Models from API** para cargar los modelos que tu cuenta puede usar. Marinara guarda la lista obtenida con la conexión, para que el menú de modelos del área de entrada del chat pueda mostrarla más tarde sin volver a obtenerla.
7. Haz clic en **Save** (Guardar). El texto de estado cerca de la parte superior cambia a **Saved**.

Más adelante puedes cambiar el modelo sin abrir el editor: usa el Quick Connection Switcher (el icono de enlace en el área de entrada del chat) o el campo **Model** en **Chat Settings → Connection** (Ajustes del chat → Conexión). Consulta [El grupo aleatorio y el Quick Connection Switcher](organizing-connections.md#the-random-pool-and-quick-connection-switcher).

Normalmente no necesitas tocar el campo **Base URL**. Marinara lo rellena para los proveedores conocidos. Cámbialo solo si usas un proxy o un servidor local.

Para ver la lista de todos los proveedores compatibles, su configuración predeterminada y dónde obtener cada clave, consulta [Proveedores de IA compatibles](providers-reference.md).

Algunos proveedores usan un inicio de sesión local en lugar de una API key. Para esos no hay campo **API Key**. Consulta [Conexiones de suscripción de Claude, ChatGPT y Grok](subscription-clis.md).

Para conectar un modelo que se ejecuta en tu propia computadora, consulta [Conectar un modelo local o autoalojado](local-self-hosted.md).

## Probar tu conexión

La parte inferior del **Connection Editor** tiene una tarjeta **Connection Tests** (Pruebas de conexión). Úsala para confirmar que tu configuración funciona antes de chatear.

1. Haz clic en **Test Connection** (Probar conexión). Esto comprueba tu API key con el proveedor. Si tiene éxito, ves una línea verde **Connection Test: Success** con el tiempo de respuesta.
2. Haz clic en **Send Test Message** (Enviar mensaje de prueba). Esto envía la palabra "hi" al modelo que elegiste y muestra la respuesta. Si tiene éxito, ves una línea verde **Test Message: Success** con la respuesta del modelo debajo.

El botón **Send Test Message** permanece desactivado hasta que elijas un modelo. Si una prueba falla, la línea se vuelve roja y muestra el error. Ese mensaje suele decirte qué corregir, como una clave incorrecta o un modelo desconocido.

## Elegir una conexión para un chat

Una conexión no hace nada por sí sola. Cada chat elige qué conexión usar.

1. Abre un chat y luego abre sus **Chat Settings** (Ajustes del chat).
2. Busca la sección **Connection**.
3. Elige tu conexión en el menú desplegable.

El menú desplegable también tiene dos opciones especiales. **None** (Ninguna) significa que aún no se ha elegido ninguna conexión. **🎲 Random** (un icono de dado antes de la palabra Random) elige una conexión distinta cada vez de tu grupo aleatorio. En Game Mode, la sección se sigue llamando **Connection**, pero el menú desplegable dentro de ella se llama **GM / Party Model**.

Cuando creas un chat completamente nuevo, la ventana **Set Up** te pide que elijas una conexión primero. Elige una y luego haz clic en **Create Chat** (Crear chat).

## Errores comunes

Si una prueba o un mensaje falla, comprueba esto primero:

- Una **API Key** incorrecta o vencida. Abre la conexión, pega la clave de nuevo y luego haz clic en **Save**.
- Ningún modelo elegido. **Send Test Message** permanece desactivado hasta que selecciones un **Model**.
- Una clave del proveedor equivocado. Cada proveedor necesita su propia clave. Cambiar el **Provider** borra el campo **API Key** a propósito.
- Una **Base URL** bloqueada o inalcanzable. Déjala en blanco para usar el valor predeterminado del proveedor, a menos que ejecutes un servidor local o proxy.

Para más soluciones a errores de conexión y de generación, consulta [Solución de problemas de Marinara Engine](../TROUBLESHOOTING.md).

## Guías relacionadas

- [Proveedores de IA compatibles](providers-reference.md)
- [Conexiones de suscripción de Claude, ChatGPT y Grok](subscription-clis.md)
- [Conectar un modelo local o autoalojado](local-self-hosted.md)
- [Solución de problemas de Marinara Engine](../TROUBLESHOOTING.md)
