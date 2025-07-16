const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true,
    minlength: [2, 'El apellido debe tener al menos 2 caracteres'],
    maxlength: [50, 'El apellido no puede exceder 50 caracteres']
  },
  correo: {
    type: String,
    required: [true, 'El correo electrónico es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor ingrese un correo electrónico válido'
    ]
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es requerido'],
    unique: true,
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Por favor ingrese un número de teléfono válido'
    ]
  },
  fechaCumpleanos: {
    type: Date,
    required: [true, 'La fecha de cumpleaños es requerida'],
    validate: {
      validator: function(value) {
        // Validar que la fecha no sea en el futuro
        return value <= new Date();
      },
      message: 'La fecha de cumpleaños no puede ser en el futuro'
    }
  },
  contrasena: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir la contraseña en las consultas por defecto
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automáticamente maneja createdAt y updatedAt
});

// Middleware para hashear la contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  // Solo hashear la contraseña si ha sido modificada
  if (!this.isModified('contrasena')) return next();
  
  try {
    // Generar salt y hashear la contraseña
    const salt = await bcrypt.genSalt(12);
    this.contrasena = await bcrypt.hash(this.contrasena, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
UserSchema.methods.compararContrasena = async function(contrasenaCandidata) {
  return await bcrypt.compare(contrasenaCandidata, this.contrasena);
};

// Método para obtener la edad del usuario
UserSchema.methods.obtenerEdad = function() {
  const hoy = new Date();
  const fechaNacimiento = this.fechaCumpleanos;
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  
  return edad;
};

// Método para obtener el nombre completo
UserSchema.methods.obtenerNombreCompleto = function() {
  return `${this.nombre} ${this.apellido}`;
};

// Configurar el esquema para que no incluya la contraseña en las respuestas JSON
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.contrasena;
  return userObject;
};

module.exports = mongoose.model('User', UserSchema); 