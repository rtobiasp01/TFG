const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// Transporter configurado con las credenciales del .env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /newsletter - Suscribirse al newsletter
router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    // Validar email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        error: "Por favor, introduce un email válido.",
      });
    }

    // Enviar email de confirmación
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "¡Bienvenido a nuestro newsletter!",
      html: `
        <h2>¡Gracias por suscribirte!</h2>
        <p>A partir de ahora recibirás las novedades sobre nuestros productos y colecciones.</p>
        <p>Estamos emocionados de compartir contigo nuestras últimas creaciones.</p>
        <br/>
        <p>Saludos,<br/>El equipo de ${process.env.SITE_NAME || "nuestra tienda"}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "¡Suscripción confirmada! Revisa tu correo.",
    });
  } catch (error) {
    console.error("Error al enviar email:", error);
    res.status(500).json({
      error: "Error al procesar la suscripción. Intenta de nuevo más tarde.",
    });
  }
});

module.exports = router;
