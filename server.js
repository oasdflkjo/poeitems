const express = require('express');
const path = require('path');
const app = express();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Only listen on localhost
const HOST = 'localhost';
const PORT = 3001;

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down server...');
    process.exit();
});

// Create server and handle errors
const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
    console.log('Only accepting connections from localhost for security');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
}); 