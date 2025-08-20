// Firmware Configuration File
// This file contains firmware paths for different device types
// Users can modify this file without changing the main script

module.exports = {
    // Spinal Board Firmware
    spinal_board: {
        "0xA0": "SBOARD_APP_v2.3.0-A.bin"
    },

    // cmc: {
    //     "0x11": "JOINT_APP_CMC1_v4.3.2-T.bin",  // CMC1
    //     "0x12": "JOINT_APP_CMC2_v4.3.2-T.bin"   // CMC2
    // },

    // mcp: {
    //     "0x21": "JOINT_APP_MCP1_v4.3.2-T.bin",  // MCP1
    //     "0x31": "JOINT_APP_MCP1_v4.3.2-T.bin",  // MCP1
    //     "0x41": "JOINT_APP_MCP1_v4.3.2-T.bin",  // MCP1
    //     "0x51": "JOINT_APP_MCP1_v4.3.2-T.bin",  // MCP1
    //     "0x22": "JOINT_APP_MCP2_v4.3.2-T.bin",  // MCP2
    //     "0x32": "JOINT_APP_MCP2_v4.3.2-T.bin",  // MCP2
    //     "0x42": "JOINT_APP_MCP2_v4.3.2-T.bin",  //
    //  MCP2
    //     "0x52": "JOINT_APP_MCP2_v4.3.2-T.bin"   // MCP2
    // },

    // pip: {
    //     "0x13": "JOINT_APP_PIP_v4.3.2-T.bin",   // PIP
    //     "0x23": "JOINT_APP_PIP_v4.3.2-T.bin",   // PIP
    //     "0x33": "JOINT_APP_PIP_v4.3.2-T.bin",   // PIP
    //     "0x43": "JOINT_APP_PIP_v4.3.2-T.bin",   // PIP
    //     "0x53": "JOINT_APP_PIP_v4.3.2-T.bin"    // PIP
    // },

    // dip: {
    //     "0x14": "JOINT_APP_DIP_v4.3.2-T.bin",   // DIP
    //     "0x24": "JOINT_APP_DIP_v4.3.2-T.bin",   // DIP
    //     "0x34": "JOINT_APP_DIP_v4.3.2-T.bin",   // DIP
    //     "0x44": "JOINT_APP_DIP_v4.3.2-T.bin",   // DIP
    //     "0x54": "JOINT_APP_DIP_v4.3.2-T.bin"    // DIP
    // },

    joint_board: {
        "0x11-0x54": "JOINT_APP_v5.0.4-B.bin"   // Universal driver board firmware
    },

    // Firmware Directory (relative to script location)
    firmware_dir: "./firmware"
};
