const readline = require("readline");
const path = require("path");
const fs = require("fs");
// Load the native addon
const downloader_addon = loadNativeAddon();
// Load configuration
const config = require('./config');

const DEFAULT_BAUDRATE = 921600;
const BOARD_INFO_FIXED_HEADER = 0x42494648;
const BOARD_INFO_SIZE = 44;
const BOARD_INFO_VERSION = 0x01000000;

// Configuration variables
let FIRMWARE_DIR = path.join(__dirname, "firmware");
let FIRMWARE_FILE = {};

/******************************************************************************************* */
/****Configuration************************************************************************** */
/******************************************************************************************* */

const BOARD_INFO_CONFIG = {
    // MCP1
    'mcp1': {
        commu_id: 1,
        driver_id: 1,
        motor_id: 1,   // k-13-16
        motor_winding_type: 1,    // 三角形
        motor_phase_resistance: 4.125,          // 2.75 * 3 / 2  三角形计算方式
        motor_phase_inductance: 0.00018,        // 0.000120 * 3 / 2
        gear_ratio: 107.52
    },
    // MCP2
    'mcp2': {
        commu_id: 2,
        driver_id: 2,
        motor_id: 2,  // k-13-06
        motor_winding_type: 0,    // Y形
        motor_phase_resistance: 1.775,          // 3.55/2
        motor_phase_inductance: 0.000075,       // 0.000125/2
        gear_ratio: 74.88
    },
    // PIP
    'pip': {
        commu_id: 3,
        driver_id: 2,
        motor_id: 2,  // k-13-06
        motor_winding_type: 0,    // Y形
        motor_phase_resistance: 1.775,          // 3.55/2
        motor_phase_inductance: 0.000075,       // 0.000125/2
        gear_ratio: 107.52
    },
    // DIP
    'dip': {
        commu_id: 4,
        driver_id: 2,
        motor_id: 2,  // k-13-06
        motor_winding_type: 0,    // Y形
        motor_phase_resistance: 1.775,          // 3.55/2
        motor_phase_inductance: 0.000075,       // 0.000125/2
        gear_ratio: 107.52
    },
    // CMC1
    'cmc1': {
        commu_id: 1,
        driver_id: 1,
        motor_id: 3,  // k-13-10
        motor_winding_type: 0,    // Y形
        motor_phase_resistance: 2.425,          // 4.85/2
        motor_phase_inductance: 0.0001075,      // 0.000215/2
        gear_ratio: 107.52
    },
    // CMC2
    'cmc2': {
        commu_id: 2,
        driver_id: 2,
        motor_id: 3,  // k-13-10
        motor_winding_type: 0,    // Y形
        motor_phase_resistance: 2.425,          // 4.85/2
        motor_phase_inductance: 0.0001075,       // 0.000215/2
        gear_ratio: 107.52
    }
};

// Board Info 结构体定义（JavaScript对象格式）
const BOARD_INFO_STRUCTURE = {
    fixed_header: BOARD_INFO_FIXED_HEADER,      // 固定头部
    size: BOARD_INFO_SIZE,                      // 总大小（11个字段 * 4字节）
    version: BOARD_INFO_VERSION,               // 版本号
    commu_id: 0,               // 通信ID
    driver_id: 0,               // 驱动器ID
    motor_id: 0,                // 电机ID
    motor_winding_type: 0,      // 电机绕组类型
    motor_phase_resistance: 0.0,   // 电机相电阻
    motor_phase_inductance: 0.0, // 电机相电感
    gear_ratio: 0.0,            // 齿轮比
    crc32: 0              // CRC32校验值
};

function makeBoardInfoBuffer(obj) {
    const buf = Buffer.alloc(BOARD_INFO_SIZE);
    buf.writeUInt32LE(BOARD_INFO_FIXED_HEADER, 0);
    buf.writeUInt32LE(BOARD_INFO_SIZE, 4);
    buf.writeUInt32LE(BOARD_INFO_VERSION, 8);
    buf.writeUInt32LE(obj.commu_id, 12);
    buf.writeUInt32LE(obj.driver_id, 16);
    buf.writeUInt32LE(obj.motor_id, 20);
    buf.writeUInt32LE(obj.motor_winding_type, 24);
    buf.writeFloatLE(obj.motor_phase_resistance, 28);
    buf.writeFloatLE(obj.motor_phase_inductance, 32);
    buf.writeFloatLE(obj.gear_ratio, 36);
    buf.writeUInt32LE(0, 40);
    return buf;
}

/******************************************************************************************* */
/****End of Configuration******************************************************************* */
/******************************************************************************************* */

// Auto-detect and load native addon
function loadNativeAddon() {
    const resourceDir = path.join(__dirname, "resource");
    const addonPattern = /^downloader_addon_linux_.*\.node$/;
    
    try {
        // Check if resource directory exists
        if (!fs.existsSync(resourceDir)) {
            throw new Error(`Resource directory not found: ${resourceDir}`);
        }
        
        // Search for matching .node files
        const files = fs.readdirSync(resourceDir);
        const addonFiles = files.filter(file => addonPattern.test(file));
        
        if (addonFiles.length === 0) {
            throw new Error(`No native addon found in ${resourceDir}. Expected pattern: downloader_addon_linux_*.node`);
        }
        
        if (addonFiles.length > 1) {
            throw new Error(`Multiple native addons found in ${resourceDir}. Only one is allowed:\n${addonFiles.join('\n')}`);
        }
        
        // Load the single found addon
        const addonPath = path.join(resourceDir, addonFiles[0]);
        console.log(`Loading native addon: ${addonFiles[0]}`);
        
        return require(addonPath);
        
    } catch (error) {
        console.error("Failed to load native addon:", error.message);
        console.error("Please ensure:");
        console.error("1. Resource directory exists: ./resource/");
        console.error("2. Contains exactly one file matching: downloader_addon_linux_*.node");
        console.error("3. File has correct permissions");
        process.exit(1);
    }
}

