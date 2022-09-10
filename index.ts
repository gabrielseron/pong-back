import express from "express"
import cors from "cors";
import http from "http"

import { config } from "dotenv";
import { Server } from "socket.io";

var ip = require("ip");

config();

const app = express();
app.use(cors);
const port = process.env.PORT || 5050


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

server.listen(port, () => {
    console.log(`Server started on http://${ip.address()}:${port}`);
});

let roomsList = [];
let connectedUsers = [];

function game(roomName: string, users: any[]) {
    const board = {
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100
    }
    let ball = {
        x: 50,
        y: 50,
        dirX: Math.floor(Math.random())%2 === 0 ? -1 : 1,
        dirY: Math.floor(Math.random())%2 === 0 ? -1 : 1,
    }
    const p1Id = users[0].id
    const p1Socket = io.sockets.sockets.get(p1Id)
    let p1Paddle = {
        size: 20,
        y: 50
    }
    const p2Id = users[1].id
    const p2Socket = io.sockets.sockets.get(p2Id)
    let p2Paddle = {
        size: 20,
        y: 50
    }

    console.log(p1Id);
    console.log(p2Id);
    console.log(users);
    console.log(roomName);

    p1Socket.on('movePaddleUp', () => {
        console.log('paddle 1 up');

        if (p1Paddle.y-- < 0) {
            p1Paddle.y = 0
        } else {
            p1Paddle.y--
        }
    })

    p2Socket.on('movePaddleUp', () => {
        console.log('paddle 2 up');

        if (p2Paddle.y-- < 0) {
            p2Paddle.y = 0
        } else {
            p2Paddle.y--
        }
    })

    p1Socket.on('movePaddleDown', () => {
        console.log('paddle 1 down');

        if (p1Paddle.y++ > 100) {
            p1Paddle.y = 100
        } else {
            p1Paddle.y++
        }
    })

    p2Socket.on('movePaddleDown', () => {
        console.log('paddle 2 down');

        if (p2Paddle.y++ > 100) {
            p2Paddle.y = 100
        } else {
            p2Paddle.y++
        }
    })

    var gameInterval = setInterval(() => {
        io.sockets.in(roomName).emit('game-update', {board, ball, p1Paddle, p2Paddle});
    }, 1)

    p1Socket.on('disconnect', () => {
        clearInterval(gameInterval)
    })

    p2Socket.on('disconnect', () => {
        clearInterval(gameInterval)
    })

}


// let nbOfConnexions = 0,
//     posXMax = 800,
//     posYMax = 600,
//     posX = posXMax/2,
//     posY = posYMax/2,
//     dirX = Math.floor(Math.random())%2 === 0 ? -1 : 1,
//     dirY = Math.floor(Math.random())%2 === 0 ? -1 : 1,
//     time = 15,
//     step = 5

// function pong() {
//     if (nbOfConnexions) {
//         let pong = false;
//         let corner = false;
//         posX = posX + dirX * step
//         posY = posY + dirY * step
//         if (
//             posX >= 0 && posX <= 25 && posY >= 0 && posY <= 25 ||
//             posX <= posXMax && posX >= posXMax-25 && posY >= 0 && posY <= 25 ||
//             posY <= posYMax && posY >= posYMax-25 && posX >= 0 && posX <= 25 ||
//             posY <= posYMax && posY >= posYMax-25 && posX <= posXMax && posX >= posXMax-10
//         ) {
//             corner = true
//         }

//         if (posX >= posXMax - 20 || posX <= 0) {
//             dirX = -dirX
//             pong = true;
//         }
//         if (posY >= posYMax - 20 || posY <= 0) {
//             dirY = -dirY
//         }
//         io.emit('move', {posX, posY, pong, corner})
//     }
// }

// function resetStats() {
//     posXMax = 800,
//     posYMax = 600,
//     posX = posXMax/2,
//     posY = posYMax/2,
//     dirX = Math.floor(Math.random())%2 === 0 ? -1 : 1,
//     dirY = Math.floor(Math.random())%2 === 0 ? -1 : 1,
//     time = 15,
//     step = 5
// }

function getActiveRooms(io: any) {
    const arr = Array.from(io.sockets.adapter.rooms);
    const filtered = arr.filter(room => !room[1].has(room[0]))
    const res = filtered.map(i => i[0]);
    return res;
}

function filterRooms(rooms: any) {
    const filtered = Array.from(rooms).filter(room => !room[1].has(room[0]))
    const res = filtered.map(i => i[0]);
    return res;
}

function createRoom(socket: any, roomName: string, userName: string) {
    let existingRoom = false;
    roomsList.forEach(room => {
        if (room.name === roomName) {
            existingRoom = true;
            socket.emit('invalid-room-name');
        }
    });

    if (!existingRoom) {
        roomsList.push({
            name: roomName,
            users: [{id: socket.id, name: userName}]
        });
        connectedUsers.push(socket.id)

        socket.join(roomName);
        console.log(`User ${userName} joined the room ${roomName}`);

        socket.emit('room-created', {roomName})
    }
}

function joinRoom(socket: any, roomName: string, userName: string) {

    let existingRoom: any;
    roomsList.forEach(async (room) => {
        if (room.name === roomName) {
            existingRoom = room;
            console.log(existingRoom, 'selected');
            if (existingRoom.users.length === 2)
                socket.emit('full-room')
            else {
                room.users.push({id: socket.id, name: userName})
                connectedUsers.push(socket.id)

                socket.join(roomName);
                console.log(`User ${userName} joined the room ${roomName}`);

                socket.emit('room-joined', {roomName, users: room.users});
                socket.to(roomName).emit('room-joined', {roomName, users: room.users});
                game(roomName, room.users);
            }

        }
    });
    if (!existingRoom)
        socket.emit('invalid-room-name')
}

 function disconnectFromRoom(socket) {
    const rooms = filterRooms(socket.rooms);

    rooms.forEach(roomName => {
        roomsList.forEach((room, index) => {
            if (room.name === roomName) {
                room.users.forEach((user, index) => {
                    if (user.id === socket.id) {
                        room.users.splice(index, 1);
                    }
                });
            }
            console.log('room: ', room,);
            console.log('roomsList: ', roomsList);
            console.log('index: ', index);
            if (room.users.length === 0) {
                roomsList.splice(index, 1);
            }
        });
    });

    connectedUsers.forEach((userId, index) => {
        if (userId === socket.id)
            connectedUsers.splice(index, 1);
    });

}


io.on("connection",  (socket) => {
    // console.log('hello ' + socket.id);
    // if (nbOfConnexions = 1) {
    //     resetStats()
    // }
    // io.emit('move', {posX, posY})
    // let ballMovement = setInterval(pong, time)

    // Get Rooms
    socket.on('getRooms', () => {
        socket.emit('getRooms', getActiveRooms(io))
    });

    //Create Room
    socket.on('createRoom', (roomName, userName) => {
        createRoom(socket, roomName, userName);
        console.log('room created');
    })

    //Join Room
    socket.on('joinRoom', (roomName, userName) => {
        joinRoom(socket, roomName, userName)
    })

    socket.on("disconnect",  () => {

        //disconnectFromRoom
        if (connectedUsers.includes(socket.id)) {
            disconnectFromRoom(socket);
        }

        console.log(roomsList);

        // nbOfConnexions--
    });
});
