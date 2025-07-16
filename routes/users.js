const express = require('express');
const User = require('../models/user');
const router = express.Router();

// POST /users - Crear nuevo usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, apellido, correo, telefono, fechaCumpleanos, contrasena } = req.body;
    console.log('Datos recibidos:', req.body);

    // Verificar si el usuario ya existe por correo o teléfono
    const usuarioExistente = await User.findOne({
      $or: [{ correo }, { telefono }]
    });

    if (usuarioExistente) {
      return res.status(400).json({
        error: 'Ya existe un usuario con este correo electrónico o teléfono'
      });
    }

    // Crear nuevo usuario
    const nuevoUsuario = new User({
      nombre,
      apellido,
      correo,
      telefono,
      fechaCumpleanos: new Date(fechaCumpleanos),
      contrasena
    });

    // Guardar usuario (la contraseña se hasheará automáticamente)
    const usuarioGuardado = await nuevoUsuario.save();

    console.log('Usuario creado exitosamente:', usuarioGuardado._id);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: usuarioGuardado
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Error de validación',
        detalles: errores
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor al crear el usuario'
    });
  }
});

// GET /users - Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const usuarios = await User.find().select('-contrasena');
    
    res.status(200).json({
      message: 'Usuarios obtenidos exitosamente',
      usuarios,
      total: usuarios.length
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor al obtener los usuarios'
    });
  }
});

// GET /users/:id - Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('-contrasena');
    
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      message: 'Usuario obtenido exitosamente',
      usuario
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'ID de usuario inválido'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor al obtener el usuario'
    });
  }
});

// PUT /users/:id - Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { nombre, apellido, correo, telefono, fechaCumpleanos } = req.body;
    
    // Verificar si el usuario existe
    const usuario = await User.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si el correo o teléfono ya están en uso por otro usuario
    if (correo || telefono) {
      const usuarioExistente = await User.findOne({
        $and: [
          { _id: { $ne: req.params.id } }, // Excluir el usuario actual
          { $or: [] }
        ]
      });

      if (correo) {
        usuarioExistente.$and[1].$or.push({ correo });
      }
      if (telefono) {
        usuarioExistente.$and[1].$or.push({ telefono });
      }

      if (usuarioExistente) {
        return res.status(400).json({
          error: 'Ya existe otro usuario con este correo electrónico o teléfono'
        });
      }
    }

    // Actualizar campos
    const camposActualizados = {};
    if (nombre) camposActualizados.nombre = nombre;
    if (apellido) camposActualizados.apellido = apellido;
    if (correo) camposActualizados.correo = correo;
    if (telefono) camposActualizados.telefono = telefono;
    if (fechaCumpleanos) camposActualizados.fechaCumpleanos = new Date(fechaCumpleanos);

    const usuarioActualizado = await User.findByIdAndUpdate(
      req.params.id,
      camposActualizados,
      { new: true, runValidators: true }
    ).select('-contrasena');

    res.status(200).json({
      message: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Error de validación',
        detalles: errores
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor al actualizar el usuario'
    });
  }
});

// DELETE /users/:id - Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const usuario = await User.findByIdAndDelete(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      message: 'Usuario eliminado exitosamente',
      usuarioEliminado: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido
      }
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor al eliminar el usuario'
    });
  }
});

// POST /users/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    // Buscar usuario por correo e incluir la contraseña
    const usuario = await User.findOne({ correo }).select('+contrasena');
    
    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const contrasenaValida = await usuario.compararContrasena(contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        telefono: usuario.telefono,
        fechaCumpleanos: usuario.fechaCumpleanos,
        edad: usuario.obtenerEdad(),
        nombreCompleto: usuario.obtenerNombreCompleto()
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor durante el inicio de sesión'
    });
  }
});

module.exports = router; 