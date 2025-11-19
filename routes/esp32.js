const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Entorno = require('../models/entorno');
const SensorData = require('../models/sensorData');

router.get("/status", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.send("OK"); // respuesta simple para el ESP32
  } else {
    res.status(500).send("DB_DISCONNECTED");
  }
});

router.post("/comandos", express.json(), (req, res) => {
  console.log("Comando recibido:", req.body.comando);
  res.json({ success: true });
});
// GET /esp32/data/:userId - Obtener datos de entorno por usuario
router.get('/data/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
      }
  
      // Buscar entorno del usuario
      const entorno = await Entorno.findOne({ usuario: new mongoose.Types.ObjectId(userId) }).lean();
  
      if (!entorno) {
        return res.status(404).json({ error: 'No se encontró entorno para este usuario' });
      }
  
      res.json({
        deviceId: entorno.deviceId || "default_device",
        usuario: { $oid: userId },
        sensores: entorno.sensores.map(s => ({
          valorSensor: entorno.estado ? s.valorSensor : 0, // Si el entorno está inactivo, enviar 0
          idSensor: s.idSensor,
          nombreSensor: s.nombreSensor,
          tipoSensor: s.tipoSensor,
          color: s.color
        })),
        estado: entorno.estado, // Incluir el estado del entorno en la respuesta
        timestamp: { $date: new Date() },
        _v: entorno._v || 0
      });
  
    } catch (err) {
      console.error('Error al obtener datos de entorno:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /esp32/detalles/:userId - Obtener todos los entornos del usuario con detalles de sensores
router.get('/detalles/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Obtener datos de sensores del usuario
    const sensorData = await SensorData.find({ 
      usuario: new mongoose.Types.ObjectId(userId) 
    }).sort({ timestamp: -1 });

    // Obtener todos los entornos del usuario
    const entornos = await Entorno.find({ 
      usuario: new mongoose.Types.ObjectId(userId) 
    }).lean();

    if (!entornos || entornos.length === 0) {
      return res.status(404).json({ error: 'No se encontraron entornos para este usuario' });
    }

    // Preparar entornos con detalles completos de sensores
    const entornosConDetalles = entornos.map(entorno => {
      const sensoresDetallados = [];
      
      if (entorno.sensores && entorno.sensores.length > 0) {
        entorno.sensores.forEach(sensor => {
          // Buscar el dato más reciente para este sensor en sensorData
          let datoReciente = null;
          let recordCompleto = null;
          for (const record of sensorData) {
            const sensorEncontrado = record.sensores.find(s => s.idSensor === sensor.idSensor);
            if (sensorEncontrado) {
              datoReciente = sensorEncontrado;
              recordCompleto = record;
              break;
            }
          }
          
          sensoresDetallados.push({
            idSensor: sensor.idSensor,
            nombreSensor: sensor.nombreSensor,
            tipoSensor: sensor.tipoSensor || 'Desconocido',
            valorSensor: entorno.estado ? sensor.valorSensor : 0, // Si el entorno está inactivo, enviar 0
            valorActual: datoReciente ? datoReciente.valorSensor : null, // Valor actual del sensor
            color: sensor.color || null,
            ultimaActualizacion: recordCompleto ? recordCompleto.timestamp : null,
            deviceId: recordCompleto ? recordCompleto.deviceId : null
          });
        });
      }

      return {
        _id: entorno._id.toString(),
        nombre: entorno.nombre,
        horaInicio: entorno.horaInicio,
        horaFin: entorno.horaFin,
        estado: entorno.estado,
        diasSemana: entorno.diasSemana || [],
        usuario: { $oid: userId },
        sensores: sensoresDetallados,
        totalSensores: sensoresDetallados.length,
        playlist: entorno.playlist ? entorno.playlist.map(playlist => ({
          id: playlist.id,
          tema: playlist.tema || null,
          nombre: playlist.nombre || null
        })) : [],
        timestamp: { $date: new Date() }
      };
    });

    res.json({
      message: 'Entornos del usuario con detalles de sensores obtenidos exitosamente',
      usuario: { $oid: userId },
      count: entornos.length,
      entornos: entornosConDetalles
    });
  } catch (err) {
    console.error('Error al obtener entornos con detalles de sensores:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
