const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const postmark = require("postmark");

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

/**
 * Inicio de sesión de un usuario
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos." });
  }

  try {
    // 1. Buscar el usuario (Usando el objeto 'where' de Sequelize)
    const user = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    // 2. Verificar si el usuario existe
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // 3. Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Contraseña incorrecta." });
    }

    // 4. Generar el token JWT (Cambiamos _id por id)
    const token = jwt.sign(
      { id: user.id },
      process.env.SECRET_JWT_KEY,
      { expiresIn: "1d" }
    );

    // 5. Preparar la respuesta (Sin la contraseña)
    // Nota: Revisa si en tu modelo es "rol" o "role" para que no de undefined
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role, // En tu modelo definiste "rol", asegúrate que coincida
      name: user.name || null,
    };

    return res.status(200).json({
      message: "Inicio de sesión exitoso.",
      user: userResponse,
      token,
    });

  } catch (error) {
    console.error("Error en el inicio de sesión:", error);

    // Manejo de errores específicos de Sequelize (opcional)
    if (error.name === 'SequelizeConnectionError') {
      return res.status(503).json({ message: "Error de conexión con la base de datos." });
    }

    return res.status(500).json({ message: "Error interno del servidor al iniciar sesión." });
  }
};

module.exports = { loginUser };

/**
 * Enviar OTP al correo electrónico del usuario
 */
const sendOTP = async (req, res) => {
  const { email } = req.body;

  // Validar que el email esté presente
  if (!email) {
    return res.status(400).json({ message: "El email es requerido." });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Formato de correo electrónico inválido." });
  }

  // Buscar usuario en la DB
  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  try {
    // Generar un secreto y un OTP
    const secret = speakeasy.generateSecret({ length: 20 });
    const otp = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
    });

    // Generar un token JWT que incluya el secreto y el email
    const token = jwt.sign(
      { secret: secret.base32, email: email.toLowerCase() },
      process.env.SECRET_JWT_KEY,
      { expiresIn: "1h" }
    );

    console.log('DEBUG SECRET:', secret.base32);

    // Configurar las opciones del correo electrónico
    const mailOptions = {
      From: "support@nittogame.com",
      To: email,
      Subject: "¡Bienvenido a Nitto!",
      HtmlBody: `Tu código de verificación es: <b>${otp}</b>`,
      TextBody: "Gracias por registrarte en Nitto",
      MessageStream: "outbound",
    };

    // Enviar el correo electrónico
    await client.sendEmail(mailOptions);

    // No guardamos el token en la DB para evitar problemas de esquema UUID,
    // simplemente lo devolvemos para que el frontend lo utilice.
    
    // Respuesta exitosa
    return res.status(200).json({
      message: "Código OTP enviado correctamente.",
      token: token,
    });
  } catch (error) {
    console.error("Error enviando OTP:", error);

    // Manejar errores específicos
    if (error.response) {
      return res.status(400).json({ message: "Error al enviar el correo electrónico.", details: error.response });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al enviar el OTP." });
  }
};

/**
 * Verificar OTP y actualizar el rol del usuario a "verified user"
 */
const verifyOTP = async (req, res) => {
  const { otp, email, token } = req.body;

  // Validar que el OTP y el token estén presentes
  if (!otp || !email || !token) {
    return res.status(400).json({ message: "OTP y token requeridos." });
  }

  // Buscar el token en la DB
  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  try {
    // Verificar y decodificar el token JWT recibido del frontend
    const decodedUser = jwt.verify(token, process.env.SECRET_JWT_KEY);

    // Verificar el OTP
    const isValid = speakeasy.totp.verify({
      secret: decodedUser.secret,
      encoding: "base32",
      token: otp,
      window: 1, // Permite un margen de error de 1 paso (30 segundos)
    });

    console.log('DEBUG SECRET:', decodedUser.secret);

    // Si el OTP no es válido, devolver error
    if (!isValid) {
      return res.status(400).json({ message: "OTP inválido o expirado." });
    }

    // Actualizar el rol del usuario a "verified user"
    await user.update({ role: "verified user" });

    // Crear un objeto de respuesta sin la contraseña
    const userResponse = {
      id: user.id,
      email: user.email.toLowerCase(),
      role: user.role,
      name: user.name || null,
    };

    // Respuesta exitosa
    return res.status(200).json({
      message: "Usuario verificado con éxito.",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error verificando OTP:", error);

    // Manejar errores específicos
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token no válido." });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "El token ha expirado." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al verificar el OTP." });
  }
};

