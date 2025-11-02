const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

// Store server info
const PID_FILE = path.join(__dirname, '.server-pid');
const PORT_FILE = path.join(__dirname, '.server-port');

// Find first available port starting from basePort
async function findAvailablePort(basePort = 3000) {
    for (let port = basePort; port < basePort + 100; port++) {
        try {
            const server = net.createServer();
            await new Promise((resolve, reject) => {
                server.once('error', reject);
                server.once('listening', () => {
                    server.close();
                    resolve(port);
                });
                server.listen(port);
            });
            return port;
        } catch (err) {
            if (err.code !== 'EADDRINUSE') throw err;
            // Port in use, try next one
            continue;
        }
    }
    throw new Error('No available ports found in range');
}

// Save process info for stop/restart
function saveProcessInfo(port, pid) {
    fs.writeFileSync(PORT_FILE, port.toString());
    fs.writeFileSync(PID_FILE, pid.toString());
}

// Clean up process info files
function cleanProcessInfo() {
    try {
        fs.unlinkSync(PORT_FILE);
        fs.unlinkSync(PID_FILE);
    } catch (err) {
        // Files may not exist, that's fine
    }
}

// Get running server info
function getServerInfo() {
    try {
        const port = parseInt(fs.readFileSync(PORT_FILE, 'utf8'));
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
        return { port, pid };
    } catch (err) {
        return null;
    }
}

// Stop running server if any
async function stopServer() {
    const info = getServerInfo();
    if (!info) {
        console.log('No server running');
        return;
    }

    try {
        process.kill(info.pid);
        console.log(`Stopped server (PID ${info.pid})`);
    } catch (err) {
        if (err.code === 'ESRCH') {
            console.log('Server process not found (may have been stopped)');
        } else {
            throw err;
        }
    }
    
    cleanProcessInfo();
}

// Start server on next available port
async function startServer() {
    const port = await findAvailablePort();
    console.log(`Starting server on port ${port}...`);
    
    const server = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: port.toString() },
        stdio: 'inherit'
    });

    // Save info for stop/restart
    saveProcessInfo(port, server.pid);
    
    server.on('error', (err) => {
        console.error('Server error:', err);
        cleanProcessInfo();
    });

    server.on('exit', (code) => {
        if (code !== null) {
            console.log(`Server exited with code ${code}`);
            cleanProcessInfo();
        }
    });

    // Handle ctrl+c and process termination
    process.on('SIGINT', () => {
        console.log('\nGracefully shutting down...');
        server.kill();
        cleanProcessInfo();
        process.exit();
    });

    process.on('exit', () => {
        server.kill();
        cleanProcessInfo();
    });
}

// Handle command line args
async function main() {
    const cmd = process.argv[2] || 'start';
    
    switch (cmd) {
        case 'start':
            await startServer();
            break;
        
        case 'stop':
            await stopServer();
            break;
        
        case 'restart':
            await stopServer();
            await startServer();
            break;
        
        default:
            console.error('Unknown command. Use: start, stop, or restart');
            process.exit(1);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});