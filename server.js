const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 4001;

const auth = require('./routes/auth');
const users = require('./routes/users');
const sensorData = require('./routes/sensorData');
const login = require('./routes/login');
const entorno = require('./routes/entorno');

console.log("Mongo URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexión exitosa a MongoDB'))
  .catch((error) => console.error('Error conectando a MongoDB:', error));

app.use(cors());
app.use(express.json());

app.use('/', auth);
app.use('/users', users);
app.use('/sensor-data', sensorData);
app.use('/login', login);
app.use('/entorno', entorno);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));