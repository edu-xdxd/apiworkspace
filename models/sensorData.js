// models/SensorData.js
const mongoose = require('mongoose')

const SensorSchema = new mongoose.Schema({
  valorSensor: { type: Number, required: true },
  idSensor: { type: String, required: true },
  nombreSensor: { type: String, required: true },
  tipoSensor: {
    type: String,
    required: true,
    enum: ['LIGHT', 'FAN', 'AIR_CONDITIONER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'SMART_PLUG', 'CURTAIN', 'MOTION_SENSOR', 'AIR_PURIFIER']
  },
  color: {
    type: String,
    required: false,
    validate: {
      validator: function (v) {
        // Solo permitir color si el tipo es LIGHT
        if (this.tipoSensor === 'LIGHT') {
          return typeof v === 'string' && v.length > 0;
        } else {
          return v === undefined || v === null;
        }
      },
      message: 'El campo color solo se permite si el tipoSensor es LIGHT, y debe ser un string no vacío.'
    }
  }
}, { _id: false });

const SensorDataSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sensores: [SensorSchema],
  timestamp: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('SensorData', SensorDataSchema)
