const express = require('express');
const SensorData = require('../models/sensorData');
const router = express.Router();

// POST /sensor-data - Crear nuevos datos de sensor
router.post('/', async (req, res) => {
  try {
    const { deviceId, heartRate, steps, light } = req.body;
    
    // Validar que los campos requeridos estén presentes
    if (!deviceId || heartRate === undefined || steps === undefined || light === undefined) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos: deviceId, heartRate, steps' 
      });
    }

    // Validar que heartRate y steps sean números
    if (typeof heartRate !== 'number' || typeof steps !== 'number' || typeof light !== 'number') {
      return res.status(400).json({ 
        error: 'heartRate y steps deben ser números' 
      });
    }

    // Crear nuevo documento de datos de sensor
    const newSensorData = new SensorData({
      deviceId,
      heartRate,
      steps,
      light,
      timestamp: new Date()
    });

    // Guardar en la base de datos
    const savedData = await newSensorData.save();
    
    console.log('Datos de sensor guardados:', savedData);
    
    res.status(201).json({
      message: 'Datos de sensor guardados exitosamente',
      data: savedData
    });

  } catch (error) {
    console.error('Error al guardar datos de sensor:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al guardar los datos' 
    });
  }
});

// GET /sensor-data - Obtener todos los datos de sensores
router.get('/', async (req, res) => {
  try {
    const sensorData = await SensorData.find().sort({ timestamp: -1 });
    res.status(200).json({
      message: 'Datos de sensores obtenidos exitosamente',
      data: sensorData
    });
  } catch (error) {
    console.error('Error al obtener datos de sensores:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los datos' 
    });
  }
});

// GET /sensor-data/:deviceId - Obtener datos por dispositivo
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const sensorData = await SensorData.find({ deviceId }).sort({ timestamp: -1 });
    
    if (sensorData.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron datos para este dispositivo' 
      });
    }
    
    res.status(200).json({
      message: 'Datos del dispositivo obtenidos exitosamente',
      data: sensorData
    });
  } catch (error) {
    console.error('Error al obtener datos del dispositivo:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los datos' 
    });
  }
});

module.exports = router; 