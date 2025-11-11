const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Entorno = require('../models/entorno');
const SensorData = require('../models/sensorData');

// Función para actualizar sensores en sensorData
async function actualizarSensoresEnSensorData(sensores, usuario, deviceId = null) {
  try {
    // Si no hay deviceId, usar uno por defecto
    if (!deviceId) {
      deviceId = 'default_device';
    }

    // Buscar el registro más reciente de sensorData para este usuario y deviceId
    let sensorDataRecord = await SensorData.findOne({ 
      usuario: new mongoose.Types.ObjectId(usuario),
      deviceId 
    }).sort({ timestamp: -1 });
    
    if (!sensorDataRecord) {
      // Si no existe, crear uno nuevo
      sensorDataRecord = new SensorData({
        deviceId,
        usuario: new mongoose.Types.ObjectId(usuario),
        sensores: [],
        timestamp: new Date()
      });
    }

    // Actualizar o agregar sensores
    for (const sensorEntorno of sensores) {
      const sensorIndex = sensorDataRecord.sensores.findIndex(
        s => s.idSensor === sensorEntorno.idSensor
      );

      if (sensorIndex !== -1) {
        // Actualizar sensor existente
        sensorDataRecord.sensores[sensorIndex] = {
          valorSensor: sensorEntorno.valorSensor,
          idSensor: sensorEntorno.idSensor,
          nombreSensor: sensorEntorno.nombreSensor,
          tipoSensor: sensorEntorno.tipoSensor,
          ...(sensorEntorno.color && { color: sensorEntorno.color })
        };
      } else {
        // Agregar nuevo sensor
        const nuevoSensor = {
          valorSensor: sensorEntorno.valorSensor,
          idSensor: sensorEntorno.idSensor,
          nombreSensor: sensorEntorno.nombreSensor,
          tipoSensor: sensorEntorno.tipoSensor,
          ...(sensorEntorno.color && { color: sensorEntorno.color })
        };
        sensorDataRecord.sensores.push(nuevoSensor);
      }
    }

    // Actualizar timestamp
    sensorDataRecord.timestamp = new Date();
    
    // Guardar cambios
    await sensorDataRecord.save();
    
    console.log(`Sensores actualizados en sensorData para usuario: ${usuario}, deviceId: ${deviceId}`);
    return true;
  } catch (error) {
    console.error('Error al actualizar sensores en sensorData:', error);
    return false;
  }
}

