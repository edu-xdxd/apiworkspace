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
const esp32 = require('./routes/esp32');

console.log("Mongo URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexión exitosa a MongoDB'))
  .catch((error) => console.error('Error conectando a MongoDB:', error));

// Función para hacer ping a la base de datos
function pingDatabase() {
  const db = mongoose.connection;
  
  if (db.readyState === 1) {
    // La conexión está activa, hacer ping
    db.db.admin().ping()
      .then(() => {
        console.log(`[${new Date().toISOString()}] ✅ Ping exitoso a MongoDB`);
      })
      .catch((error) => {
        console.error(`[${new Date().toISOString()}] ❌ Error en ping a MongoDB:`, error.message);
      });
  } else {
    console.log(`[${new Date().toISOString()}] ⚠️  Base de datos no conectada. Estado: ${db.readyState}`);
  }
}

// Configurar ping cada 10 segundos
setInterval(pingDatabase, 10000);

// Hacer el primer ping inmediatamente
pingDatabase();

app.use(cors());
app.use(express.json());

app.use('/', auth);
app.use('/users', users);
app.use('/sensor-data', sensorData);
app.use('/login', login);
app.use('/entorno', entorno);
app.use('/esp32', esp32);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));