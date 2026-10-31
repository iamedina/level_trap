/**
 * LEVEL TRAP - Real-Time Multiplayer Versus Engine (WebSockets via Socket.io)
 * Sincronización 1v1, emparejamiento y Efecto Dominó de Trampas
 */
function setupVersusSockets(io, db) {
  const matchmakingQueue = [];
  const activeRooms = new Map();

  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUser = null;

    // 1. Solicitud de Semilla Diaria en tiempo real
    socket.on('request_daily_seed', async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        let dailyRecord = await db('daily_seeds').where({ seed_date: today }).first();

        if (!dailyRecord) {
          let seedValue = 0;
          for (let i = 0; i < today.length; i++) {
            seedValue = (seedValue * 31 + today.charCodeAt(i)) % 1000000;
          }
          const [newId] = await db('daily_seeds').insert({
            seed_date: today,
            seed_value: seedValue,
            config: JSON.stringify({
              seedDate: today,
              trapSpeedMultiplier: 1.15,
              specialRule: 'Sincronización Diaria Competitiva'
            }),
            created_at: new Date()
          });
          dailyRecord = await db('daily_seeds').where({ id: newId }).first();
        }

        let parsedConfig = {};
        try {
          parsedConfig = JSON.parse(dailyRecord.config);
        } catch (e) {
          parsedConfig = {};
        }

        socket.emit('daily_seed_data', {
          date: dailyRecord.seed_date,
          seedValue: dailyRecord.seed_value,
          config: parsedConfig
        });
      } catch (err) {
        console.error('Error al entregar Daily Seed por WebSocket:', err);
        socket.emit('daily_seed_error', 'No se pudo obtener la semilla diaria.');
      }
    });

    // 2. Unirse al Matchmaking Versus 1v1
    socket.on('versus_join_queue', (userData) => {
      currentUser = {
        socketId: socket.id,
        userId: userData.userId || 0,
        username: userData.username || 'Jugador'
      };

      // Si ya hay alguien en cola esperando (y no es el mismo socket)
      if (matchmakingQueue.length > 0 && matchmakingQueue[0].socketId !== socket.id) {
        const opponent = matchmakingQueue.shift();
        const roomId = `versus_room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        currentRoomId = roomId;
        opponent.socket.join(roomId);
        socket.join(roomId);

        // Elegir nivel competitivo balanceado (ej. Nivel 5, 10, o el nivel solicitado)
        const chosenLevel = userData.preferredLevel || 5;

        const roomData = {
          roomId,
          levelNumber: chosenLevel,
          player1: opponent,
          player2: currentUser,
          startTime: Date.now(),
          winner: null
        };
        activeRooms.set(roomId, roomData);

        // Notificar a ambos jugadores
        opponent.socket.emit('versus_matched', {
          roomId,
          levelNumber: chosenLevel,
          role: 'player1',
          opponent: { username: currentUser.username, id: currentUser.userId }
        });

        socket.emit('versus_matched', {
          roomId,
          levelNumber: chosenLevel,
          role: 'player2',
          opponent: { username: opponent.username, id: opponent.userId }
        });

        console.log(`[Versus] Partida iniciada en ${roomId}: ${opponent.username} VS ${currentUser.username}`);
      } else {
        // Poner en cola de espera
        matchmakingQueue.push({
          socketId: socket.id,
          socket,
          userId: currentUser.userId,
          username: currentUser.username
        });
        socket.emit('versus_waiting_opponent');
      }
    });

    // 3. Salir de la cola de emparejamiento
    socket.on('versus_leave_queue', () => {
      const idx = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
      if (idx !== -1) {
        matchmakingQueue.splice(idx, 1);
        socket.emit('versus_left_queue');
      }
    });

    // 4. Sincronización continua de posición en tiempo real (30-60 Hz)
    socket.on('versus_sync_position', (data) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('versus_opponent_updated', {
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        facingDir: data.facingDir,
        lookY: data.lookY,
        scaleX: data.scaleX,
        scaleY: data.scaleY,
        isGrounded: data.isGrounded
      });
    });

    // 5. EFECTO DOMINÓ DE TRAMPAS
    // Cuando un jugador activa un gatillo, desata una trampa sorpresa en la pantalla del rival
    socket.on('versus_trigger_domino_trap', (data) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('versus_receive_domino_trap', {
        trapType: data.trapType || 'falling_spikes_rain',
        intensity: data.intensity || 1,
        message: `¡${currentUser ? currentUser.username : 'Rival'} activó una trampa dominó!`
      });
      console.log(`[Versus Dominó] Trampa activada en ${data.roomId} hacia rival`);
    });

    // 6. Notificación de Muerte del Jugador en Versus
    socket.on('versus_player_death', (data) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('versus_opponent_died', {
        trapType: data.trapType,
        deaths: data.deaths
      });
    });

    // 7. Notificación de Victoria en Versus (Cruzar la Puerta Dorada)
    socket.on('versus_player_won', (data) => {
      if (!data.roomId) return;
      const room = activeRooms.get(data.roomId);
      if (room && !room.winner) {
        room.winner = currentUser ? currentUser.username : 'Jugador';
        io.to(data.roomId).emit('versus_match_ended', {
          winner: room.winner,
          timeMs: data.timeMs,
          isWinner: (winnerName) => winnerName === currentUser?.username
        });
        activeRooms.delete(data.roomId);
      }
    });

    // 8. Desconexión y abandono de partida
    socket.on('disconnect', () => {
      // Limpiar de cola si estaba esperando
      const qIdx = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
      if (qIdx !== -1) {
        matchmakingQueue.splice(qIdx, 1);
      }

      // Notificar a la sala activa si estaba en partida
      if (currentRoomId && activeRooms.has(currentRoomId)) {
        socket.to(currentRoomId).emit('versus_opponent_disconnected');
        activeRooms.delete(currentRoomId);
      }
    });
  });
}

module.exports = setupVersusSockets;