// Crear un nuevo entorno
router.post('/', async (req, res) => {
  try {
    // Validar que los campos requeridos estén presentes
    let { nombre, horaInicio, horaFin, sensores, diasSemana, playlist, usuario, deviceId, estado } = req.body;
    
    console.log(req.body);
    
    if (!nombre || !horaInicio || !horaFin || !usuario) {
      return res.status(400).json({ 
        error: 'Los campos nombre, horaInicio, horaFin y usuario son requeridos' 
      });
    }

    // Validar que el usuario sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    // Validar formato de hora (HH:mm)
    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(horaInicio) || !horaRegex.test(horaFin)) {
      return res.status(400).json({ 
        error: 'El formato de hora debe ser HH:mm (ejemplo: 09:30)' 
      });
    }

    // Convertir sensores de string a array si es necesario
    if (typeof sensores === 'string') {
      try {
        sensores = JSON.parse(sensores);
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'El formato de sensores no es válido. Debe ser un array JSON válido' 
        });
      }
    }

    // Validar que sensores sea un array
    if (sensores && !Array.isArray(sensores)) {
      return res.status(400).json({ 
        error: 'El campo sensores debe ser un array' 
      });
    }

    // Validar estado si se proporciona
    if (estado !== undefined && typeof estado !== 'boolean') {
      return res.status(400).json({ 
        error: 'El campo estado debe ser un valor booleano (true/false)' 
      });
    }

    // Validar sensores si se proporcionan
    if (sensores && Array.isArray(sensores)) {
      const tiposValidos = ['LIGHT', 'FAN', 'AIR_CONDITIONER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'SMART_PLUG', 'CURTAIN', 'MOTION_SENSOR', 'AIR_PURIFIER'];
      
      for (let i = 0; i < sensores.length; i++) {
        const sensor = sensores[i];
        
        // Validar campos requeridos del sensor
        if (!sensor.valorSensor || !sensor.idSensor || !sensor.nombreSensor || !sensor.tipoSensor) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: Faltan campos requeridos (valorSensor, idSensor, nombreSensor, tipoSensor)` 
          });
        }

        // Validar tipo de sensor
        if (!tiposValidos.includes(sensor.tipoSensor)) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}` 
          });
        }

        // Validar que valorSensor sea número
        if (typeof sensor.valorSensor !== 'number') {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: El valorSensor debe ser un número` 
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
    }

    // Crear el nuevo entorno
    const entorno = new Entorno({
      nombre,
      horaInicio,
      horaFin,
      sensores: sensores || [], // Array de objetos sensor completos
      diasSemana: diasSemana || [], // Array de días de la semana
      playlist: playlist || [], // Array de objetos playlist
      usuario: new mongoose.Types.ObjectId(usuario), // Convertir string a ObjectId
      estado: estado !== undefined ? estado : true // Usar el valor proporcionado o true por defecto
    });

    const savedEntorno = await entorno.save();

    // Actualizar sensores en sensorData
    if (sensores && sensores.length > 0) {
      await actualizarSensoresEnSensorData(sensores, usuario, deviceId);
    }

    res.status(201).json({
      message: 'Entorno creado exitosamente',
      entorno: savedEntorno,
      sensoresActualizados: sensores ? sensores.length : 0
    });
    
  } catch (err) {
    console.error('Error al crear entorno:', err);
    res.status(400).json({ 
      error: 'Error al crear el entorno',
      details: err.message 
    });
  }
});

// Obtener todos los entornos
router.get('/', async (req, res) => {
  try {
    const entornos = await Entorno.find({}, 'nombre horaInicio horaFin estado').exec();
    res.json(entornos);
  } catch (err) {
    console.error('Error al obtener entornos:', err);
    res.status(500).json({ error: 'Error al obtener los entornos' });
  }
});

// Obtener entornos por usuario
router.get('/usuario/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    
    if (!usuarioId) {
      return res.status(400).json({ error: 'ID de usuario es requerido' });
    }

    // Validar que el usuarioId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    const entornos = await Entorno.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    }, 'usuario nombre horaInicio horaFin estado').exec();
    
    res.json({
      message: `Entornos encontrados para el usuario ${usuarioId}`,
      count: entornos.length,
      entornos: entornos
    });
  } catch (err) {
    console.error('Error al obtener entornos por usuario:', err);
    res.status(500).json({ error: 'Error al obtener los entornos del usuario' });
  }
});  

//obtener entornos por usuario -- completo
router.get('/usuario/completo/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    // Obtener datos de sensores del usuario
    const sensorData = await SensorData.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    }).sort({ timestamp: -1 });

    // Obtener entornos del usuario
    const entornos = await Entorno.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });

    // Preparar estructura de datos compatible con Android
    const entornosFormateados = entornos.map(entorno => ({
      _id: entorno._id.toString(),
      nombre: entorno.nombre,
      horaInicio: entorno.horaInicio,
      horaFin: entorno.horaFin,
      estado: entorno.estado,
      usuario: entorno.usuario.toString(),
      sensores: [], // Se llenará en datosEntorno
      diasSemana: entorno.diasSemana || [],
      playlist: entorno.playlist ? entorno.playlist.map(playlist => ({
        id: playlist.id,
        tema: playlist.tema || null,
        nombre: playlist.nombre || null
      })) : []
    }));

    // Preparar datos detallados de entornos
    const datosEntorno = entornos.map(entorno => {
      // Obtener sensores del entorno con sus datos más recientes
      const sensoresConDatos = [];
      
      if (entorno.sensores && entorno.sensores.length > 0) {
        entorno.sensores.forEach(sensor => {
          // Buscar el dato más reciente para este sensor
          const datoReciente = sensorData.find(dato => 
            dato.idSensor === sensor.idSensor
          );
          
          sensoresConDatos.push({
            idSensor: sensor.idSensor,
            nombreSensor: sensor.nombreSensor,
            tipoSensor: sensor.tipoSensor || 'Desconocido',
            valorSensor: datoReciente ? datoReciente.valorSensor : 0,
            color: sensor.color || null
          });
        });
      }

      return {
        id: entorno._id.toString(),
        nombre: entorno.nombre,
        horaInicio: entorno.horaInicio,
        horaFin: entorno.horaFin,
        estado: entorno.estado,
        sensordata: sensoresConDatos,
        diasSemana: entorno.diasSemana || [],
        playlist: entorno.playlist ? entorno.playlist.map(playlist => ({
          id: playlist.id,
          tema: playlist.tema || null,
          nombre: playlist.nombre || null
        })) : []
      };
    });

    // Respuesta compatible con la estructura esperada por Android
    res.status(200).json({
      message: 'Datos de entornos del usuario obtenidos exitosamente',
      count: entornos.length,
      entornos: entornosFormateados,
      datosEntorno: datosEntorno
    });
  } catch (error) {
    console.error('Error al obtener datos de entornos del usuario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los datos' 
    });
  }
});

// Obtener un entorno por ID
router.get('/:id', async (req, res) => {
  try {
    const entorno = await Entorno.findById(req.params.id).exec();
    
    if (!entorno) {
      return res.status(404).json({ error: 'Entorno no encontrado' });
    }
    
    res.json(entorno);
  } catch (err) {
    console.error('Error al obtener entorno:', err);
    res.status(500).json({ error: 'Error al obtener el entorno' });
  }
});

// Actualizar un entorno
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, horaInicio, horaFin, sensores, diasSemana, playlist, deviceId, estado, usuario } = req.body;
    
    // Validar formato de hora si se proporciona
    if (horaInicio || horaFin) {
      const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if ((horaInicio && !horaRegex.test(horaInicio)) || (horaFin && !horaRegex.test(horaFin))) {
        return res.status(400).json({ 
          error: 'El formato de hora debe ser HH:mm (ejemplo: 09:30)' 
        });
      }
    }

    // Validar estado si se proporciona
    if (estado !== undefined && typeof estado !== 'boolean') {
      return res.status(400).json({ 
        error: 'El campo estado debe ser un valor booleano (true/false)' 
      });
    }

    // Validar sensores si se proporcionan
    if (sensores && Array.isArray(sensores)) {
      const tiposValidos = ['LIGHT', 'FAN', 'AIR_CONDITIONER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'SMART_PLUG', 'CURTAIN', 'MOTION_SENSOR', 'AIR_PURIFIER'];
      
      for (let i = 0; i < sensores.length; i++) {
        const sensor = sensores[i];
        
        // Validar campos requeridos del sensor
        if (!sensor.valorSensor || !sensor.idSensor || !sensor.nombreSensor || !sensor.tipoSensor) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: Faltan campos requeridos (valorSensor, idSensor, nombreSensor, tipoSensor)` 
          });
        }

        // Validar tipo de sensor
        if (!tiposValidos.includes(sensor.tipoSensor)) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}` 
          });
        }

        // Validar que valorSensor sea número
        if (typeof sensor.valorSensor !== 'number') {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: El valorSensor debe ser un número` 
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
    }

    const updatedEntorno = await Entorno.findByIdAndUpdate(
      id,
      { nombre, horaInicio, horaFin, sensores, diasSemana, playlist, estado },
      { new: true, runValidators: true }
    );

    if (!updatedEntorno) {
      return res.status(404).json({ error: 'Entorno no encontrado' });
    }

    // Actualizar sensores en sensorData si se proporcionaron
    if (sensores && sensores.length > 0) {
      await actualizarSensoresEnSensorData(sensores, usuario, deviceId);
    }

    res.json({
      message: 'Entorno actualizado exitosamente',
      entorno: updatedEntorno,
      sensoresActualizados: sensores ? sensores.length : 0
    });
  } catch (err) {
    console.error('Error al actualizar entorno:', err);
    res.status(400).json({ 
      error: 'Error al actualizar el entorno',
      details: err.message 
    });
  }
});