// Get available commands based on current mode
function getAvailableCommands() {
    if (config.mode === 'release') {
        return config.releaseCommands;
    }
    return [...config.releaseCommands, ...config.internalCommands];
}

// Check if a command is available in current mode
function isCommandAvailable(command) {
    const availableCommands = getAvailableCommands();
    return availableCommands.includes(command);
}

// Load firmware configuration from JavaScript module
function loadFirmwareConfig() {
    try {
        const configPath = path.join(__dirname, "firmware_config.js");
        if (!fs.existsSync(configPath)) {
            console.log("Warning: firmware_config.js not found, using default configuration!");
            return false;
        }
        
        const config = require(configPath);
        
        // Update global variables
        if (config.firmware_dir) {
            FIRMWARE_DIR = path.resolve(__dirname, config.firmware_dir);
        }
        
        // Build firmware file mapping
        FIRMWARE_FILE = {};
        
        // Add spinal board firmware
        if (config.spinal_board) {
            Object.assign(FIRMWARE_FILE, config.spinal_board);
        }
        
        // Add CMC firmware
        if (config.cmc) {
            Object.assign(FIRMWARE_FILE, config.cmc);
        }
        
        // Add MCP firmware
        if (config.mcp) {
            Object.assign(FIRMWARE_FILE, config.mcp);
        }
        
        // Add PIP firmware
        if (config.pip) {
            Object.assign(FIRMWARE_FILE, config.pip);
        }
        
        // Add DIP firmware
        if (config.dip) {
            Object.assign(FIRMWARE_FILE, config.dip);
        }
        
        // Add joint board firmware
        if (config.joint_board) {
            Object.assign(FIRMWARE_FILE, config.joint_board);
        }
        
        console.log("Firmware configuration loaded successfully");
        return true;
        
    } catch (error) {
        console.log("Error loading firmware configuration:", error.message);
        console.log("Using default configuration");
        return false;
    }
}

// Service and interface initialization
const service = new downloader_addon.async_service();
const shell = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Utility functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function safeExecute(fn, errorMessage = "Operation failed") {
    try {
        return fn();
    } catch (error) {
        console.error(`${errorMessage}: ${error.message}`);
        return null;
    }
}

function generateProgressBar(progress, width = 30) {
    const safeProgress = Math.max(0, Math.min(1, progress));
    const filled = Math.round(width * safeProgress);
    const empty = width - filled;
    return `[${'='.repeat(filled)}${' '.repeat(empty)}] ${(safeProgress * 100).toFixed(1)}%`;
}

// Get firmware path by device ID
function getFirmwarePath(id) {
    for (const [key, filename] of Object.entries(FIRMWARE_FILE)) {
        let matched = false;

        if (key.includes(",")) {
            const ids = key.split(",").map((x) => parseInt(x, 16));
            matched = ids.includes(id);
        } else if (key.includes("-")) {
            const [start, end] = key.split("-").map((x) => parseInt(x, 16));
            matched = id >= start && id <= end;
        } else {
            matched = id === parseInt(key, 16);
        }

        if (matched) {
            return path.join(FIRMWARE_DIR, filename);
        }
    }
    return null;
}

// Parse device IDs from command parameter
function parseDeviceIds(param) {
    const ids = new Set();
    
    // Handle special "all" parameter
    if (param.toLowerCase() === 'all') {
        // Add A0 (spinal board)
        ids.add(0xA0);
        
        // Add CMC1, CMC2 (11-14)
        for (let i = 0x11; i <= 0x14; i++) {
            ids.add(i);
        }
        
        // Add MCP1, MCP2, PIP, DIP groups (21-24, 31-34, 41-44, 51-54)
        for (let base = 0x20; base <= 0x50; base += 0x10) {
            for (let offset = 0x01; offset <= 0x04; offset++) {
                ids.add(base + offset);
            }
        }
        
        return Array.from(ids).sort((a, b) => a - b);
    }
    
    const parts = param.split(',');

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n, 16));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    ids.add(i);
                }
            }
        } else {
            const num = parseInt(part, 16);
            if (!isNaN(num)) {
                ids.add(num);
            }
        }
    }

    return Array.from(ids).sort((a, b) => a - b);
}

async function isDeviceConnected() {
    try {
        if (!service) return false;
        // Use is_online(0xA0) to check connection status
        return service.is_online(0xA0);
    } catch (error) {
        return false;
    }
}

