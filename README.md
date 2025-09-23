# Kanban Project

This project is a **Kanban board** developed using **pure JavaScript, HTML, and CSS**, without any external frameworks.

The goal is to build a **lightweight and modular application** that allows you to:

- Create, edit, and delete boards.
- Create, edit, and delete cards within each board.
- Mark cards as completed.
- Assign and display priorities with different colors and styles.

The application is **powered by a backend** already deployed at:  
[https://tasksapi.mathiaslopez.tech/docs](https://tasksapi.mathiaslopez.tech/docs)

The source code of the backend can be found here:  
[https://github.com/MathiasLopez/todo-devops-lab](https://github.com/MathiasLopez/todo-devops-lab)


## Running in HTTPS (development mode)

To serve the project over https locally using [`http-server`](https://www.npmjs.com/package/http-server), you need self-signed SSL certificates.

### 1. Create a certificates folder
In the root of the project, create a folder to store them:
```
mkdir certs
```

### 2. Generate self-signed certificates
Use openssl to generate a certificate and a private key valid for 1 year:
```
cd certs
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
cd ..
```
During the process, you’ll be asked for some details (most can be left blank).
The important one is Common Name (CN) — set it to the domain you’ll be using, for example using my own domain:
```
Common Name (CN): kanban.mathiaslopez.tech
```

### 3. Run the HTTPS server
From inside the src folder, run:
```
http-server . -p 5500 -a kanban.mathiaslopez.tech --ssl --cert ../certs/cert.pem --key ../certs/key.pem
```
### 4. Access
Open in browser:
```
https://kanban.mathiaslopez.tech:5500
```
⚠️ Since this is a self-signed certificate, your browser will show a security warning.
This is expected in development and does not affect testing.