// Eliminar un entorno
router.delete('/:id', async (req, res) => {
  try {
    const deletedEntorno = await Entorno.findByIdAndDelete(req.params.id);
    
    if (!deletedEntorno) {
      return res.status(404).json({ error: 'Entorno no encontrado' });
    }

    res.json({ 
      message: 'Entorno eliminado exitosamente',
      entorno: deletedEntorno
    });
  } catch (err) {
    console.error('Error al eliminar entorno:', err);
    res.status(500).json({ error: 'Error al eliminar el entorno' });
  }
});

// GET /entorno/sensores/usuario/:usuarioId - Obtener todos los sensores de un usuario (en uso y libres)
router.get('/sensores/usuario/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    // Obtener todos los entornos del usuario
    const entornos = await Entorno.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });

    // Extraer todos los sensores de los entornos
    const sensoresEnUso = [];
    const entornosPorSensor = {};

    entornos.forEach(entorno => {
      if (entorno.sensores && Array.isArray(entorno.sensores)) {
        entorno.sensores.forEach(sensor => {
          // Verificar si el sensor ya está en la lista
          const sensorExistente = sensoresEnUso.find(s => s.idSensor === sensor.idSensor);
          
          if (!sensorExistente) {
            sensoresEnUso.push({
              ...sensor.toObject(),
              usuario: usuarioId,
              enUso: true
            });
            entornosPorSensor[sensor.idSensor] = [entorno.nombre];
          } else {
            // Si ya existe, agregar el entorno a la lista
            if (!entornosPorSensor[sensor.idSensor].includes(entorno.nombre)) {
              entornosPorSensor[sensor.idSensor].push(entorno.nombre);
            }
          }
        });
      }
    });

    // Agregar información de en qué entornos está cada sensor
    sensoresEnUso.forEach(sensor => {
      sensor.entornos = entornosPorSensor[sensor.idSensor];
    });

    res.json({
      message: `Sensores del usuario ${usuarioId}`,
      usuario: usuarioId,
      totalSensores: sensoresEnUso.length,
      sensores: sensoresEnUso
    });
  } catch (err) {
    console.error('Error al obtener sensores del usuario:', err);
    res.status(500).json({ error: 'Error al obtener los sensores del usuario' });
  }
});

