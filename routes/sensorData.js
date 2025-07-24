const express = require('express');
const SensorData = require('../models/sensorData');
const router = express.Router();
const mongoose = require('mongoose');

// POST /sensor-data - Crear nuevos datos de sensores
router.post('/', async (req, res) => {
  try {
    const { deviceId, usuario, sensores } = req.body;
    
    // Validar que los campos requeridos estén presentes
    if (!deviceId || !usuario || !sensores || !Array.isArray(sensores)) {
      return res.status(400).json({ 
        error: 'Los campos deviceId, usuario y sensores (array) son requeridos' 
      });
    }

    // Validar que el usuario sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    // Validar cada sensor
    for (let i = 0; i < sensores.length; i++) {
      const sensor = sensores[i];
      
      if (!sensor.valorSensor || !sensor.idSensor || !sensor.nombreSensor || !sensor.tipoSensor) {
        return res.status(400).json({ 
          error: `Sensor ${i + 1}: Faltan campos requeridos (valorSensor, idSensor, nombreSensor, tipoSensor)` 
        });
      }

      // Validar tipos de sensor válidos
      const tiposValidos = ['LIGHT', 'FAN', 'AIR_CONDITIONER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'SMART_PLUG', 'CURTAIN', 'MOTION_SENSOR', 'AIR_PURIFIER'];
      if (!tiposValidos.includes(sensor.tipoSensor)) {
        return res.status(400).json({ 
          error: `Sensor ${i + 1}: Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}` 
        });
      }

      // Validar que valorSensor sea número
      if (typeof sensor.valorSensor !== 'number') {
        return res.status(400).json({ 
          error: `Sensor ${i + 1}: valorSensor debe ser un número` 
        });
      }

      // Validar color solo para LIGHT
      if (sensor.tipoSensor === 'LIGHT') {
        if (!sensor.color || typeof sensor.color !== 'string') {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: El campo color es requerido para sensores tipo LIGHT` 
          });
        }
      } else if (sensor.color) {
        return res.status(400).json({ 
          error: `Sensor ${i + 1}: El campo color solo se permite para sensores tipo LIGHT` 
        });
      }
    }

    // Crear nuevo documento de datos de sensores
    const newSensorData = new SensorData({
      deviceId,
      usuario: new mongoose.Types.ObjectId(usuario),
      sensores,
      timestamp: new Date()
    });

    // Guardar en la base de datos
    const savedData = await newSensorData.save();
    
    console.log('Datos de sensores guardados:', savedData);
    
    res.status(201).json({
      message: 'Datos de sensores guardados exitosamente',
      data: savedData
    });

  } catch (error) {
    console.error('Error al guardar datos de sensores:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al guardar los datos',
      details: error.message
    });
  }
});

// GET /sensor-data - Obtener todos los datos de sensores
router.get('/', async (req, res) => {
  try {
    const sensorData = await SensorData.find().sort({ timestamp: -1 });
    res.status(200).json({
      message: 'Datos de sensores obtenidos exitosamente',
      count: sensorData.length,
      data: sensorData
    });
  } catch (error) {
    console.error('Error al obtener datos de sensores:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los datos' 
    });
  }
});

// GET /sensor-data/:id - Obtener datos por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sensorData = await SensorData.findById(id);
    
    if (!sensorData) {
      return res.status(404).json({ 
        error: 'Datos de sensores no encontrados' 
      });
    }
    
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

// GET /sensor-data/device/:deviceId - Obtener datos por dispositivo
router.get('/device/:deviceId', async (req, res) => {
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
      count: sensorData.length,
      data: sensorData
    });
  } catch (error) {
    console.error('Error al obtener datos del dispositivo:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los datos' 
    });
  }
});

// GET /sensor-data/usuario/:usuarioId - Obtener datos de sensores por usuario
router.get('/usuario/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    const sensorData = await SensorData.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    }).sort({ timestamp: -1 });

    res.status(200).json({
      message: 'Datos de sensores del usuario obtenidos exitosamente',
      usuario: usuarioId,
      count: sensorData.length,
      data: sensorData
    });
  } catch (error) {
    console.error('Error al obtener datos de sensores del usuario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los datos' 
    });
  }
});

// PUT /sensor-data/:id - Actualizar datos de sensores
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, usuario, sensores } = req.body;
    
    // Validar que al menos un campo se proporcione
    if (!deviceId && !usuario && !sensores) {
      return res.status(400).json({ 
        error: 'Debe proporcionar al menos deviceId, usuario o sensores para actualizar' 
      });
    }

    // Validar usuario si se proporciona
    if (usuario) {
      if (!mongoose.Types.ObjectId.isValid(usuario)) {
        return res.status(400).json({ 
          error: 'El ID de usuario no es válido' 
        });
      }
    }

    // Validar sensores si se proporcionan
    if (sensores && Array.isArray(sensores)) {
      const tiposValidos = ['LIGHT', 'FAN', 'AIR_CONDITIONER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'SMART_PLUG', 'CURTAIN', 'MOTION_SENSOR', 'AIR_PURIFIER'];
      
      for (let i = 0; i < sensores.length; i++) {
        const sensor = sensores[i];
        
        if (!sensor.valorSensor || !sensor.idSensor || !sensor.nombreSensor || !sensor.tipoSensor) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: Faltan campos requeridos (valorSensor, idSensor, nombreSensor, tipoSensor)` 
          });
        }

        if (!tiposValidos.includes(sensor.tipoSensor)) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}` 
          });
        }

        if (typeof sensor.valorSensor !== 'number') {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: valorSensor debe ser un número` 
          });
        }

        if (sensor.tipoSensor === 'LIGHT') {
          if (!sensor.color || typeof sensor.color !== 'string') {
            return res.status(400).json({ 
              error: `Sensor ${i + 1}: El campo color es requerido para sensores tipo LIGHT` 
            });
          }
        } else if (sensor.color) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: El campo color solo se permite para sensores tipo LIGHT` 
          });
        }
      }
    }

    const updateData = {};
    if (deviceId) updateData.deviceId = deviceId;
    if (usuario) updateData.usuario = new mongoose.Types.ObjectId(usuario);
    if (sensores) updateData.sensores = sensores;
    updateData.timestamp = new Date();

    const updatedData = await SensorData.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedData) {
      return res.status(404).json({ 
        error: 'Datos de sensores no encontrados' 
      });
    }

    res.status(200).json({
      message: 'Datos de sensores actualizados exitosamente',
      data: updatedData
    });
  } catch (error) {
    console.error('Error al actualizar datos de sensores:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al actualizar los datos',
      details: error.message
    });
  }
});

// DELETE /sensor-data/:id - Eliminar datos de sensores
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedData = await SensorData.findByIdAndDelete(id);
    
    if (!deletedData) {
      return res.status(404).json({ 
        error: 'Datos de sensores no encontrados' 
      });
    }

    res.status(200).json({
      message: 'Datos de sensores eliminados exitosamente',
      data: deletedData
    });
  } catch (error) {
    console.error('Error al eliminar datos de sensores:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al eliminar los datos' 
    });
  }
});

// DELETE /sensor-data/device/:deviceId - Eliminar todos los datos de un dispositivo
router.delete('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await SensorData.deleteMany({ deviceId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron datos para este dispositivo' 
      });
    }

    res.status(200).json({
      message: `Se eliminaron ${result.deletedCount} registros del dispositivo`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error al eliminar datos del dispositivo:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al eliminar los datos' 
    });
  }
});

module.exports = router; 