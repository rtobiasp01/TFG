const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const middlewareAuth = require("../middlewares/authMiddleware");
const userService = require("../services/user-service");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, 10);

    await userService.createUser({
      email,
      password: hash,
    });

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

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Error en login" });
  }
});

router.get("/profile", middlewareAuth, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "No hay usuarios registrados" });
    }
    res.json({ users: users });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

module.exports = router;
