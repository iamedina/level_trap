# LEVEL TRAP 🎮
### *Plataformas 2D Hardcore con Físicas de Precisión, Trampas Silenciosas y Ecosistema Competitivo en Tiempo Real*

---

## 📋 Resumen del Proyecto

**LEVEL TRAP** es un videojuego de plataformas 2D desarrollado en **JavaScript Puro (HTML5 Canvas)** sin frameworks pesados en el cliente, con un backend robusto en **Node.js, Express, Knex.js y WebSockets (Socket.io)**. 

Implementa la política estricta de **CERO MOCKS**: no utiliza `localStorage` ni simulaciones en memoria; todas las muertes, el progreso, los tiempos de speedrun, los logros y el ranking global se auditan y persisten en una **base de datos real** (SQLite en desarrollo local, conmutable de inmediato a PostgreSQL para producción sin cambiar una sola consulta).

---

## 🏛️ Arquitectura del Sistema

```
                      +---------------------------------------+
                      |       CLIENTE (HTML5 Canvas 2D)       |
                      |  1280x720 px - 60 FPS - Web Audio API  |
                      |  Avatar 28x28 con mirada dinámica      |
                      |  Ghost Engine & Controles Duales      |
                      +-------------------+-------------------+
                                          |
                        HTTP REST / JSON  |  WebSockets (Socket.io)
                        (JWT Bearer Auth) |  (Baja latencia)
                                          |
                      +-------------------v-------------------+
                      |      BACKEND (Node.js + Express)      |
                      |  • Rate Limiting & Auth Segura (JWT)  |
                      |  • Matchmaking Versus 1v1 en Vivo     |
                      |  • Efecto Dominó de Trampas           |
                      |  • Auditoría de 6 Logros Humorísticos |
                      |  • Fórmula de Score de Speedrun       |
                      +-------------------+-------------------+
                                          |
                                   Knex.js ORM
                                          |
                      +-------------------v-------------------+
                      |       BASE DE DATOS RELACIONAL        |
                      |  Dev: SQLite (level_trap.sqlite)      |
                      |  Prod: PostgreSQL 16 (Docker-ready)   |
                      +---------------------------------------+
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Función |
| :--- | :--- | :--- |
| **Frontend** | HTML5 Canvas + JavaScript ES6 Modular | Bucle de renderizado a 60 FPS, colisiones continuas AABB, squash & stretch. |
| **Audio** | Web Audio API | Sintetizador procedural retro chiptune 8-bit (cero archivos mp3 externos). |
| **Backend** | Node.js + Express | API REST, enrutamiento, validación y control de concurrencia. |
| **Tiempo Real** | Socket.io | Emparejamiento 1v1 en vivo, sincronización de avatar y Efecto Dominó de trampas. |
| **Seguridad** | JWT + Bcrypt + Rate Limit | Autenticación real por token y protección contra fuerza bruta/spam. |
| **Base de Datos** | SQLite (Dev) / PostgreSQL (Prod) con Knex | Migraciones estructuradas, transacciones y persistencia auditada. |
| **Contenedores** | Docker & Docker Compose | Entorno de despliegue reproducible con PostgreSQL y volúmenes persistentes. |

---

## 🎮 Características de Gameplay

### 1. Dimensiones y Controles
* **Canvas:** $1280 \times 720\text{ px}$ (Rejilla de $32 \times 18$ bloques de $40\text{ px}$).
* **Avatar:** Bloque negro compacto ($28 \times 28\text{ px}$) con ojos claros estilizados que siguen dinámicamente la dirección del movimiento e impulsos de salto.
* **Controles Duales:**
  * **Teclado:** `WASD` o `Flechas` + `Espacio` para saltar (tecla `R` para reinicio rápido).
  * **Táctil Oculto:** Botón "Táctil: ON/OFF" en el HUD que activa controles táctiles virtuales en pantalla.
* **Físicas:** *Coyote Time* (5 frames de gracia), *Jump Buffering* y salto de altura variable.

### 2. Identidad Visual por Zonas (50 Niveles)
* **Zona 1: Tierra y Arena (Niveles 1 a 15):** Fondo gris neutro claro, plataformas gris oscuro y pinchos en rojo clásico.
  * **Jefe Final (Nivel 15 - La Puerta Vigilante):** Puerta dorada gigante (HP: 3) con ojo móvil. Lanza ráfagas de pinchos horizontales a dos alturas y hace colapsar el suelo al acercarse.
* **Zona 2: Volcánica y Lava (Niveles 16 a 35):** Fondo ceniza cálido con partículas de carbón flotantes, plataformas marrón carbón, pinchos lava y plataformas que se encogen al pisarlas.
  * **Jefe Final (Nivel 35 - El Titán de Lava):** Bloque masivo (HP: 4) que persigue desde el techo mientras la lava asciende desde el fondo. Se derrota activando surtidores de hielo.
* **Zona 3: Inframundo (Niveles 36 a 50):** Fondo azulado frío profundo, plataformas violeta grafito, pinchos carmesí neón y zonas invisibles de inversión de gravedad.
  * **Jefe Final (Nivel 50 - La Puerta Maestra del Caos):** Jefe definitivo (HP: 5) que invierte la gravedad y los controles del jugador en tiempo real.

### 3. Efectos de Impacto ("Juice Visual")
* **Screen Shake:** Sacudida discreta del Canvas ante impactos pesados o ataques de jefes.
* **Partículas de Muerte:** Explosión balística limpia de 8 a 12 píxeles negros con gravedad.
* **Destello de Victoria:** Ráfaga dorada al alcanzar la puerta de salida.
* **Polvo de Aterrizaje:** Partículas sutiles tras saltos y caídas de gran altura.

---

## 🏆 Ecosistema Competitivo

### 1. Puntuación Global (Leaderboard)
Calculada estrictamente en el backend mediante la fórmula:
$$\text{Puntuación} = (\text{BaseTime} - \text{TiempoEmpleado}) \times 100 - (\text{Muertes} \times 250)$$

### 2. Ghost Engine (Silueta Fantasma)
Cronómetro de precisión `$00:00.000$` que envía muestras vectoriales cada 60 ms para reconstruir la silueta fantasma del poseedor del mejor récord de cada nivel.

### 3. Modo Versus 1v1 con Efecto Dominó
* Emparejamiento en tiempo real vía WebSockets.
* Los jugadores compiten en el mismo nivel con sincronización de la silueta del rival en color cian neón.
* **Efecto Dominó de Trampas:** Al cruzar la mitad del mapa, un jugador desata una lluvia de pinchos sorpresa en la pantalla de su contrincante.

### 4. Sistema de 6 Logros Humorísticos Auditados
1. **"Víctima Inocente":** Morir durante el primer segundo de juego en el Nivel 1.
2. **"Paranoia Total":** Saltar 10 veces consecutivas en el mismo bloque antes de avanzar.
3. **"Imparable":** Superar 5 niveles consecutivos sin acumular muertes.
4. **"Impostor":** Intentar entrar en 3 puertas falsas distintas.
5. **"Maestro de la Gravedad":** Sobrevivir 30 segundos acumulados en gravedad invertida.
6. **"Leyenda de Level Trap":** Derrotar al Jefe Final del Nivel 50 y completar el juego.

---

## 🚀 Guía de Instalación y Ejecución

### Requisitos Previos
* Node.js v18+ (probado en Node.js v24 LTS).
* npm v9+.

### Modo Desarrollo (SQLite local por defecto)
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Ejecutar migraciones y poblar los 50 niveles y logros:
   ```bash
   npm run migrate
   npm run seed
   ```
3. Iniciar el servidor:
   ```bash
   npm start
   ```
4. Abrir en el navegador:
   ```
   http://localhost:3000
   ```

### Modo Producción con Docker y PostgreSQL
Para ejecutar con base de datos PostgreSQL real y contenedor aislado:
```bash
docker-compose up --build -d
```
El contenedor ejecutará automáticamente las migraciones y el servidor estará disponible en el puerto `3000`.

---

## 📡 Catálogo de Endpoints REST

| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Pública | Estado del servidor y conteo de entidades en BD. |
| `POST` | `/api/auth/register` | Pública | Registro de nuevo jugador con contraseña cifrada en Bcrypt. |
| `POST` | `/api/auth/login` | Pública | Autenticación y emisión de token JWT. |
| `GET` | `/api/auth/me` | JWT Bearer | Perfil del usuario autenticado verificado en base de datos. |
| `GET` | `/api/game/progress` | JWT Bearer | Obtiene o inicializa el progreso del jugador. |
| `GET` | `/api/game/levels` | JWT Bearer | Catálogo de los 50 niveles con estado de desbloqueo. |
| `GET` | `/api/game/levels/:lvl` | JWT Bearer | Layout completo de plataformas, trampas y jefe del nivel. |
| `POST` | `/api/game/death` | JWT Bearer | Audita la muerte en `death_logs` y evalúa logros. |
| `POST` | `/api/game/complete` | JWT Bearer | Registra nivel superado y evalúa victoria final en Nivel 50. |
| `POST` | `/api/speedrun/record`| JWT Bearer | Guarda récord, calcula puntuación y almacena fotogramas del Ghost. |
| `GET` | `/api/speedrun/ghost/:lvl` | JWT Bearer | Recupera la silueta fantasma del poseedor de la mejor marca. |
| `GET` | `/api/speedrun/leaderboard` | Pública | Tabla de clasificación global ordenada por puntuación. |
| `GET` | `/api/achievements` | JWT Bearer | Lista los 6 logros con estado de desbloqueo y fecha. |
| `POST` | `/api/achievements/unlock` | JWT Bearer | Desbloquea un logro específico de forma auditada e idempotente. |
| `GET` | `/api/seed/daily` | Pública | Entrega la semilla determinista y modificador del día. |

---

## ⚡ Eventos WebSocket (Socket.io)

| Evento | Dirección | Descripción |
| :--- | :--- | :--- |
| `request_daily_seed` | Cliente $\rightarrow$ Servidor | Solicita la semilla diaria y modificadores. |
| `daily_seed_data` | Servidor $\rightarrow$ Cliente | Entrega de datos de la semilla diaria. |
| `versus_join_queue` | Cliente $\rightarrow$ Servidor | Ingreso al matchmaking 1v1. |
| `versus_matched` | Servidor $\rightarrow$ Cliente | Emparejamiento confirmado con sala y rival asignado. |
| `versus_sync_position`| Cliente $\rightarrow$ Servidor | Envío de coordenadas y estado visual del jugador local. |
| `versus_opponent_updated`| Servidor $\rightarrow$ Cliente | Recepción de fotogramas del rival para dibujarlo en Canvas. |
| `versus_trigger_domino_trap` | Cliente $\rightarrow$ Servidor | Activación del Efecto Dominó hacia el contrincante. |
| `versus_receive_domino_trap` | Servidor $\rightarrow$ Cliente | Notificación y generación de trampa sorpresa en pantalla. |
| `versus_player_won` | Cliente $\rightarrow$ Servidor | Declaración del primer jugador en cruzar la meta dorada. |
| `versus_match_ended` | Servidor $\rightarrow$ Cliente | Cierre de partida con anuncio oficial del ganador. |

---

## 📄 Licencia y Créditos
Proyecto desarrollado para el entorno de aprendizaje **SENA** bajo los más altos estándares de arquitectura de software y calidad de código.

