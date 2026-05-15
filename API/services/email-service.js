const nodemailer = require('nodemailer');

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class EmailService {
  /**
   * Enviar email de bienvenida a un nuevo usuario.
   * @param {Object} options - Opciones del email
   * @param {string} options.recipientEmail - Email del destinatario
   * @param {string} [options.userName] - Nombre visible del usuario (opcional)
   */
  async sendWelcomeEmail(options) {
    try {
      const { recipientEmail, userName } = options;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #78350f 0%, #92400e 55%, #b45309 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 24px; background-color: #ffffff; border-radius: 12px; margin-top: 16px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08); }
              .cta { display: inline-block; margin-top: 18px; padding: 12px 18px; background: #b45309; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; }
              .footer { text-align: center; padding: 18px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Bienvenido a la tienda!</h1>
              </div>

              <div class="content">
                <p>Hola${userName ? ` ${userName}` : ''},</p>
                <p>Tu cuenta se ha creado correctamente. Ya puedes empezar a explorar el catálogo, guardar tus favoritos y realizar pedidos.</p>
                <p style="margin: 0;">Si quieres acceder a tu cuenta, entra en el siguiente enlace:</p>
                <a class="cta" href="${process.env.SITE_URL || 'http://localhost:4200'}/login">Iniciar sesión</a>
              </div>

              <div class="footer">
                <p>Este es un email automático. Por favor no respondas a este correo.</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.SITE_NAME || 'Mi Tienda'}. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: '¡Bienvenido a la tienda!',
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Welcome email sent successfully' };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw new Error(`Error sending welcome email: ${error.message}`);
    }
  }

  /**
   * Enviar email de notificación de cambio de estado de orden
   * @param {Object} options - Opciones del email
   * @param {string} options.recipientEmail - Email del destinatario
   * @param {Object} options.order - Datos de la orden
   * @param {string} options.newStatus - Nuevo estado de la orden
   */
  async sendOrderStatusEmail(options) {
    try {
      const { recipientEmail, order, newStatus } = options;

      // Mapeo de estados a mensajes en español
      const statusMessages = {
        pendiente: {
          title: 'Pedido Recibido',
          description: 'Tu pedido ha sido recibido y está siendo procesado.',
          color: '#FFA500', // Orange
        },
        confirmado: {
          title: 'Pedido Confirmado',
          description: 'Tu pedido ha sido confirmado. Nos prepararemos para enviarlo pronto.',
          color: '#4169E1', // Royal Blue
        },
        enviado: {
          title: 'Pedido Enviado',
          description: 'Tu pedido está en camino. ¡Pronto llegará a tu puerta!',
          color: '#228B22', // Forest Green
        },
        entregado: {
          title: 'Pedido Entregado',
          description: '¡Tu pedido ha sido entregado exitosamente!',
          color: '#00AA00', // Green
        },
        cancelado: {
          title: 'Pedido Cancelado',
          description: 'Tu pedido ha sido cancelado. Nos disculpamos por cualquier inconveniente.',
          color: '#DC143C', // Crimson Red
        },
      };

      const statusInfo = statusMessages[newStatus] || statusMessages.pendiente;

      // Formatear items de la orden
      const itemsHtml = order.items
        .map(
          (item) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px;">${item.productTitle}</td>
          <td style="padding: 10px; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; text-align: right;">€${item.price.toFixed(2)}</td>
          <td style="padding: 10px; text-align: right;">€${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `,
        )
        .join('');

      // HTML del email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: ${statusInfo.color}; color: white; padding: 20px; border-radius: 5px; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .section-title { font-weight: bold; color: #333; margin-top: 15px; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; }
              th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
              .totals { text-align: right; margin-top: 15px; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .badge { display: inline-block; padding: 5px 10px; border-radius: 3px; background-color: ${statusInfo.color}; color: white; font-size: 12px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${statusInfo.title}</h1>
              </div>

              <div class="content">
                <p>¡Hola!</p>
                <p>${statusInfo.description}</p>

                <div class="order-details">
                  <div class="section-title">Información del Pedido</div>
                  <p>
                    <strong>Número de Pedido:</strong> #${order._id}<br>
                    <strong>Estado:</strong> <span class="badge">${newStatus.toUpperCase()}</span><br>
                    <strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>

                  <div class="section-title">Artículos del Pedido</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style="text-align: center;">Cantidad</th>
                        <th style="text-align: right;">Precio Unitario</th>
                        <th style="text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>

                  <div class="totals">
                    <p>Subtotal: €${order.subtotal.toFixed(2)}</p>
                    ${order.discount > 0 ? `<p style="color: #228B22;">Descuento: -€${order.discount.toFixed(2)}</p>` : ''}
                    <p style="font-size: 18px; color: ${statusInfo.color};">Total: €${order.total.toFixed(2)}</p>
                  </div>

                  <div class="section-title">Dirección de Envío</div>
                  <p>
                    ${order.shippingAddress.street}<br>
                    ${order.shippingAddress.zipCode} ${order.shippingAddress.city}<br>
                    ${order.shippingAddress.country}
                  </p>
                </div>

                <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
                <p>¡Gracias por tu compra!<br><strong>${process.env.SITE_NAME || 'Nuestro Equipo'}</strong></p>
              </div>

              <div class="footer">
                <p>Este es un email automático. Por favor no responda a este correo.</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.SITE_NAME || 'Mi Tienda'}. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `${statusInfo.title} - Pedido #${order._id}`,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Error sending email: ${error.message}`);
    }
  }

  /**
   * Enviar email de confirmación de nuevo pedido
   * @param {Object} options - Opciones del email
   * @param {string} options.recipientEmail - Email del destinatario
   * @param {Object} options.order - Datos de la orden
   * @param {string} options.userName - Nombre del usuario (opcional)
   */
  async sendOrderConfirmationEmail(options) {
    try {
      const { recipientEmail, order, userName } = options;

      // Formatear items de la orden
      const itemsHtml = order.items
        .map(
          (item) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px;">${item.productTitle}</td>
          <td style="padding: 10px; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; text-align: right;">€${item.price.toFixed(2)}</td>
          <td style="padding: 10px; text-align: right;">€${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `,
        )
        .join('');

      // HTML del email de confirmación
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #78350f 0%, #92400e 55%, #b45309 100%); color: white; padding: 30px; border-radius: 5px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
              .header p { margin: 5px 0 0 0; font-size: 16px; opacity: 0.9; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .section-title { font-weight: bold; color: #333; margin-top: 15px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
              table { width: 100%; border-collapse: collapse; }
              th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold; }
              .totals { text-align: right; margin-top: 15px; }
              .totals-row { padding: 8px 0; border-bottom: 1px solid #eee; }
              .totals-total { font-weight: bold; font-size: 18px; padding: 12px 0 0 0; color: #b45309; border-top: 2px solid #ddd; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: white; border-top: 1px solid #ddd; }
              .order-id { background: #f0f0f0; padding: 10px; border-radius: 3px; font-family: monospace; font-weight: bold; display: inline-block; }
              .next-steps { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 15px 0; border-radius: 3px; }
              .next-steps h3 { margin: 0 0 10px 0; color: #15803d; }
              .next-steps ul { margin: 0; padding-left: 20px; }
              .next-steps li { margin: 5px 0; color: #166534; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Pedido Confirmado!</h1>
                <p>Tu compra ha sido procesada exitosamente</p>
              </div>

              <div class="content">
                <p>¡Hola${userName ? ' ' + userName : ''}!</p>
                <p>Gracias por tu compra. Tu pedido ha sido confirmado y está siendo procesado.</p>

                <div class="order-details">
                  <div class="section-title">Información del Pedido</div>
                  <p>
                    <strong>Número de Pedido:</strong><br>
                    <span class="order-id">#${order._id}</span>
                  </p>
                  <p>
                    <strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>

                  <div class="section-title">Artículos del Pedido</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style="text-align: center;">Cantidad</th>
                        <th style="text-align: right;">Precio Unitario</th>
                        <th style="text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>

                  <div class="totals">
                    <div class="totals-row">
                      <strong>Subtotal:</strong> €${order.subtotal.toFixed(2)}
                    </div>
                    ${order.discount > 0 ? `
                    <div class="totals-row" style="color: #16a34a;">
                      <strong>Descuento:</strong> -€${order.discount.toFixed(2)}
                    </div>
                    ` : ''}
                    <div class="totals-row totals-total">
                      Total: €${order.total.toFixed(2)}
                    </div>
                  </div>

                  <div class="section-title">Dirección de Envío</div>
                  <p>
                    ${order.shippingAddress.street}<br>
                    ${order.shippingAddress.zipCode} ${order.shippingAddress.city}<br>
                    ${order.shippingAddress.country}
                  </p>

                  <div class="next-steps">
                    <h3>Próximos Pasos:</h3>
                    <ul>
                      <li>Recibirás una confirmación cuando tu pedido se envíe</li>
                      <li>Podrás rastrear tu envío con el número de pedido</li>
                      <li>Si tienes preguntas, no dudes en contactarnos</li>
                    </ul>
                  </div>
                </div>

                <p>¡Gracias por tu compra!<br><strong>${process.env.SITE_NAME || 'Nuestro Equipo'}</strong></p>
              </div>

              <div class="footer">
                <p>Este es un email automático. Por favor no responda a este correo.</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.SITE_NAME || 'Mi Tienda'}. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `Confirmación de Pedido - Pedido #${order._id}`,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Confirmation email sent successfully' };
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      throw new Error(`Error sending confirmation email: ${error.message}`);
    }
  }

  /**
   * Enviar email de recuperación de contraseña
   * @param {Object} options - Opciones del email
   * @param {string} options.recipientEmail - Email del destinatario
   * @param {string} options.resetToken - Token de recuperación
   */
  async sendPasswordResetEmail(options) {
    try {
      const { recipientEmail, resetToken } = options;

      const resetUrl = `${process.env.SITE_URL || 'http://localhost:4200'}/reset-password/${resetToken}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #78350f 0%, #92400e 55%, #b45309 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 24px; background-color: #ffffff; border-radius: 12px; margin-top: 16px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08); }
              .cta { display: inline-block; margin-top: 18px; padding: 12px 18px; background: #b45309; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; }
              .footer { text-align: center; padding: 18px; color: #666; font-size: 12px; }
              .warning { background: #fef3c7; border-left: 4px solid #b45309; padding: 12px; margin: 15px 0; border-radius: 3px; color: #92400e; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Recuperar Contraseña</h1>
              </div>

              <div class="content">
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p>Si has solicitado este cambio, haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
                <a class="cta" href="${resetUrl}">Restablecer Contraseña</a>
                <div class="warning">
                  <p><strong>Importante:</strong> Este enlace expirará en 1 hora por seguridad. Si no has solicitado restablecer tu contraseña, ignora este email.</p>
                </div>
              </div>

              <div class="footer">
                <p>Este es un email automático. Por favor no respondas a este correo.</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.SITE_NAME || 'Mi Tienda'}. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Recuperar Contraseña',
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error(`Error sending password reset email: ${error.message}`);
    }
  }

  /**
   * Verificar que el transporter está correctamente configurado
   */
  async verifyTransporter() {
    try {
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Email transporter verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
