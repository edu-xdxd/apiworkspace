const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  valorSensor: { type: Number, required: true },
  idSensor: { type: String, required: true },
  nombreSensor: { type: String, required: true },
  tipoSensor: { 
    type: String, 
    required: true,
    enum: ['LIGHT', 'FAN', 'AIR_CONDITIONER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'SMART_PLUG', 'CURTAIN', 'MOTION_SENSOR', 'AIR_PURIFIER']
  },
  color: { type: String } // Campo opcional para el color
}, { _id: false }); // Deshabilitar _id automático

const PlaylistSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tema: { type: String, required: true }
}, { _id: false }); // Deshabilitar _id automático

const EntornoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  horaInicio: { type: String, required: true }, // formato HH:mm
  horaFin: { type: String, required: true }, // formato HH:mm
  sensores: [SensorSchema], // Array de objetos sensor completos
  diasSemana: [{ type: String, enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] }],
  playlist: [PlaylistSchema],
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  estado: { type: Boolean, default: false } // true = activo, false = inactivo
});

module.exports = mongoose.model('Entorno', EntornoSchema); 