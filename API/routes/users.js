const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const middlewareAuth = require("../middlewares/authMiddleware");
const userService = require("../services/user-service");
const emailService = require("../services/email-service");
const User = require("../models/user");

const router = express.Router();

function normalizePersonalData(personalData = {}) {
  return {
    firstName: String(personalData.firstName || '').trim(),
    lastName: String(personalData.lastName || '').trim(),
    email: String(personalData.email || '').trim().toLowerCase(),
    phone: String(personalData.phone || '').trim(),
    documentId: String(personalData.documentId || '').trim().toUpperCase(),
  };
}

function normalizeShippingAddress(shippingAddress = {}) {
  return {
    street: String(shippingAddress.street || '').trim(),
    city: String(shippingAddress.city || '').trim(),
    zipCode: String(shippingAddress.zipCode || '').trim(),
    country: String(shippingAddress.country || '').trim(),
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, isAdmin, personalData, shippingAddress } = req.body;
    const wantsAdmin = Boolean(isAdmin);

    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      if (wantsAdmin && !existingUser.isAdmin) {
        await userService.setUserAdminByEmail(email, true);
        return res.status(200).json({ message: "Usuario actualizado a admin" });
      }

      return res.status(400).json({ error: "Usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, 10);

    const userDocument = new User(hash, email, wantsAdmin, personalData, shippingAddress);

    await userService.createUser(userDocument);

    try {
      await emailService.sendWelcomeEmail({
        recipientEmail: email,
        userName: email.split('@')[0],
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    res.status(201).json({ message: "Usuario creado" });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const isAdmin = Boolean(user.isAdmin);
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        isAdmin,
        personalData: user.personalData || {},
        shippingAddress: user.shippingAddress || {},
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Error en login" });
  }
});

router.get("/profile", middlewareAuth, async (req, res) => {
  try {
    const user = await userService.findUserById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
        personalData: user.personalData || {},
        shippingAddress: user.shippingAddress || {},
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

router.get("/me", middlewareAuth, async (req, res) => {
  try {
    const user = await userService.findUserById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
        personalData: user.personalData || {},
        shippingAddress: user.shippingAddress || {},
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario autenticado" });
  }
});

router.put("/me", middlewareAuth, async (req, res) => {
  try {
    const payload = {};

    if (req.body.personalData && typeof req.body.personalData === 'object') {
      payload.personalData = normalizePersonalData(req.body.personalData);
    }

    if (req.body.shippingAddress && typeof req.body.shippingAddress === 'object') {
      payload.shippingAddress = normalizeShippingAddress(req.body.shippingAddress);
    }

    const updatedUser = await userService.updateUserProfileData(req.userId, payload);

    if (!updatedUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      message: "Datos de usuario actualizados",
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        isAdmin: Boolean(updatedUser.isAdmin),
        personalData: updatedUser.personalData || {},
        shippingAddress: updatedUser.shippingAddress || {},
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar datos del usuario" });
  }
});

router.delete("/me", middlewareAuth, async (req, res) => {
  try {
    const deleted = await userService.deleteUserById(req.userId);

    if (!deleted) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Cuenta eliminada correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar la cuenta" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "El email es requerido" });
    }

    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(200).json({ message: "Si el email existe, recibirás un correo con instrucciones para recuperar tu contraseña" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    await userService.setResetTokenByEmail(email, resetToken, resetTokenExpiry);

    try {
      await emailService.sendPasswordResetEmail({
        recipientEmail: email,
        resetToken,
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
    }

    res.json({ message: "Si el email existe, recibirás un correo con instrucciones para recuperar tu contraseña" });
  } catch (err) {
    res.status(500).json({ error: "Error al procesar la solicitud de recuperación" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token y nueva contraseña son requeridos" });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres" });
    }

    const user = await userService.findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    const db = await require("../db/mongo")();
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { password: hash },
        $unset: { resetToken: "", resetTokenExpiry: "" },
      },
    );

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al restablecer la contraseña" });
  }
});

module.exports = router;
