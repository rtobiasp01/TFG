const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const middlewareAuth = require("../middlewares/authMiddleware");
const userService = require("../services/user-service");
const emailService = require("../services/email-service");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;
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

    await userService.createUser({
      email,
      password: hash,
      isAdmin: wantsAdmin,
    });

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
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario autenticado" });
  }
});

module.exports = router;
