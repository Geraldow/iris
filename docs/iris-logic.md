# Iris v2 — Lógica del Sistema

## Qué es iris y por qué existe

iris es un servidor MCP que actúa como orquestador de herramientas de IA desde la terminal. La idea central es simple: en lugar de que Claude Code haga todo el trabajo por sí solo, iris delega tareas específicas a otros agentes CLI instalados en el sistema, cada uno con sus propias fortalezas, costos y velocidades. Esto permite que una sesión de desarrollo use el agente más adecuado para cada momento sin que el desarrollador tenga que recordar comandos distintos o administrar múltiples herramientas manualmente.

La motivación práctica detrás de iris es económica y técnica al mismo tiempo. Usar siempre claude para todo funciona pero es costoso y consume el contexto rápidamente. Hay tareas de exploración o síntesis que pueden resolverse perfectamente con un modelo gratuito como kilo-auto o cursor-agent, reservando claude para lo que realmente requiere precisión: aplicar código, verificar comportamiento o diseñar arquitectura compleja.

## Cómo funciona el routing de tareas

Cuando alguien llama a iris_task con un prompt y un nivel de esfuerzo, lo primero que hace el AdapterManager es determinar qué adapter usar. El nivel de esfuerzo es la señal principal: low activa los adapters gratuitos como kilo, opencode o cursor-agent porque son rápidos y no cuestan nada; med busca un balance entre calidad y costo usando copilot con gpt-5-mini o antigravity con Gemini Flash; high reserva claude opus o Gemini Pro para cuando se necesita razonamiento profundo y generación de código precisa; y thinking activa exclusivamente antigravity con Claude Opus 4.6 en modo thinking, que es el único adapter con esa capacidad disponible.

Lo que hace interesante este sistema es que el effort no es un parámetro de los adapters sino una abstracción del sistema. Cada adapter traduce ese nivel a su propio lenguaje: claude lo convierte en un flag de --effort específico y elige el alias del modelo correspondiente; antigravity escribe el nombre exacto del modelo en su settings.json porque esa herramienta no tiene flags para cambiar el modelo en tiempo de ejecución; copilot simplemente recibe el nombre del modelo en --model; y opencode junto a kilo usan el flag --variant para ajustar la profundidad del razonamiento.

## El circuit breaker y la resiliencia

El sistema no asume que los adapters siempre van a funcionar. kiro-cli por ejemplo fue descartado precisamente porque sus créditos gratuitos son inestables: funciona en un test pero en uso real dentro de iris habría activado el circuit breaker repetidamente. El circuit breaker registra fallas consecutivas por adapter y cuando llega a tres lo saca de rotación automáticamente durante esa sesión, pasando al siguiente disponible en el mismo tier de esfuerzo.

Esto significa que si copilot falla tres veces seguidas por algún problema de autenticación o cuota, iris no se cae sino que sigue trabajando con antigravity o claude dependiendo del nivel de esfuerzo solicitado. La lógica de fallback es deliberada y sigue un orden de prioridad que el equipo puede configurar: adapters gratuitos van primero en low, adapters de pago van primero en high porque en esos contextos la calidad importa más que el costo.

## Cómo cada adapter procesa la respuesta

Uno de los detalles de implementación más relevantes es que cada adapter devuelve su respuesta en un formato diferente y el sistema tiene que normalizar todo eso antes de retornar al usuario. claude devuelve JSON donde el texto útil está dentro de result.result y hay que extraerlo con un parser. copilot devuelve texto plano pero con un bloque de estadísticas al final que incluye líneas de Changes, AI Credits y Tokens que hay que stripear para quedarse solo con la respuesta real. opencode y kilo devuelven JSONL: cada línea es un objeto JSON independiente y hay que filtrar los que tienen "type":"text" y extraer el campo part.text de cada uno para concatenarlos. antigravity y cursor-agent simplemente escriben en stdout y no necesitan parsing adicional.

Esta normalización ocurre dentro de cada adapter antes de que el resultado llegue al AdapterManager, así que desde el punto de vista del resto del sistema todos los adapters devuelven un AdapterResult uniforme con el texto limpio, la duración de la ejecución, el adapter que lo procesó y cualquier error que haya ocurrido.

## Persistencia y memoria

Cada tarea que iris ejecuta se guarda en el TaskStore de la sesión con un identificador único. Esto permite que el usuario pueda consultar el historial de iris_history y ver qué se delegó a qué adapter, con qué resultado y cuánto tardó. Adicionalmente iris registra el contexto en Engram de forma asíncrona para que esa información esté disponible en sesiones futuras sin bloquear la respuesta actual.

El TaskStore vive en memoria durante la sesión mientras que Engram persiste entre sesiones. La distinción es importante: si alguien necesita saber qué hizo iris en la sesión actual llama a iris_history y obtiene la respuesta inmediatamente. Si necesita recuperar contexto de una sesión anterior tiene que ir a Engram. Este diseño mantiene la sesión actual rápida y liviana mientras que la memoria a largo plazo vive en un sistema especializado para eso.

## Integración con el flujo SDD

La razón más importante para que iris exista en un ambiente de desarrollo con SDD es que cada fase del ciclo tiene un costo y una naturaleza diferente. La exploración de código puede hacerla kilo-auto gratis en segundos. La síntesis de intención y el breakdown de tareas son trabajo liviano que cursor-agent maneja bien. La especificación técnica es texto estructurado donde gpt-5-mini de copilot funciona perfectamente a un costo mínimo. El diseño de arquitectura requiere razonamiento profundo y Gemini Pro con antigravity es la mejor opción disponible dentro de las herramientas configuradas. La aplicación de código y la verificación son las fases más críticas y ahí claude con sonnet en effort alto es el estándar no negociable.

Cuando el desarrollador invoca /sdd-ff iris puede orquestar todas esas fases automáticamente eligiendo el adapter correcto para cada una sin intervención manual. El resultado es un ciclo de desarrollo completo donde cada dólar gastado va al lugar donde más impacto tiene.

## Instalación automática de dependencias

iris_setup es la herramienta que verifica que todos los adapters estén correctamente instalados y configurados antes de que el sistema intente usarlos. Cuando se invoca comprueba si cada CLI está presente en el PATH, si hay variables de entorno o archivos de configuración necesarios, y si es posible instalar alguna dependencia faltante lo hace automáticamente. Este fue un pain point real durante el desarrollo: blackbox por ejemplo requería npm install en múltiples subdirectorios después de su instalación porque el script de instalación no lo hacía completo. iris_setup abstrae todo eso para que el desarrollador no tenga que recordarlo.
