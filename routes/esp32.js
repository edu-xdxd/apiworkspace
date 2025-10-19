const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Entorno = require('../models/entorno');

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
module.exports = router;