/**
 * Cambiar contraseña de un usuario
 */
const changePassword = async (req, res) => {
  const { password, new_password, id } = req.body;

  // Validar que todos los campos estén presentes
  if (!password || !new_password || !id) {
    return res.status(400).json({ message: "Todos los campos son requeridos." });
  }

  try {
    // Buscar el usuario por ID
    const user = await User.findByPk(id);

    // Verificar si el usuario existe
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Verificar si la contraseña actual es correcta
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Contraseña actual incorrecta." });
    }

    // Hashear la nueva contraseña
    const hash = await bcrypt.hash(new_password, 10);

    // Actualizar la contraseña del usuario
    await user.update({ password: hash });

    // Respuesta exitosa
    return res.status(200).json({ message: "Contraseña cambiada con éxito." });
  } catch (error) {
    console.error("Error cambiando la contraseña:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de usuario no válido." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al cambiar la contraseña." });
  }
};

/**
 * Enviar enlace de restablecimiento de contraseña al correo electrónico del usuario
 */
const sendResetLink = async (req, res) => {
  const { email } = req.body;

  // Validar que el email esté presente
  if (!email) {
    return res.status(400).json({ message: "El email es requerido." });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Formato de correo electrónico inválido." });
  }

  try {
    // Buscar el usuario por email (insensible a mayúsculas/minúsculas)
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    // Verificar si el usuario existe
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Generar un token JWT con expiración de 10 minutos
    const token = jwt.sign({ id: user.id }, process.env.SECRET_JWT_KEY, {
      expiresIn: "10m",
    });

    // Configurar las opciones del correo electrónico
    const mailOptions = {
      From: "support@nittogame.com",
      To: email,
      Subject: "¡Recupera el acceso a tu cuenta de Nitto!",
      HtmlBody: `
        <p>Presiona el siguiente enlace para restablecer tu contraseña:</p>
        <a href="https://nittogame.com/authentication/forgot-password/${token}">Restablecer contraseña</a>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `,
      TextBody: `
        Presiona el siguiente enlace para restablecer tu contraseña:
        https://nittogame.com/authentication/forgot-password/${token}

        Si no solicitaste este cambio, ignora este correo.
      `,
    };

    // Enviar el correo electrónico
    await client.sendEmail(mailOptions);

    // Respuesta exitosa
    return res.status(200).json({ message: "Correo de recuperación enviado con éxito." });
  } catch (error) {
    console.error("Error enviando correo de recuperación:", error);

    // Manejar errores específicos
    if (error.response) {
      return res.status(400).json({ message: "Error al enviar el correo electrónico.", details: error.response });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al enviar el correo de recuperación." });
  }
};

/**
 * Restablecer la contraseña de un usuario
 */
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  // Validar que el token y la nueva contraseña estén presentes
  if (!token || !password) {
    return res.status(400).json({ message: "Token y nueva contraseña son requeridos." });
  }

  try {
    // Verificar y decodificar el token JWT
    const decoded = jwt.verify(token, process.env.SECRET_JWT_KEY);

    // Verificar si el token es válido
    if (!decoded) {
      return res.status(400).json({ message: "Token inválido o expirado." });
    }

    // Hashear la nueva contraseña
    const hash = await bcrypt.hash(password, 10);

    // Buscar el usuario y actualizar la contraseña
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    
    await user.update({ password: hash });

    // Respuesta exitosa
    return res.status(200).json({ message: "Contraseña cambiada con éxito." });
  } catch (error) {
    console.error("Error cambiando la contraseña:", error);

    // Manejar errores específicos
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token inválido o expirado." });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "El token ha expirado." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al cambiar la contraseña." });
  }
};

module.exports = {
  loginUser,
  sendOTP,
  verifyOTP,
  changePassword,
  sendResetLink,
  resetPassword,
};