// GET /entorno/sensores/libres/usuario/:usuarioId - Obtener sensores libres de un usuario
router.get('/sensores/libres/usuario/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    // Obtener todos los sensores del usuario desde sensorData
    const sensorDataRecords = await SensorData.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    }).sort({ timestamp: -1 });
    
    // Obtener todos los entornos del usuario
    const entornos = await Entorno.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });

    // Extraer IDs de sensores en uso
    const sensoresEnUso = new Set();
    entornos.forEach(entorno => {
      if (entorno.sensores && Array.isArray(entorno.sensores)) {
        entorno.sensores.forEach(sensor => {
          sensoresEnUso.add(sensor.idSensor);
        });
      }
    });

    // Encontrar sensores libres (que están en sensorData pero no en entornos)
    const sensoresLibres = [];
    
    sensorDataRecords.forEach(record => {
      if (record.sensores && Array.isArray(record.sensores)) {
        record.sensores.forEach(sensor => {
          if (!sensoresEnUso.has(sensor.idSensor)) {
            // Verificar si ya agregamos este sensor
            const yaExiste = sensoresLibres.find(s => s.idSensor === sensor.idSensor);
            if (!yaExiste) {
              sensoresLibres.push({
                ...sensor.toObject(),
                usuario: usuarioId,
                enUso: false,
                deviceId: record.deviceId,
                ultimaActualizacion: record.timestamp
              });
            }
          }
        });
      }
    });

    res.json({
      message: `Sensores libres del usuario ${usuarioId}`,
      usuario: usuarioId,
      totalSensoresLibres: sensoresLibres.length,
      sensores: sensoresLibres
    });
  } catch (err) {
    console.error('Error al obtener sensores libres:', err);
    res.status(500).json({ error: 'Error al obtener los sensores libres' });
  }
});

