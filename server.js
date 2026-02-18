const express = require('express');
const { Worker } = require('worker_threads');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// State management
let cpuWorkers = [];
let memoryBuffers = [];
let totalMemoryMB = 0;
let startTime = null;

// CPU Worker code
const cpuWorkerCode = `
const { parentPort } = require('worker_threads');

function burnCPU() {
    while (true) {
        // Intensive computation
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += Math.sqrt(i) * Math.random();
        }
    }
}

burnCPU();
`;

// API Endpoints

// Get current status
app.get('/api/status', (req, res) => {
    const uptime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    res.json({
        cpuBurners: cpuWorkers.length,
        memoryMB: totalMemoryMB,
        bufferCount: memoryBuffers.length,
        uptime: uptime,
        processMemory: process.memoryUsage()
    });
});

// Set CPU burners
app.post('/api/cpu', (req, res) => {
    const { burners } = req.body;
    
    if (typeof burners !== 'number' || burners < 0 || burners > 8) {
        return res.status(400).json({ error: 'Invalid burners count (0-8)' });
    }

    if (!startTime) startTime = Date.now();

    const currentBurners = cpuWorkers.length;
    
    if (burners > currentBurners) {
        // Add more burners
        const toAdd = burners - currentBurners;
        for (let i = 0; i < toAdd; i++) {
            try {
                const worker = new Worker(cpuWorkerCode, { eval: true });
                cpuWorkers.push(worker);
                console.log(`Started CPU burner ${cpuWorkers.length}`);
            } catch (error) {
                console.error('Failed to start CPU burner:', error);
                return res.status(500).json({ error: 'Failed to start CPU burner' });
            }
        }
    } else if (burners < currentBurners) {
        // Remove burners
        const toRemove = currentBurners - burners;
        for (let i = 0; i < toRemove; i++) {
            const worker = cpuWorkers.pop();
            if (worker) {
                worker.terminate();
                console.log(`Stopped CPU burner ${currentBurners - i}`);
            }
        }
    }

    res.json({
        success: true,
        cpuBurners: cpuWorkers.length
    });
});

// Set memory allocation
app.post('/api/memory', (req, res) => {
    const { memoryMB } = req.body;
    
    if (typeof memoryMB !== 'number' || memoryMB < 0) {
        return res.status(400).json({ error: 'Invalid memory size' });
    }

    if (!startTime) startTime = Date.now();

    try {
        const currentMemoryMB = totalMemoryMB;
        
        if (memoryMB > currentMemoryMB) {
            // Allocate more memory
            const toAllocate = memoryMB - currentMemoryMB;
            console.log(`Allocating ${toAllocate} MB...`);
            
            // Allocate in chunks to ensure it's actually used
            const chunkSize = 100; // MB per buffer
            const chunks = Math.ceil(toAllocate / chunkSize);
            
            for (let i = 0; i < chunks; i++) {
                const size = Math.min(chunkSize, toAllocate - (i * chunkSize));
                const bufferSize = size * 1024 * 1024; // Convert MB to bytes
                const buffer = Buffer.alloc(bufferSize);
                
                // Fill buffer to ensure memory is actually allocated
                for (let j = 0; j < bufferSize; j += 4096) {
                    buffer[j] = Math.floor(Math.random() * 256);
                }
                
                memoryBuffers.push(buffer);
                totalMemoryMB += size;
                console.log(`Allocated ${size} MB (Total: ${totalMemoryMB} MB)`);
            }
        } else if (memoryMB < currentMemoryMB) {
            // Release memory
            const toRelease = currentMemoryMB - memoryMB;
            console.log(`Releasing ${toRelease} MB...`);
            
            // Simple approach: clear all and reallocate
            memoryBuffers = [];
            totalMemoryMB = 0;
            
            if (memoryMB > 0) {
                const chunkSize = 100;
                const chunks = Math.ceil(memoryMB / chunkSize);
                
                for (let i = 0; i < chunks; i++) {
                    const size = Math.min(chunkSize, memoryMB - (i * chunkSize));
                    const bufferSize = size * 1024 * 1024;
                    const buffer = Buffer.alloc(bufferSize);
                    
                    for (let j = 0; j < bufferSize; j += 4096) {
                        buffer[j] = Math.floor(Math.random() * 256);
                    }
                    
                    memoryBuffers.push(buffer);
                    totalMemoryMB += size;
                }
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                console.log('Garbage collection triggered');
            }
        }

        res.json({
            success: true,
            memoryMB: totalMemoryMB,
            bufferCount: memoryBuffers.length,
            processMemory: process.memoryUsage()
        });
    } catch (error) {
        console.error('Memory allocation error:', error);
        res.status(500).json({ 
            error: 'Memory allocation failed',
            message: error.message 
        });
    }
});

// Stop all and release everything
app.post('/api/stop', (req, res) => {
    console.log('Stopping all burners and releasing memory...');
    
    // Stop CPU burners
    cpuWorkers.forEach(worker => worker.terminate());
    cpuWorkers = [];
    
    // Release memory
    memoryBuffers = [];
    totalMemoryMB = 0;
    
    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }
    
    // Reset start time
    startTime = null;
    
    res.json({
        success: true,
        cpuBurners: 0,
        memoryMB: 0,
        message: 'All resources released'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    cpuWorkers.forEach(worker => worker.terminate());
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    cpuWorkers.forEach(worker => worker.terminate());
    process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`HTMLMemoryCPUBurner Server`);
    console.log(`Running on port ${PORT}`);
    console.log(`Process ID: ${process.pid}`);
    console.log(`Node version: ${process.version}`);
    console.log(`========================================`);
    console.log(`Server ready for stress testing!`);
});
