const express = require('express');
//const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const router = express.Router();

router.post('/', async (req, res) => {
  const { telefono, correo, contrasena } = req.body;
  console.log('Datos recibidos:', req.body);
  

  // Validar que se proporcione la contraseña
  if (!contrasena) {
    return res.status(400).json({ 
      error: 'La contraseña es requerida' 
    });
  }

  try {
    let user;
    
    // Buscar usuario por teléfono o correo
    if (telefono || correo) {
      // Si se proporcionan ambos, buscar por cualquiera de los dos
      user = await User.findOne({
        $or: [{ telefono }, { correo }]
      }).select('+contrasena');
    } else if (telefono) {
      // Buscar solo por teléfono
      user = await User.findOne({ telefono }).select('+contrasena');
    } else {
      // Buscar solo por correo
      user = await User.findOne({ correo }).select('+contrasena');
    }

    if (!user) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado con las credenciales proporcionadas' 
      });
    }

    // Verificar contraseña usando el método del modelo
    const isMatch = await user.compararContrasena(contrasena);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Contraseña incorrecta' 
      });
    }

    // Generar el token (comentado por ahora)
    {/** const token = jwt.sign(
      { id: user._id, email: user.correo },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    */}

    // Preparar respuesta sin incluir la contraseña
    const userResponse = {
      userId: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      telefono: user.telefono,
      fechaCumpleanos: user.fechaCumpleanos,
      edad: user.obtenerEdad(),
      nombreCompleto: user.obtenerNombreCompleto()
    };

    console.log('Inicio de sesión exitoso para:', userResponse.nombreCompleto, userResponse.userId);

    res.status(200).json({ 
      message: 'Inicio de sesión exitoso', 
      user: userResponse
    });
  } catch (err) {
    console.error('Error en /login:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor durante el inicio de sesión' 
    });
  }
});

module.exports = router;