// GET /entorno/sensores/todos/usuario/:usuarioId - Obtener todos los sensores (en uso y libres) de un usuario
router.get('/sensores/todos/usuario/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ 
        error: 'El ID de usuario no es válido' 
      });
    }

    // Obtener sensores en uso
    const entornos = await Entorno.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });

    const sensoresEnUso = [];
    const entornosPorSensor = {};

    entornos.forEach(entorno => {
      if (entorno.sensores && Array.isArray(entorno.sensores)) {
        entorno.sensores.forEach(sensor => {
          const sensorExistente = sensoresEnUso.find(s => s.idSensor === sensor.idSensor);
          
          if (!sensorExistente) {
            sensoresEnUso.push({
              ...sensor.toObject(),
              usuario: usuarioId,
              enUso: true,
              estado: 'En uso'
            });
            entornosPorSensor[sensor.idSensor] = [entorno.nombre];
          } else {
            if (!entornosPorSensor[sensor.idSensor].includes(entorno.nombre)) {
              entornosPorSensor[sensor.idSensor].push(entorno.nombre);
            }
          }
        });
      }
    });

    // Agregar información de entornos
    sensoresEnUso.forEach(sensor => {
      sensor.entornos = entornosPorSensor[sensor.idSensor];
    });

    // Obtener sensores libres del usuario específico
    const sensorDataRecords = await SensorData.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    }).sort({ timestamp: -1 });
    
    const sensoresEnUsoIds = new Set(sensoresEnUso.map(s => s.idSensor));
    const sensoresLibres = [];
    
    sensorDataRecords.forEach(record => {
      if (record.sensores && Array.isArray(record.sensores)) {
        record.sensores.forEach(sensor => {
          if (!sensoresEnUsoIds.has(sensor.idSensor)) {
            const yaExiste = sensoresLibres.find(s => s.idSensor === sensor.idSensor);
            if (!yaExiste) {
              sensoresLibres.push({
                ...sensor.toObject(),
                usuario: usuarioId,
                enUso: false,
                estado: 'Libre',
                deviceId: record.deviceId,
                ultimaActualizacion: record.timestamp,
                entornos: []
              });
            }
          }
        });
      }
    });

    // Combinar todos los sensores
    const todosLosSensores = [...sensoresEnUso, ...sensoresLibres];

    res.json({
      message: `Todos los sensores del usuario ${usuarioId}`,
      usuario: usuarioId,
      totalSensores: todosLosSensores.length,
      sensoresEnUso: sensoresEnUso.length,
      sensoresLibres: sensoresLibres.length,
      sensores: todosLosSensores
    });
  } catch (err) {
    console.error('Error al obtener todos los sensores:', err);
    res.status(500).json({ error: 'Error al obtener todos los sensores' });
  }
});

