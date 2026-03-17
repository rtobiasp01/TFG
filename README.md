# TFG Ruben 2026

Guia paso a paso para instalar, configurar y arrancar el proyecto completo (API + WEB + MongoDB).

## 1. Requisitos previos

Instala lo siguiente en tu equipo:

1. Node.js 22 LTS (incluye npm).
2. Docker Desktop (opcional, pero recomendado para MongoDB y arranque rapido).
3. Git (opcional, para clonar/actualizar proyecto).

Comprobacion rapida en PowerShell:

```powershell
node -v
npm -v
docker -v
```

## 2. Estructura del proyecto

- `API`: backend Express + MongoDB.
- `WEB`: frontend Angular.

## 3. Configuracion de variables de entorno (API)

En la carpeta `API`, crea un archivo `.env` con este contenido:

```env
PORT=3000
MONGO_URI=mongodb://admin:admin1234@localhost:27017
DATABASE_NAME=mydatabase
JWT_SECRET=pon_aqui_un_secreto_largo_y_unico
```

Notas:

1. `JWT_SECRET` es obligatorio para login/register.
2. Si usas Mongo en Docker con otro host, cambia `MONGO_URI`.

## 4. Arranque en local (recomendado para desarrollo)

Abre 3 terminales (PowerShell), una por servicio.

### Terminal 1 - MongoDB

Si tienes MongoDB local instalado como servicio, asegurate de que este iniciado.

Si no, puedes levantar solo Mongo con Docker:

```powershell
docker rm -f tfg-mongo 2>$null
docker run -d --name tfg-mongo -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=admin1234 -p 27017:27017 mongo:7
```

### Terminal 2 - API (Express)

```powershell
cd API
npm install
npm install mongodb
npm install multer
npm install cors
npm start
```

La API quedara en:

- `http://localhost:3000`

### Terminal 3 - WEB (Angular)

```powershell
cd WEB
npm install --legacy-peer-deps
npm install -g @angular/cli
ng serve
```

El frontend quedara en:

- `http://localhost:4200`

## 5. Arranque rapido con Docker (sin Dockerfile)

Este comando levanta MongoDB + API + WEB en contenedores, montando tu codigo local.

```powershell
docker network create tfg-net 2>$null; docker rm -f tfg-mongo tfg-api tfg-web 2>$null; docker run -d --name tfg-mongo --network tfg-net -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=admin1234 -p 27017:27017 mongo:7; docker run -d --name tfg-api --network tfg-net -w /app -v "C:\Users\guill\Desktop\TFG_Ruben_2026\API:/app" -e MONGO_URI="mongodb://admin:admin1234@tfg-mongo:27017" -e DATABASE_NAME=mydatabase -e JWT_SECRET="pon_aqui_un_secreto_largo_y_unico" -p 3000:3000 node:22-bookworm sh -c "npm install && npm install mongodb && npm start"; docker run -d --name tfg-web --network tfg-net -w /app -v "C:\Users\guill\Desktop\TFG_Ruben_2026\WEB:/app" -p 4200:4200 node:22-bookworm sh -c "npm install && npx ng serve --host 0.0.0.0 --port 4200"
```

Parar todo:

```powershell
docker rm -f tfg-web tfg-api tfg-mongo
```

## 6. Pruebas basicas

### API

Puedes usar los archivos HTTP de la carpeta `API`:

- `prueba_user.http`
- `prueba_product.http`
- `prueba_attribute.http`

### WEB

Abre `http://localhost:4200` y comprueba:

1. Lista de productos.
2. Alta/edicion de productos.
3. Subida de imagenes.

## 7. Problemas comunes

### Error de CORS en navegador

Actualmente el backend no incluye middleware CORS. Si el navegador bloquea peticiones desde `4200` a `3000`, instala y habilita CORS en `API`:

```powershell
cd API
npm install cors
```

Y en `API/app.js`, agrega:

```js
var cors = require("cors");
app.use(cors());
```

### Puerto ocupado

Si `3000`, `4200` o `27017` estan en uso, libera esos puertos o cambia la configuracion:

1. API: variable `PORT` en `.env`.
2. WEB: parametro `--port` en `ng serve`.
3. Mongo: mapeo `-p` en `docker run`.

### Login falla con error de token

Revisa que `JWT_SECRET` exista y no este vacio en `.env` o en variables del contenedor.

## 8. Comandos utiles

### Ver logs Docker

```powershell
docker logs -f tfg-mongo
docker logs -f tfg-api
docker logs -f tfg-web
```

### Reiniciar API local

```powershell
cd API
npm start
```

### Reiniciar WEB local

```powershell
cd WEB
npx ng serve --host 0.0.0.0 --port 4200
```