// Function to print serial port list with device information
function printSerialPortList(serialPorts) {
    if (serialPorts.length === 0) {
        console.log("\n==============================================================\n");
        console.log("No serial port found!");
        console.log("\n==============================================================\n");
        return;
    }
    
    console.log("\n==============================================================\n");
    console.log(`Found ${serialPorts.length} serial port(s):\n`);
    
    serialPorts.forEach((port, index) => {
        try {
            // Try to get device information from sysfs
            let deviceInfo = "";
            
            // Check if it's a USB device
            if (port.startsWith('ttyUSB')) {
                try {
                    // For ttyUSB devices, try to read from /sys/class/tty/
                    const sysPath = `/sys/class/tty/${port}/device/`;
                    if (fs.existsSync(sysPath)) {
                        // Try to read vendor and product info
                        try {
                            const vendorPath = `${sysPath}../idVendor`;
                            const productPath = `${sysPath}../idProduct`;
                            
                            if (fs.existsSync(vendorPath) && fs.existsSync(productPath)) {
                                const vendor = fs.readFileSync(vendorPath, 'utf8').trim();
                                const product = fs.readFileSync(productPath, 'utf8').trim();
                                deviceInfo = `(USB: ${vendor}:${product})`;
                            }
                        } catch (e) {
                            // Fallback to device type
                            deviceInfo = "(USB Serial Device)";
                        }
                    }
                } catch (e) {
                    deviceInfo = "(USB Serial Device)";
                }
            } else if (port.startsWith('ttyACM')) {
                try {
                    // For ttyACM devices (CDC ACM), try to get more info
                    const sysPath = `/sys/class/tty/${port}/device/`;
                    if (fs.existsSync(sysPath)) {
                        try {
                            const vendorPath = `${sysPath}../idVendor`;
                            const productPath = `${sysPath}../idProduct`;
                            const manufacturerPath = `${sysPath}../manufacturer`;
                            const productNamePath = `${sysPath}../product`;
                            
                            if (fs.existsSync(vendorPath) && fs.existsSync(productPath)) {
                                const vendor = fs.readFileSync(vendorPath, 'utf8').trim();
                                const product = fs.readFileSync(productPath, 'utf8').trim();
                                
                                let manufacturer = "";
                                let productName = "";
                                
                                // Try to read manufacturer and product names
                                try {
                                    if (fs.existsSync(manufacturerPath)) {
                                        manufacturer = fs.readFileSync(manufacturerPath, 'utf8').trim();
                                    }
                                    if (fs.existsSync(productNamePath)) {
                                        productName = fs.readFileSync(productNamePath, 'utf8').trim();
                                    }
                                } catch (e) {
                                    // Ignore errors reading names
                                }
                                
                                if (manufacturer && productName) {
                                    deviceInfo = `(${manufacturer} ${productName})`;
                                } else if (manufacturer) {
                                    deviceInfo = `(${manufacturer})`;
                                } else {
                                    deviceInfo = `(CDC ACM: ${vendor}:${product})`;
                                }
                            }
                        } catch (e) {
                            deviceInfo = "(CDC ACM Device)";
                        }
                    }
                } catch (e) {
                    deviceInfo = "(CDC ACM Device)";
                }
            }
            
            // If no specific info found, use generic description
            if (!deviceInfo) {
                deviceInfo = port.startsWith('ttyUSB') ? "(USB Serial)" : "(CDC ACM)";
            }
            
            console.log(`  ${index + 1}. /dev/${port}\t${deviceInfo}`);
        } catch (err) {
            console.log(`  ${index + 1}. /dev/${port}\t(Unknown Device)`);
        }
    });
    
    console.log("\n==============================================================\n");
}

// Auto-connect function with periodic refresh
async function connectSerialPort() {
    let lastPortCount = 0;
    let refreshInterval;
    let portList = [];
    let userInput = null;
    
    try {
        // Start periodic refresh
        refreshInterval = setInterval(async () => {
            try {
                const devices = fs.readdirSync('/dev');
                const serialPorts = devices.filter(device =>
                    device.startsWith('ttyACM') ||
                    device.startsWith('ttyUSB')
                );

                // Only update display if port count changed
                if (serialPorts.length !== lastPortCount) {

                    lastPortCount = serialPorts.length;
                    portList = serialPorts;
                    
                    // Clear previous lines and show updated list
                    process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen
                    printSerialPortList(serialPorts);
                    if (serialPorts.length !== 0) {
                        console.log("Select a port [default: 1]:");
                    }
                    else {
                        console.log("Searching for avaliable serial ports...");
                    }
                    
                }

            } catch (err) {
                // Silent error handling for refresh
            }
        }, 200);

        // Wait for user input to stop refresh and select port
        userInput = await new Promise(resolve => {
            shell.question("", resolve);
        });

        // Stop refresh immediately when user inputs
        clearInterval(refreshInterval);
        
        if (portList.length === 0) {
            console.log("No serial port found. Please connect a device and restart.");
            return false;
        }

        // Parse user input for port selection
        let portIndex = 0; // Default to first port
        
        if (userInput.trim() !== "") {
            const inputNum = parseInt(userInput.trim());
            if (!isNaN(inputNum) && inputNum >= 1 && inputNum <= portList.length) {
                portIndex = inputNum - 1;
            } else {
                console.log(`Invalid selection. Using default port ${portIndex + 1}.`);
            }
        }

        // Get baudrate
        const baudrateAnswer = await new Promise(resolve => {
            shell.question(`Enter baudrate [default: ${DEFAULT_BAUDRATE}]: `, resolve);
        });

        const baudrate = baudrateAnswer ? parseInt(baudrateAnswer) : DEFAULT_BAUDRATE;
        if (isNaN(baudrate) || baudrate <= 0) {
            console.log("Invalid baudrate.");
            return false;
        }

        return { port: portList[portIndex], baudrate };
    } catch (err) {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        console.error("Error during serial port connection:", err.message);
        return false;
    }
}

// Device connection management
async function connectDevice() {
    const selection = await connectSerialPort();
    if (!selection) return false;
    
    console.log(`\nConnecting to /dev/${selection.port} at baudrate ${selection.baudrate} ...`);
    
    if (safeExecute(() => service.open_device(`/dev/${selection.port}`, selection.baudrate))) {
        return true;
    } else {
        return false;
    }
}

function disconnectDevice() {
    try {
        service.close_device();
        console.log("Device disconnected!");
    } catch (error) {
        console.log("Error during disconnection:", error.message);
    }
}