// GET /entorno/sensor/:idSensor/propietario - Obtener a qué usuario pertenece un sensor
router.get('/sensor/:idSensor/propietario', async (req, res) => {
  try {
    const { idSensor } = req.params;
    
    if (!idSensor) {
      return res.status(400).json({ 
        error: 'ID del sensor es requerido' 
      });
    }

    // Buscar el sensor en entornos
    const entorno = await Entorno.findOne({
      'sensores.idSensor': idSensor
    }).populate('usuario', 'nombre email');

    if (entorno) {
      const sensor = entorno.sensores.find(s => s.idSensor === idSensor);
      return res.json({
        message: 'Sensor encontrado en entorno',
        sensor: {
          ...sensor.toObject(),
          usuario: entorno.usuario,
          enUso: true,
          entorno: entorno.nombre
        }
      });
    }

    // Si no está en entornos, buscar en sensorData
    const sensorData = await SensorData.findOne({
      'sensores.idSensor': idSensor
    }).sort({ timestamp: -1 });

    if (sensorData) {
      const sensor = sensorData.sensores.find(s => s.idSensor === idSensor);
      return res.json({
        message: 'Sensor encontrado en sensorData (libre)',
        sensor: {
          ...sensor.toObject(),
          usuario: 'No asignado a usuario específico',
          enUso: false,
          deviceId: sensorData.deviceId,
          ultimaActualizacion: sensorData.timestamp
        }
      });
    }

    res.status(404).json({
      error: 'Sensor no encontrado'
    });
  } catch (err) {
    console.error('Error al buscar propietario del sensor:', err);
    res.status(500).json({ error: 'Error al buscar el propietario del sensor' });
  }
});

// GET /entorno/parametros/:entornoId/usuario/:usuarioId - Obtener todos los parámetros de un entorno por id y usuario
router.get('/parametros/:entornoId/usuario/:usuarioId', async (req, res) => {
  try {
    const { entornoId, usuarioId } = req.params;
    console.log(entornoId, usuarioId);

    // Validar que los IDs sean ObjectId válidos
    if (!mongoose.Types.ObjectId.isValid(entornoId)) {
      return res.status(400).json({ error: 'El ID de entorno no es válido' });
    }
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ error: 'El ID de usuario no es válido' });
    }

    // Buscar el entorno por id y usuario
    const entorno = await Entorno.findOne({
      _id: entornoId,
      usuario: new mongoose.Types.ObjectId(usuarioId)
    }).exec();

    if (!entorno) {
      return res.status(404).json({ error: 'Entorno no encontrado para este usuario' });
    }

    // Devolver todos los parámetros del entorno
    res.json({
      message: `Parámetros del entorno ${entornoId} para el usuario ${usuarioId}`,
      entorno
    });
  } catch (err) {
    console.error('Error al obtener parámetros del entorno:', err);
    res.status(500).json({ error: 'Error al obtener los parámetros del entorno' });
  }
});

// PUT /entorno/toggle/:entornoId/usuario/:usuarioId - Cambiar el estado de un entorno (activar/desactivar)
router.put('/toggle/:entornoId/usuario/:usuarioId', async (req, res) => {
  try {
    const { entornoId, usuarioId } = req.params;

    // Validar que los IDs sean ObjectId válidos
    if (!mongoose.Types.ObjectId.isValid(entornoId)) {
      return res.status(400).json({ error: 'El ID de entorno no es válido' });
    }
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ error: 'El ID de usuario no es válido' });
    }

    // Buscar el entorno actual
    const entornoActual = await Entorno.findOne({
      _id: entornoId,
      usuario: new mongoose.Types.ObjectId(usuarioId)
    });

    if (!entornoActual) {
      return res.status(404).json({ error: 'Entorno no encontrado para este usuario' });
    }

    // Cambiar el estado al opuesto
    const nuevoEstado = !entornoActual.estado;

    // Actualizar el entorno
    const entorno = await Entorno.findOneAndUpdate(
      {
        _id: entornoId,
        usuario: new mongoose.Types.ObjectId(usuarioId)
      },
      { estado: nuevoEstado },
      { new: true, runValidators: true }
    );

    res.json({
      message: `Entorno ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      entorno: {
        id: entorno._id,
        nombre: entorno.nombre,
        estado: entorno.estado
      }
    });
  } catch (err) {
    console.error('Error al cambiar estado del entorno:', err);
    res.status(500).json({ error: 'Error al cambiar el estado del entorno' });
  }
});


module.exports = router; 
