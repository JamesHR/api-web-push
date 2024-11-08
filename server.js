const express = require('express');
const bodyParser = require('body-parser');
const webPush = require('web-push');
const cors = require('cors');
require('dotenv').config();



const app = express();
const port = 3000;

app.use(cors());

// Claves VAPID generadas con el comando anterior
// const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
// const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};


// Configura web-push con las claves VAPID
webPush.setVapidDetails(
  'mailto:tu-email@ejemplo.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Middleware para procesar JSON
app.use(bodyParser.json());

// Ruta para suscripciones
const subscriptions = []; // Almacén simple para suscripciones (para pruebas)

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({});
  console.log('Nueva suscripción almacenada:', subscription);
});

// Ruta para enviar notificaciones push
app.post('/sendNotification', (req, res) => {

    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'El mensaje es requerido.' });
    }

    const notificationPayload = {
        notification: {
        title: '¡Tienes una nueva notificación!',
        body: message,
        icon: 'cat_bored.jpg',
        data: {
            url: 'https://tusitio.com'
        }
        }
    };

    const promises = subscriptions.map((subscription, index) =>
        webPush.sendNotification(subscription, JSON.stringify(notificationPayload))
          .catch(err => {
            if (err.statusCode === 410 || err.response.headers['x-wns-status'] === 'revoked') {
              console.log('Suscripción revocada, eliminando de la lista:', subscription.endpoint);
              subscriptions.splice(index, 1); // Eliminar la suscripción revocada
            }
            return Promise.resolve(); // Ignorar el error y continuar con las demás suscripciones
          })
    );

    Promise.all(promises)
        .then(() => res.status(200).json({ message: 'Notificación enviada.' }))
        .catch(err => {
        console.error("Error al enviar notificación:", err);
        res.sendStatus(500);
        });
});

app.listen(port, () => {
  console.log(`Servidor de notificaciones push escuchando en http://localhost:${port}`);
});