// Command handlers
const commandHandlers = {
    gi: (ids) => {
        ids.forEach(id => {
            const info = safeExecute(() => service.get_info(id), `Failed to get device ${id} info`);
            if (info) {
                console.log(`\nDevice 0x${id.toString(16).toUpperCase()} info:`);
                
                // Parse firmware version header (8 bytes format)
                if (info.fw_version && info.fw_version.length >= 2) {
                    // Convert first 32-bit integer to 4 bytes (little-endian: low byte first)
                    const version = info.fw_version[0];
                    const versionMajor = version & 0xFF;
                    const versionMinor = (version >> 8) & 0xFF;
                    const versionPatch = (version >> 16) & 0xFF;
                    const prereleaseAscii = (version >> 24) & 0xFF;
                    // Convert prerelease ASCII to character
                    const prereleaseChar = String.fromCharCode(prereleaseAscii);
                    // Convert second 32-bit integer to 4 bytes (little-endian: low byte first)
                    const date = info.fw_version[1];
                    const yearHigh = date & 0xFF;
                    const yearLow = (date >> 8) & 0xFF;
                    const year = (yearHigh << 8) | yearLow;
                    const month = (date >> 16) & 0xFF;
                    const day = (date >> 24) & 0xFF;
                    // Format version string
                    const versionString = `${versionMajor}.${versionMinor}.${versionPatch}-${prereleaseChar}`;
                    const buildDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    
                    console.log("Firmware Version:", versionString, " Date:", buildDate);
                } else {
                    // Fallback to original format if not enough bytes
                    console.log("Firmware Version:", info.fw_version.map(x => `0x${x.toString(16).padStart(8, '0').toUpperCase()}`).join(':'));
                }

                if (info.bldr_version !== undefined && info.bldr_version !== null) {
                    const bversionPrereleaseAscii = info.bldr_version & 0xFF;
                    const bversionPatch  = (info.bldr_version >> 8) & 0xFF;
                    const bversionMinor= (info.bldr_version >> 16) & 0xFF;
                    const bversionMajor = (info.bldr_version >> 24) & 0xFF;
                    const bversionPrereleaseChar = String.fromCharCode(bversionPrereleaseAscii);
                    const bversionString = `${bversionMajor}.${bversionMinor}.${bversionPatch}-${bversionPrereleaseChar}`;
                    console.log("Bootloader Version:", bversionString);
                } else {
                    console.log("Bootloader Version:", "N/A");
                }

                if (info.uid && Array.isArray(info.uid) && info.uid.length > 0) {
                    console.log("UID:", info.uid.map(x => `0x${x.toString(16).padStart(8, '0').toUpperCase()}`).join(':'));
                } else {
                    console.log("UID:", "N/A");
                }
                
                if (info.sys_time_ms !== undefined && info.sys_time_ms !== null) {
                    console.log("System Time:", Math.floor(info.sys_time_ms / 1000), "s");
                } else {
                    console.log("System Time:", "N/A");
                }
            }
        });
    },

    ge: (ids) => {
        ids.forEach(id => {
            const error_code = safeExecute(() => service.get_error_code(id), `Failed to get device ${id} error code`);
            if (error_code) {
                console.log(`\nDevice 0x${id.toString(16).toUpperCase()} error code:`);
                console.log("Error Code:", error_code.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`).join(', '));
            }
        });
    },

    jp: (ids) => {
        ids.forEach(id => {
            console.log(`Jumping to app for device 0x${id.toString(16).toUpperCase()}...`);
            service.async_jump_to_app(id, (response) => {
                console.log(`Device 0x${id.toString(16).toUpperCase()} jump result:`, {
                    func_error_code: `0x${response.func_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    func_info: response.func_info.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`),
                    sys_error_code: `0x${response.sys_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    sys_error_message: response.sys_error_message
                });
            });
        });
    },

    sb: (id, boardInfoKey) => {
        const config = BOARD_INFO_CONFIG[boardInfoKey.toLowerCase()];
        if (!config) {
            console.log(`No board_info config for key '${boardInfoKey}'`);
            return;
        }
        
        const buf = makeBoardInfoBuffer(config);
        console.log(`Setting board info for device 0x${id.toString(16).toUpperCase()} (${boardInfoKey})...`);
        service.async_set_board_info(id, buf, (response) => {
            console.log(`Device 0x${id.toString(16).toUpperCase()} set board info result:`, {
                func_error_code: `0x${response.func_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                func_info: response.func_info.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`),
                sys_error_code: `0x${response.sys_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                sys_error_message: response.sys_error_message
            });
        });
    },

    rb: (ids) => {
        ids.forEach(id => {
            console.log(`Rebooting device 0x${id.toString(16).toUpperCase()}...`);
            service.async_reboot(id, (response) => {
                console.log(`Device 0x${id.toString(16).toUpperCase()} reboot result:`, {
                    func_error_code: `0x${response.func_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    func_info: response.func_info.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`),
                    sys_error_code: `0x${response.sys_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    sys_error_message: response.sys_error_message
                });
            });
        });
    }
};


