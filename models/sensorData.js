// models/SensorData.js
const mongoose = require('mongoose')

const SensorDataSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  heartRate: {
    type: Number,
    required: true
  },
  steps: {
    type: Number,
    required: true
  },
  light: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('SensorData', SensorDataSchema)
