// Firmware Configuration File
// This file contains firmware paths for different device types
// Users can modify this file without changing the main script

module.exports = {
    // Spinal Board Firmware
    spinal_board: {
        "0xA0": "SBOARD_APP_v2.3.0-A.bin"
    },

    joint_board: {
        "0x11-0x54": "JOINT_APP_v5.0.4-B.bin"   // Universal driver board firmware
    },

    // Firmware Directory (relative to script location)
    firmware_dir: "./firmware"
};