// Flash protection commands
const flashProtectionHandlers = {
    swrp_binfo: (ids) => {
        ids.forEach(id => {
            console.log(`Setting flash write protection-board info for device 0x${id.toString(16).toUpperCase()}...`);
            service.async_set_flash_protection_board_info(id, (response) => {
                console.log(`Device 0x${id.toString(16).toUpperCase()} set flash write protection-board info result:`, {
                    func_error_code: `0x${response.func_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    func_info: response.func_info.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`),
                    sys_error_code: `0x${response.sys_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    sys_error_message: response.sys_error_message
                });
            });
        });
    },

    rswrp_binfo: (ids) => {
        ids.forEach(id => {
            console.log(`Resetting flash write protection-board info for device 0x${id.toString(16).toUpperCase()}...`);
            service.async_reset_flash_protection_board_info(id, (response) => {
                console.log(`Device 0x${id.toString(16).toUpperCase()} reset flash write protection-board info result:`, {
                    func_error_code: `0x${response.func_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    func_info: response.func_info.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`),
                    sys_error_code: `0x${response.sys_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    sys_error_message: response.sys_error_message
                });
            });
        });
    },

    swrp_bldr: (ids) => {
        ids.forEach(id => {
            console.log(`Setting flash write protection-bldr for device 0x${id.toString(16).toUpperCase()}...`);
            service.async_set_flash_protection_bldr(id, (response) => {
                console.log(`Device 0x${id.toString(16).toUpperCase()} set flash write protection-bldr result:`, {
                    func_error_code: `0x${response.func_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    func_info: response.func_info.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`),
                    sys_error_code: `0x${response.sys_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    sys_error_message: response.sys_error_message
                });
            });
        });
    },

    rswrp_bldr: (ids) => {
        ids.forEach(id => {
            console.log(`Resetting flash write protection-bldr for device 0x${id.toString(16).toUpperCase()}...`);
            service.async_reset_flash_protection_bldr(id, (response) => {
                console.log(`Device 0x${id.toString(16).toUpperCase()} reset flash write protection-bldr result:`, {
                    func_error_code: `0x${response.func_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    func_info: response.func_info.map(x => `0x${x.toString(16).padStart(4, '0').toUpperCase()}`),
                    sys_error_code: `0x${response.sys_error_code.toString(16).padStart(4, '0').toUpperCase()}`,
                    sys_error_message: response.sys_error_message
                });
            });
        });
    }
};

// Configuration commands
const configHandlers = {
    at: (ms) => {
        if (isNaN(ms) || ms <= 0) {
            console.log("Invalid milliseconds value");
            return;
        }
        service.set_auto_request_info_cycle_ms(ms);
        console.log(`Auto request info cycle set to ${ms} ms`);
    },

    tg: (ratio) => {
        if (isNaN(ratio) || ratio <= 0) {
            console.log("Invalid ratio value");
            return;
        }
        service.set_transmit_gap_ratio(ratio);
        console.log(`Transmit gap ratio set to ${ratio}`);
    }
};

async function downloadFirmware(devices, downloadConfigs) {
    try {      
        const undownloadedGroup = new Set(devices);
        const downloadQueue = [];
        
        const specialDevice = 0xA0;
        let hasSpecialDevice = false;
        if (undownloadedGroup.has(specialDevice)) {
            hasSpecialDevice = true;
            undownloadedGroup.delete(specialDevice);
        }
        
        const downloadResults = {
            success: [],
            failed: [],
            successCount: 0,
            failedCount: 0
        };
        
        // Function to download firmware for a single device
        async function downloadSingleDevice(deviceId, deviceIndex, totalDevices) {
            return new Promise((resolve) => {
                if (deviceId < 0 || deviceId > 255) {
                    downloadResults.failed.push(deviceId);
                    downloadResults.failedCount++;
                    resolve({ deviceId, success: false, error: `Invalid device ID: ${deviceId}` });
                    return;
                }
                
                const firmwarePath = downloadConfigs.get(deviceId);
                if (!firmwarePath) {
                    downloadResults.failed.push(deviceId);
                    downloadResults.failedCount++;
                    resolve({ deviceId, success: false, error: `No firmware path configured for device 0x${deviceId.toString(16).toUpperCase()}` });
                    return;
                }
                
                // Start download
                try {
                    service.async_download_firmware(deviceId, {
                        file_path: firmwarePath
                    }, async (error) => {
                        try {
                            if (error && (error.func_error_code !== 0 || error.sys_error_code !== 0)) {
                                downloadResults.failed.push(deviceId);
                                downloadResults.failedCount++;
                                
                                resolve({ 
                                    deviceId, 
                                    success: false, 
                                    error: {
                                        func_error_code: error.func_error_code,
                                        func_info: error.func_info,
                                        sys_error_code: error.sys_error_code,
                                        sys_error_message: error.sys_error_message
                                    }
                                });
                            } else {
                                // Download successful
                                downloadResults.success.push(deviceId);
                                downloadResults.successCount++;
                                
                                resolve({ deviceId, success: true });
                            }
                        } catch (callbackError) {
                            downloadResults.failed.push(deviceId);
                            downloadResults.failedCount++;
                            resolve({ deviceId, success: false, error: `Callback error: ${callbackError.message}` });
                        }
                    });
                } catch (downloadError) {
                    downloadResults.failed.push(deviceId);
                    downloadResults.failedCount++;
                    resolve({ deviceId, success: false, error: `Download start error: ${downloadError.message}` });
                }
            });
        }
        
        // Universal progress bar management function
        function createProgressBar(deviceId, deviceIndex, totalDevices) {
            let status = 'STARTING'; // Status: STARTING, PROGRESS, SUCCESS, FAILED
            
            // Display initial status
            process.stdout.write(`Device 0x${deviceId.toString(16).toUpperCase()}: [${' '.repeat(30)}] 0.0% [Starting]\n`);
            
            // Start progress update timer
            const interval = setInterval(() => {
                try {
                    if (status === 'STARTING') {
                        // Switch to download status
                        status = 'PROGRESS';
                        return;
                    } else if (status === 'SUCCESS') {
                        // Display success status
                        process.stdout.moveCursor(0, deviceIndex - totalDevices);
                        process.stdout.clearLine(0);
                        // Get final byte count information
                        const finalProgress = service.get_download_progress(deviceId);
                        const finalBytes = finalProgress ? `(${finalProgress.file_size}/${finalProgress.file_size} bytes)` : '';
                        process.stdout.write(`Device 0x${deviceId.toString(16).toUpperCase()}: [${'='.repeat(30)}] 100.0% ${finalBytes} [Ok]\n`);
                        process.stdout.moveCursor(0, totalDevices - deviceIndex - 1);
                        clearInterval(interval);
                        return;
                    } else if (status === 'FAILED') {
                        // Display failed status
                        process.stdout.moveCursor(0, deviceIndex - totalDevices);
                        process.stdout.clearLine(0);
                        process.stdout.write(`Device 0x${deviceId.toString(16).toUpperCase()}: [${' '.repeat(30)}] 0.0% [Failed]\n`);
                        process.stdout.moveCursor(0, totalDevices - deviceIndex - 1);
                        clearInterval(interval);
                        return;
                    }
                    
                    // Normal progress update
                    const progress = service.get_download_progress(deviceId);
                    if (progress && progress.file_size > 0) {
                        const progressRatio = progress.transmitted_size / progress.file_size;
                        
                        if (!isNaN(progressRatio) && progressRatio >= 0 && progressRatio <= 1) {
                            // Real-time progress bar update
                            process.stdout.moveCursor(0, deviceIndex - totalDevices);
                            process.stdout.clearLine(0);
                            
                            const progressBar = generateProgressBar(progressRatio);
                            const progressText = `(${progress.transmitted_size}/${progress.file_size} bytes)`;
                            
                            process.stdout.write(
                                `Device 0x${deviceId.toString(16).toUpperCase()}: ${progressBar} ${progressText} [Downloading]\n`
                            );
                            
                            process.stdout.moveCursor(0, totalDevices - deviceIndex - 1);
                        }
                        
                        // If download is complete, automatically switch to success status
                        if (progress.transmitted_size >= progress.file_size) {
                            status = 'SUCCESS';
                        }
                    }
                } catch (err) {
                    // Ignore progress fetching errors
                }
            }, 100);
            
            // Return timer and status update function
            return {
                interval,
                setStatus: (newStatus) => {
                    status = newStatus;
                }
            };
        }
        
        // Main download loop
        while (undownloadedGroup.size > 0) {
            // Step 1: Search for devices in undownloaded group that meet criteria, add all to download queue
            const maxParallel = 5;
            
            while (downloadQueue.length < maxParallel && undownloadedGroup.size > 0) {
                let foundDevice = null;
                
                // Find devices with high 4 bits in range 1-5, not already in download queue, and with unique high 4 bits
                for (const deviceId of undownloadedGroup) {
                    const high4Bits = (deviceId >> 4) & 0x0F;
                    if (high4Bits >= 1 && high4Bits <= 5) {
                        // Check if this ID already exists in download queue
                        if (!downloadQueue.includes(deviceId)) {
                            // Check if high 4 bits are different from all existing IDs in download queue
                            const hasSameHigh4Bits = downloadQueue.some(existingId => {
                                const existingHigh4Bits = (existingId >> 4) & 0x0F;
                                return existingHigh4Bits === high4Bits;
                            });
                            
                            if (!hasSameHigh4Bits) {
                                foundDevice = deviceId;
                                break;
                            }
                        }
                        else {
                            undownloadedGroup.delete(deviceId);
                        }
                    }
                }
                
                if (foundDevice) {
                    undownloadedGroup.delete(foundDevice);
                    downloadQueue.push(foundDevice);
                } else {
                    // If no device found meeting criteria, break loop
                    break;
                }
            }
            
            // Step 2: If download queue has devices, start parallel download for entire queue
            if (downloadQueue.length > 0) {
                // First output logs that won't be overwritten
                console.log(`\nStarting download for ${downloadQueue.length} devices:`, 
                    downloadQueue.map(id => `0x${id.toString(16).toUpperCase()}`).join(', '));
                
                // Wait for log output to complete, ensuring progress bars don't overwrite logs
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Start progress update timers, display initial status
                const progressData = [];
                downloadQueue.forEach((deviceId, index) => {
                    const progressInfo = createProgressBar(deviceId, index, downloadQueue.length);
                    progressData.push(progressInfo);
                });
                
                // Wait for initial status display to complete
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const currentDownloads = downloadQueue.map((deviceId, index) => 
                    downloadSingleDevice(deviceId, index, downloadQueue.length)
                );
                
                // Parallel download entire download queue
                const downloadResults = await Promise.all(currentDownloads);
                
                // First set final status for all devices through progress bar timers
                downloadResults.forEach((result, index) => {
                    if (result.success) {
                        progressData[index].setStatus('SUCCESS');
                    } else {
                        progressData[index].setStatus('FAILED');
                    }
                });
                
                // Wait sufficient time for progress bar timers to display all statuses
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Clean up progress update timers
                progressData.forEach(progressInfo => clearInterval(progressInfo.interval));
                
                // Wait for progress bars to be completely cleaned up
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Move cursor below progress bars
                process.stdout.moveCursor(0, downloadQueue.length);
                
                // After all tasks complete, display result logs uniformly
                downloadResults.forEach(result => {
                    if (!result.success) {
                        if (result.error && typeof result.error === 'object' && result.error.func_error_code !== undefined) {
                            // System error
                            console.error(`\nDevice 0x${result.deviceId.toString(16).toUpperCase()} return log:`, {
                                func_error_code: `0x${(result.error.func_error_code || 0).toString(16).padStart(4, "0").toUpperCase()}`,
                                func_info: (result.error.func_info || []).map(
                                    (x) => `0x${(x || 0).toString(16).padStart(4, "0").toUpperCase()}`
                                ),
                                sys_error_code: `0x${(result.error.sys_error_code || 0).toString(16).padStart(4, "0").toUpperCase()}`,
                                sys_error_code: `0x${(result.error.sys_error_code || 0).toString(16).padStart(4, "0").toUpperCase()}`,
                                sys_error_message: result.error.sys_error_message || 'Unknown error',
                            });
                        } else {
                            // Other errors
                            console.error(`\nDevice 0x${result.deviceId.toString(16).toUpperCase()}: ${result.error}`);
                        }
                    }
                });
                
                // After download completes, download queue is empty, start next round of search
                downloadQueue.length = 0;
            } else {
                // If no device found meeting criteria, break main loop
                break;
            }
        }
        
        // Finally download special device ID=0xA0 separately
        if (hasSpecialDevice) {
            // First output logs that won't be overwritten
            console.log(`\nDownloading device 0x${specialDevice.toString(16).toUpperCase()} ...`);
            
            // Wait for log output to complete, ensuring progress bars don't overwrite logs
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Use universal progress bar function, display initial status
            const specialProgressInfo = createProgressBar(specialDevice, 0, 1);
            
            // Wait for initial status display to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Download special device and get result
            const specialResult = await downloadSingleDevice(specialDevice, 0, 1);
            
            // Wait for progress bar to display final status
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Clean up progress update timer
            clearInterval(specialProgressInfo.interval);
            
            // Wait for progress bar to be completely cleaned up
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Handle special device download result
            if (!specialResult.success) {
                console.log(`\nSpecial device 0x${specialDevice.toString(16).toUpperCase()} download failed:`);
                if (specialResult.error && typeof specialResult.error === 'object' && specialResult.error.func_error_code !== undefined) {
                    // System error
                    console.error(`Device 0x${specialDevice.toString(16).toUpperCase()} return log:`, {
                        func_error_code: `0x${(specialResult.error.func_error_code || 0).toString(16).padStart(4, "0").toUpperCase()}`,
                        func_info: (specialResult.error.func_info || []).map(
                            (x) => `0x${(x || 0).toString(16).padStart(4, "0").toUpperCase()}`
                        ),
                        sys_error_code: `0x${(specialResult.error.sys_error_code || 0).toString(16).padStart(4, "0").toUpperCase()}`,
                        sys_error_message: specialResult.error.sys_error_message || 'Unknown error',
                    });
                } else {
                    // Other error
                    console.error(`Device 0x${specialDevice.toString(16).toUpperCase()}: ${specialResult.error}`);
                }
            }
        }
        
        // Output download summary
        console.log('\nDownload Summary:');
        console.log(`Success: ${downloadResults.successCount} devices`);
        console.log(`Failed: ${downloadResults.failedCount} devices`);
        
        if (downloadResults.success.length > 0) {
            console.log('Successful devices:', downloadResults.success.map(id => `0x${id.toString(16).toUpperCase()}`).join(', '));
        }
        
        if (downloadResults.failed.length > 0) {
            console.log('Failed devices:', downloadResults.failed.map(id => `0x${id.toString(16).toUpperCase()}`).join(', '));
        }
        
        return downloadResults;
        
    } catch (error) {
        console.error('\nDownload error:', error.message);
        throw error;
    }
}

// Main command processing function
async function processCommand(command) {
    const args = command.trim().split(/\s+/);
    const cmd = args[0];
    const params = args.slice(1);

    try {
        // Check device connection before processing commands
        if (!await isDeviceConnected()) {
            throw new Error("Device disconnected");
        }

        switch (cmd) {
            case "off":
                disconnectDevice();
                return "disconnected"; // Signal to return to port selection
                
            case "gi":
                if (params.length !== 1) {
                    console.log("Usage: gi <id|id_range>  (e.g., gi 1 or gi 1-3 or gi 1,3,5)");
                    return;
                }
                const giIds = parseDeviceIds(params[0]);
                if (giIds.length > 0) {
                    commandHandlers.gi(giIds);
                } else {
                    console.log("Invalid device ID format.");
                }
                break;

            case "ge":
                if (!isCommandAvailable('ge')) {
                    console.log("Command 'ge' is not available in release mode");
                    return;
                }
                if (params.length !== 1) {
                    console.log("Usage: ge <id|id_range>  (e.g., ge 0x1 or ge 0x1-0x3 or ge 0x1,0x3,0x5)");
                    return;
                }
                const geIds = parseDeviceIds(params[0]);
                if (geIds.length > 0) {
                    commandHandlers.ge(geIds);
                } else {
                    console.log("Invalid device ID format.");
                }
                break;

            case "dl":
                if (params.length < 1) {
                    console.log("Usage: dl <id|id_range|all> [firmware_path]");
                    console.log("Examples:");
                    console.log("  dl 0x11                    # Download single device");
                    console.log("  dl 0x11-0x14               # Download device range");
                    console.log("  dl all                     # Download all configured devices");
                    console.log("Note: If firmware_path is not specified, it will use the configured path from FIRMWARE_FILE");
                    return;
                }
                const dlIds = parseDeviceIds(params[0]);
                if (dlIds.length === 0) {
                    console.log("Invalid device ID format.");
                    return;
                }

                // Check firmware paths for each ID
                const downloadConfigs = new Map();
                for (const id of dlIds) {
                    const firmwarePath = params[1] || getFirmwarePath(id);
                    if (!firmwarePath) {
                        console.log(`Warning: No firmware configured for device 0x${id.toString(16).toUpperCase()}`);
                        continue;
                    }
                    downloadConfigs.set(id, firmwarePath);
                }

                if (downloadConfigs.size === 0) {
                    console.log("No valid firmware paths found for the specified IDs.");
                    return;
                }

                // Show download configuration
                console.log("\nDownload configurations:");
                for (const [id, path] of downloadConfigs) {
                    console.log(`Device 0x${id.toString(16).toUpperCase()}: ${path.split('/').pop()}`);
                }

                // Start parallel download
                await downloadFirmware(Array.from(downloadConfigs.keys()), downloadConfigs);
                break;

            case "jp":
                if (params.length !== 1) {
                    console.log("Usage: jp <id|id_range>  (e.g., jp 0x1 or jp 0x1-0x3)");
                    return;
                }
                const jpIds = parseDeviceIds(params[0]);
                if (jpIds.length > 0) {
                    commandHandlers.jp(jpIds);
                } else {
                    console.log("Invalid device ID format.");
                }
                break;

            case "sb":
                if (!isCommandAvailable('sb')) {
                    console.log("Command 'sb' is not available in release mode");
                    return;
                }
                if (params.length !== 2) {
                    console.log("Usage: sb <id> <board_info_key>  (e.g., sb 21 mcp1)");
                    return;
                }
                const sbId = parseInt(params[0], 16);
                if (isNaN(sbId)) {
                    console.log("Invalid device ID.");
                    return;
                }
                commandHandlers.sb(sbId, params[1]);
                break;

            case "rb":
                if (params.length !== 1) {
                    console.log("Usage: rb <id|id_range>  (e.g., rb 0x1 or rb 0x1-0x3)");
                    return;
                }
                const rbIds = parseDeviceIds(params[0]);
                if (rbIds.length > 0) {
                    commandHandlers.rb(rbIds);
                } else {
                    console.log("Invalid device ID format.");
                }
                break;

            case "swrp_binfo":
            case "rswrp_binfo":
            case "swrp_bldr":
            case "rswrp_bldr":
                if (!isCommandAvailable(cmd)) {
                    console.log(`Command '${cmd}' is not available in release mode`);
                    return;
                }
                if (params.length !== 1) {
                    console.log(`Usage: ${cmd} <id|id_range>  (e.g., ${cmd} 0x1 or ${cmd} 0x1-0x3)`);
                    return;
                }
                const flashIds = parseDeviceIds(params[0]);
                if (flashIds.length > 0) {
                    flashProtectionHandlers[cmd](flashIds);
                } else {
                    console.log("Invalid device ID format.");
                }
                break;

            case "at":
                if (!isCommandAvailable('at')) {
                    console.log("Command 'at' is not available in release mode");
                    return;
                }
                if (params.length !== 1) {
                    console.log("Usage: at <ms>");
                    return;
                }
                const ms = parseInt(params[0]);
                configHandlers.at(ms);
                break;

            case "tg":
                if (!isCommandAvailable('tg')) {
                    console.log("Command 'tg' is not available in release mode");
                    return;
                }
                if (params.length !== 1) {
                    console.log("Usage: tg <ratio>");
                    return;
                }
                const ratio = parseInt(params[0]);
                configHandlers.tg(ratio);
                break;

            case "help":
                showHelp();
                break;

            case "exit":
                console.log("Exiting...");
                disconnectDevice();
                shell.close();
                process.exit(0);
                break;

            default:
                console.log('Invalid command. Type "help" for available commands.');
        }
    } catch (error) {
        if (error.message === "Device disconnected") {
            console.log("Device connection lost, returning to port selection...");
            return "disconnected";
        }
        console.error("Command execution error:", error.message);
        throw error; // Re-throw to trigger connection check
    }
}

// Help function
function showHelp() {
    console.log("\nAvailable commands:");
    
    // Show release commands
    if (isCommandAvailable('off')) {
        console.log("  off                            Disconnect device");
    }
    if (isCommandAvailable('gi')) {
        console.log("  gi <id|id_range>               Get device info (e.g., gi 1 or gi 1-3 or gi 1,3,5)");
    }
    if (isCommandAvailable('dl')) {
        console.log("  dl <id|id_range|all> [fw_path] Download firmware");
    }
    if (isCommandAvailable('jp')) {
        console.log("  jp <id|id_range>               Jump to app");
    }
    if (isCommandAvailable('rb')) {
        console.log("  rb <id|id_range>               Reboot device");
    }
    
    // Show internal commands if available
    if (config.mode === 'internal') {
        console.log("\n[Internal Commands:]");
        if (isCommandAvailable('ge')) {
            console.log("  ge <id|id_range>               Get error code (e.g., ge 0x1 or ge 0x1-0x3 or ge 0x1,0x3,0x5)");
        }
        if (isCommandAvailable('sb')) {
            console.log("  sb <id> <board_info_key>       Set board info");
        }
        if (isCommandAvailable('at')) {
            console.log("  at <ms>                        Set auto request cycle");
        }
        if (isCommandAvailable('tg')) {
            console.log("  tg <ratio>                     Set transmit gap ratio");
        }
        if (isCommandAvailable('swrp_binfo')) {
            console.log("  swrp_binfo <id|id_range>       Set flash write protection-board info");
        }
        if (isCommandAvailable('rswrp_binfo')) {
            console.log("  rswrp_binfo <id|id_range>      Reset flash write protection-board info");
        }
        if (isCommandAvailable('swrp_bldr')) {
            console.log("  swrp_bldr <id|id_range>        Set flash write protection-bldr");
        }
        if (isCommandAvailable('rswrp_bldr')) {
            console.log("  rswrp_bldr <id|id_range>       Reset flash write protection-bldr");
        }
    }
    
    // Show common commands
    console.log("  help                           Show this help");
    console.log("  exit                           Exit program");
    
    // Show current mode
    console.log(`\nCurrent mode: ${config.mode.toUpperCase()}`);
}

// Main command loop
async function mainLoop() {
    // Load firmware configuration first
    loadFirmwareConfig();
    
    process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen
    console.log("\n==============================================================\n");
    console.log("Welcome to Wujihand Upgrader CLI! (" + config.mode.toLowerCase() + ")");
    console.log("\n==============================================================\n");
    await sleep(200);
    while (true) {
        try {
            // Always start with port selection if not connected
            if (!await isDeviceConnected()) {
                console.log("\nSearching for available serial ports...");
                await sleep(200);
                const connected = await connectDevice();
                if (!connected) {
                    console.log("\nFailed to connect, retrying...");
                    await sleep(1000);
                    continue;
                }
                await sleep(200);
                console.log("\nDevice connected successfully!");
                // Wait a bit more for connection to be fully established
                await sleep(1000);
            }

            process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen
            console.log("\n==============================================================\n");
            console.log("Wujihand Upgrader CLI");
            console.log("\n==============================================================\n");
            
            // Command input loop
            while (await isDeviceConnected()) {
                try {
                    const command = await new Promise(resolve => {
                        shell.question("\nEnter command -> ", resolve);
                    });

                    if (command.trim() === "") continue;
                    
                    const result = await processCommand(command);
                    if (result === "disconnected") {
                        break;
                    }
                    
                } catch (error) {
                    console.error("Unexpected error:", error.message);
                }
            }
            disconnectDevice();
            console.log("Device connection lost, returning to port selection...");
            await sleep(1000);
            
        } catch (error) {
            console.error("Unexpected error:", error.message);
        }
    }
}

// Start the application with restart capability
function startApp() {
    mainLoop().catch(error => {
        console.error("Unexpected error:", error.message);
        console.log("Exiting...");
        disconnectDevice();
        shell.close();
        process.exit(1);
    });
}

// Start the application
startApp();
