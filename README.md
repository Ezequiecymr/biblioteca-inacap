# Sistema de Biblioteca INACAP

Proyecto web de gestión de biblioteca con interfaz HTML/CSS/JavaScript, API en PHP y base de datos MySQL.

## Requisitos

- WampServer (Apache, PHP y MySQL)
- Un navegador web

## Instalación local

1. Copia la carpeta `biblioteca` dentro de `C:\wamp64\www\`.
2. Inicia Apache y MySQL desde WampServer.
3. Abre phpMyAdmin y ejecuta el archivo `codigobbd.sql` para crear la base de datos y cargar los datos de demostración.
4. Visita `http://localhost/biblioteca/`.

La API está configurada para desarrollo local con MySQL en `localhost`, usuario `root` y contraseña vacía. Si tu instalación usa otros datos, actualiza la conexión en `api.php`.

## Base de datos

El esquema y los registros de demostración están en [`codigobbd.sql`](codigobbd.sql). Los datos de personas y contraseñas incluidos son ficticios y sólo para pruebas.

## Importante

Este repositorio comparte el código y el SQL; GitHub no ejecuta PHP ni aloja MySQL. Para usar la aplicación en Internet hace falta contratar/configurar un hosting compatible con PHP y MySQL, y cambiar las credenciales de base de datos por unas seguras.
