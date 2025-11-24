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
const Entorno = require('./models/entorno');

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

// Función para obtener el día de la semana en español según la zona horaria de México
function obtenerDiaSemanaMexico() {
  const ahora = new Date();
  const opciones = { timeZone: 'America/Mexico_City', weekday: 'long' };
  const diaString = ahora.toLocaleDateString('es-MX', opciones);
  
  // Mapear días posibles a español
  const diasMap = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miércoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sábado': 'Sábado',
    'domingo': 'Domingo',
    'Monday': 'Lunes',
    'Tuesday': 'Martes',
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
  };
  
  // Buscar el día en el string (case insensitive)
  const diaLower = diaString.toLowerCase();
  for (const [key, value] of Object.entries(diasMap)) {
    if (diaLower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Fallback: usar getDay() pero ajustado para la zona horaria de México
  // Crear una fecha formateada en la zona horaria de México y obtener el día
  const fechaMexico = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[fechaMexico.getDay()];
}

// Función para obtener la hora actual en formato HH:mm (24 horas) de México
function obtenerHoraActualMexico() {
  const ahora = new Date();
  // Obtener hora y minutos en formato de 24 horas de la zona horaria de México
  const horaMexico = ahora.toLocaleString('en-US', { 
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Asegurar formato HH:mm (puede venir como "HH:mm" o "H:mm")
  const partes = horaMexico.split(':');
  const horas = partes[0].padStart(2, '0');
  const minutos = partes[1].padStart(2, '0');
  
  return `${horas}:${minutos}`;
}

// Función para convertir hora HH:mm (formato 24 horas) a minutos desde medianoche
function horaAMinutos(hora) {
  const [horas, minutos] = hora.split(':').map(Number);
  
  // Validar que las horas estén en rango 0-23 y minutos 0-59
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    throw new Error(`Formato de hora inválido: ${hora}. Debe estar en formato 24 horas (00:00 - 23:59)`);
  }
  
  return horas * 60 + minutos;
}

// Función para verificar si la hora actual está dentro del rango
function estaEnRangoHorario(horaActual, horaInicio, horaFin) {
  const minutosActual = horaAMinutos(horaActual);
  const minutosInicio = horaAMinutos(horaInicio);
  const minutosFin = horaAMinutos(horaFin);
  
  // Si la hora de fin es menor que la de inicio, significa que cruza medianoche
  if (minutosFin < minutosInicio) {
    return minutosActual >= minutosInicio || minutosActual <= minutosFin;
  }
  
  return minutosActual >= minutosInicio && minutosActual <= minutosFin;
}

// Función principal para verificar y actualizar estados de entornos
async function verificarEntornos() {
  try {
    // Obtener fecha y hora actual de México - Guadalajara
    const ahora = new Date();
    const fechaHoraMexico = ahora.toLocaleString('es-MX', { 
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });
    
    const diaActual = obtenerDiaSemanaMexico();
    const horaActual = obtenerHoraActualMexico();
    
    console.log(`\n[${new Date().toISOString()}] Verificando entornos...`);
    console.log(`Día actual (México - Guadalajara): ${diaActual}`);
    console.log(`Hora actual (México - Guadalajara, formato 24h): ${horaActual}`);
    console.log(`Fecha y hora completa: ${fechaHoraMexico}`);
    
    // Obtener todos los entornos
    const entornos = await Entorno.find({});
    
    let entornosActualizados = 0;
    
    for (const entorno of entornos) {
      // Verificar si el día actual está en los días de la semana del entorno
      const diaValido = entorno.diasSemana && entorno.diasSemana.length > 0 
        ? entorno.diasSemana.includes(diaActual)
        : false;
      
      // Verificar si la hora actual está en el rango
      const horaValida = estaEnRangoHorario(horaActual, entorno.horaInicio, entorno.horaFin);
      
      // Determinar el nuevo estado
      const nuevoEstado = diaValido && horaValida;
      
      // Solo actualizar si el estado cambió
      if (entorno.estado !== nuevoEstado) {
        entorno.estado = nuevoEstado;
        await entorno.save();
        entornosActualizados++;
        
        console.log(`  ✓ Entorno "${entorno.nombre}" actualizado: ${entorno.estado ? 'ACTIVO' : 'INACTIVO'}`);
        console.log(`    - Día válido: ${diaValido ? 'Sí' : 'No'} (${entorno.diasSemana?.join(', ') || 'N/A'})`);
        console.log(`    - Hora válida: ${horaValida ? 'Sí' : 'No'} (${entorno.horaInicio} - ${entorno.horaFin} formato 24h)`);
      }
    }
    
    if (entornosActualizados === 0) {
      console.log(`  → No se requirieron actualizaciones. Total de entornos: ${entornos.length}`);
    } else {
      console.log(`  → Total de entornos actualizados: ${entornosActualizados} de ${entornos.length}`);
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error al verificar entornos:`, error);
  }
}

// Ejecutar verificación inmediatamente al iniciar (después de conectar a MongoDB)
mongoose.connection.once('open', () => {
  console.log('Iniciando verificación de entornos...');
  verificarEntornos();
  
  // Configurar verificación cada 1 minuto (60000 ms)
  setInterval(verificarEntornos, 10000);
  console.log('Verificación de entornos configurada para ejecutarse cada 1 minuto');
});

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
