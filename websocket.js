const socketIO = require('socket.io');
const authenticateSocketToken = require('./middlewares/authenticateSocketToken');
let io; // Declare io at the top level

function initiateWebSocket(server) {
    io = socketIO(server, { // Remove const to use the top-level io variable
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ["GET", "POST"],
            allowedHeaders: ["authorization"],
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const isHandshake = socket.handshake.query.sid === undefined;
        if (isHandshake) {
            authenticateSocketToken(socket, next);
        } else {
            next();
        }
    });

    io.on('connection', (socket) => {
        const user = socket.request.user;
        const restaurantId = user.restaurant;
        if (restaurantId) {
            socket.join(`restaurant:${restaurantId}`);
        } else {
            socket.disconnect();
        }
    });

    return io;
}

function sendNewOrderToRestaurantSocket(order, restaurantId) {
    if (io) {
        io.to(`restaurant:${restaurantId}`).emit('new-order', order);
    } else {
        console.error('Socket.IO is not initialized.');
    }
}

module.exports = { initiateWebSocket, sendNewOrderToRestaurantSocket };