const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

module.exports = router;
