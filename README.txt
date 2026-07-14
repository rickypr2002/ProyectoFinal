================================================================================
CONTEO DEL ARCHIVO: README.md
================================================================================
# T6 · Enjambre Abismal
## Integración completa de componentes del semestre

### Resumen
Demostración interactiva de **205 agentes con comportamiento Boids**, optimización de rendimiento mediante la desactivación de luces dinámicas locales, iluminación avanzada con shaders personalizados, y un ambiente abismal procedural inmersivo.

---

## 👥 Integrantes
* **Carlos Ricardo Perez Richards**
* **Iker Adán González Vega**
* **Vicente García Alfaro**

---

## GitHub Pages

https://rickypr2002.github.io/ProyectoFinal/


# Repositorio

https://github.com/rickypr2002/ProyectoFinal.git



## Componentes Implementados

### ✅ Flocking Completo [30%]
* **Separación**: Evita la aglomeración excesiva de las medusas calculando vectores de repulsión basados en la distancia.
* **Alineación**: Adopta de manera orgánica la velocidad y dirección promedio del vecindario circular.
* **Cohesión**: Genera una fuerza que atrae a los agentes hacia el centro de masa del grupo percibido.
* **205 agentes simultáneos** con comportamiento emergente y autónomo distribuidos en el espacio.
* **Parámetros ajustables**: Control interactivo de la velocidad del enjambre en tiempo real desde el HUD.

### ⚠️ Render Eficiente [25%]
* **Optimización por CPU/GPU**: En lugar de reconstruir la criatura articulada con un plano `InstancedMesh` —lo que habría roto las animaciones independientes de los tentáculos aprobadas previamente—, se aplicó un criterio de optimización selectiva.
* **Remoción de Luces**: Se eliminaron las fuentes `PointLight` locales de cada medusa, mitigando miles de cálculos de iluminación por cuadro (205 x 4100 mallas).
* **Performance**: Sostiene una tasa de refresco estable de ~30 FPS gracias a la liberación del pipeline gráfico.
* **Animaciones independientes**: Cada medusa mantiene su desfase trigonométrico (`phase`) autónomo para la pulsación de la campana y tentáculos.
* **Contador de FPS**: Renderizado en tiempo real en la sección de estadísticas del HUD.

### ✅ Iluminación Avanzada [20%]
* **Shader Personalizado**: Inyección de código GLSL utilizando `onBeforeCompile` en el material original de la campana (`MAT_BELL`).
* **Deformación Vertex**: Reemplazo de la rutina `#include <begin_vertex>` para añadir un wobble sinusoidal basado en la altura y el tiempo global, simulando el nado orgánico de la criatura.
* **Iluminación Coherente**: La deformación por shader respeta de forma íntegra las luces direccionales, la luz hemisférica del abismo y la niebla volumétrica de la escena base (`World.js`) sin romper el mapa PBR.

### ✅ Calidad Visual y Presentación [15%]
* **Límites Espaciales (Bounding Box)**: Caja de contención delimitada en coordenadas 26 x 14 x 26. Implementa un algoritmo de *wrap-around* toroidal (efecto Pac-Man) en el método `update` para evitar que el enjambre escape del foco de la cámara.
* **Ambiente (T1)**: Configuración de escena marina con niebla exponencial, plano de suelo procedural texturizado, rocas decorativas de baja poligonización y un sistema de **1200 partículas bioluminiscentes** en suspensión flotante continua.
* **Interactividad**: HUD integrado para pausar la simulación física, resetear la cámara orbital con amortiguación suave y dispersar radialmente a los agentes.

---

## Arquitectura

Proyecto/
├── index.html          # Estructura del HUD, importmap de Three.js y módulo principal
├── main.js             # Orquestación: población de boids, loop de frames e interactividad de UI
├── Agent.js            # Lógica matemática de Boids, límites espaciales e inyección de shaders
├── World.js            # T1: Configuración de renderer, cámara, iluminación de entorno y partículas
└── style.css           # Estilos de interfaz abismal, deshabilitación de eventos y transiciones


## Controles

| Entrada | Acción |
| :--- | :--- |
| 🖱 Drag | Rotar la cámara orbital (OrbitControls con damping de 0.06) |
| 🖱 Scroll | Controlar el Zoom In / Zoom Out en el abismo |
| ⏸ Pausar | Detiene por completo las físicas de movimiento, manteniendo el render loop activo |
| ⌂ Cámara | Restablece de forma inmediata la posición de la cámara a las coordenadas de origen |
| ↔ Dispersar | Teletransporta instantáneamente a los agentes a vectores aleatorios para romper el flock |

## Especificaciones Técnicas

* **Three.js**: v0.165.0 (Carga vía CDN)
* **Agentes en Escena**: 205 medusas autónomas
* **Nodos Concurrentes**: 4,100 mallas renderizadas en tiempo real (205 x 20 nodos de jerarquía articulada)
* **Límites del Mundo**: Box contención de 26 x 14 x 26 unidades de espacio virtual
================================================================================