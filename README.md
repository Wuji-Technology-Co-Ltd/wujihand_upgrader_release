# Wujihand Firmware Upgrader CLI - Release Version

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Overview

Wujihand Firmware Upgrader CLI is a command-line interface tool for managing and upgrading firmware on Wujihand devices. This release version provides stable and reliable firmware upgrade functionality.

### System Requirements

- **Operating System**: Linux x64 (Currently only Linux is supported)
- **Memory**: At least 512MB RAM
- **Storage**: At least 100MB available space
- **Serial Port**: USB-to-serial device support
- **Permissions**: Serial device access permissions

### Runtime Dependencies

This package contains pre-compiled native modules. You only need to install the required runtime libraries:

#### Required C++ Runtime Libraries
```bash
# Ubuntu/Debian
sudo apt-get update
# Intel TBB runtime library (version varies by distro)
sudo apt-get install -y libtbb2 || sudo apt-get install -y libtbb12 || sudo apt-get install -y libtbb
# Boost runtime libraries
sudo apt-get install -y libboost-system1.74.0 libboost-thread1.74.0 || \
sudo apt-get install -y libboost-system libboost-thread

# CentOS/RHEL/Fedora
sudo yum install -y tbb boost-system boost-thread
# 或者使用 dnf (新版本)
sudo dnf install -y tbb boost-system boost-thread

# Arch Linux
sudo pacman -S tbb boost-libs

# OpenSUSE
sudo zypper install -y tbb boost_system boost_thread
```

#### Serial Port Permissions
```bash
# Add user to dialout group for serial access
sudo usermod -a -G dialout $USER
# Note: Re-login required for group changes to take effect
```

#### Verify Dependencies
```bash
# Method 1: Manual check
ldd resource/downloader_addon_linux_*.node | grep "not found" || echo "All dependencies satisfied"

# Method 2: Use dependency check script (recommended)
./check-deps.sh
```

### Installation & Usage

#### Prerequisites

1. **Node.js**: Version 16 or higher must be installed
2. **npm**: Usually comes with Node.js, but ensure it's available
3. **Linux System**: Currently only Linux x64 is supported
4. **Serial Port Access**: USB-to-serial device support with proper permissions

#### Installing Node.js and npm

**Ubuntu/Debian:**
```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**CentOS/RHEL/Fedora:**
```bash
# Install Node.js and npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

**Using Node Version Manager (nvm) - Recommended:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

#### Quick Start

1. Clone or download this repository
2. Ensure the `resource/` directory contains native module files
3. Run the program using one of the methods below

### Firmware Download

#### Option 1: Download from Official Repository
```bash
# Create firmware directory
mkdir -p firmware

# Download firmware files (example URLs - replace with actual URLs)
wget -O firmware/SBOARD_APP_v2.3.0-A.bin "https://github.com/wujihand/firmware/releases/latest/download/SBOARD_APP_v2.3.0-A.bin"
wget -O firmware/JOINT_APP_v5.0.4-B.bin "https://github.com/wujihand/firmware/releases/latest/download/JOINT_APP_v5.0.4-B.bin"
```

#### Option 2: Copy from Development Environment
```bash
# Copy firmware files from your development environment
cp /path/to/your/firmware/*.bin ./firmware/
```

#### Option 3: Manual Download
1. Visit the official firmware repository
2. Download the required firmware files
3. Place them in the `firmware/` directory

### Directory Structure

```
wuji-upgrader-cli/
├── run.js                          # Main program file
├── resource/                       # Native module directory
│   └── downloader_addon_linux_*.node
├── firmware/                       # Firmware files directory
│   ├── JOINT_APP_v*.bin           # Joint board firmware
│   └── SBOARD_APP_v*.bin          # Spinal board firmware
├── firmware_config.js              # Firmware configuration file
├── start-upgrader.sh               # Linux startup script
├── check-deps.sh                   # Dependency check script
├── config.js                       # Configuration file
└── README.md                       # This file
```

### Firmware Configuration

The `firmware_config.js` file manages firmware file paths and device mappings. Users can customize firmware selection by modifying this file.

#### Firmware Configuration Structure
```javascript
module.exports = {
  // Firmware directory path
  firmware_dir: './firmware',
  
  // Configure firmware for corresponding devices
  spinal_board: 'SBOARD_APP_*.bin',
  joint_board: 'JOINT_APP_*.bin'
};
```

### Usage

#### Starting the Program

```bash
# Method 1: Using startup script (recommended)
./start-upgrader.sh

# Method 2: Setting environment variable, direct Node.js execution
export WUJI_MODE=release
node run.js
```

#### First Run

1. The program will automatically search for available serial devices
2. Select the corresponding serial device to connect
3. After successful connection, you can use various commands

### Available Commands

#### Basic Commands

- **`help`** - Show help information for all available commands
- **`exit`** - Exit the program

#### Device Management

- **`off`** - Disconnect current device
- **`gi <id|id_range>`** - Get device information

### Device ID Reference

- **0xA0**: Spinal Board
- **0x11-0x14, 0x21-0x24, 0x31-0x34, 0x41-0x44, 0x51-0x54**: Joint Boards

### Input ID Format

- **Single device**: `11`
- **Continuous range**: `11-14`
- **Multiple devices**: `11,21,31`
- **All devices**: `all`

#### Firmware Upgrade

- **`dl <id|id_range|all> [firmware_path]`** - Download firmware to specified devices

**Detailed Usage:**
```bash
# Basic syntax
dl <device_ids> [firmware_path]

# Parameters:
# - device_ids: Single device (11), range (11-14), multiple (11,21,31), or all
# - firmware_path: Optional custom firmware file path

# Examples:
dl 11                           # Download to device 11 using default firmware
dl 11-14                        # Download to devices 11-14 using default firmware
dl 11,21,31                     # Download to specific devices using default firmware
dl all                          # Download to all supported devices using default firmware
```

**Download Process:**
1. **Connection**: Establishes serial connection to target device(s)
2. **Verification**: Checks device compatibility and current firmware version
3. **Download**: Transfers firmware data with progress indication
4. **Verification**: Validates firmware integrity after download
5. **Completion**: Reports success/failure status for each device

#### Device Control

- **`jp <id|id_range>`** - Jump to application
- **`rb <id|id_range>`** - Reboot device

### Examples

```bash
# Get device information
gi 11                      # Single device
gi 11-14                   # Device range
gi 11,21,31                # Multiple devices

# Download firmware
dl 11                      # Single device
dl 11-14                   # Device range
dl all                     # All devices

# Device control
jp 11                      # Jump to app
rb 11-14                   # Reboot devices
```

### Troubleshooting

#### Common Issues

1. **Serial Connection Failed**
   - Check USB cable connection
   - Ensure device is powered on
   - Check serial port permissions
   - Try reconnecting USB device
   - Verify device is in bootloader mode

2. **Firmware Download Failed**
   - Check if firmware file exists in `firmware/` directory
   - Verify firmware file integrity and compatibility
   - Check device connection status and permissions
   - View detailed error log information
   - Ensure target device supports the firmware type

3. **Insufficient Permissions**
   ```bash
   # Linux system
   sudo usermod -a -G dialout $USER
   # Re-login required
   
   # Or temporary authorization
   sudo chmod 666 /dev/ttyACM0
   ```

4. **Native Module Loading Failed**
   ```bash
   # Check if .node file exists in resource/ directory
   ls -la resource/
   
   # Verify file permissions
   chmod +x resource/downloader_addon_linux_*.node
   
   # Check system architecture compatibility
   uname -m  # Should show x86_64
   ```

5. **Firmware Configuration Errors**
   - Verify `firmware_config.js` syntax
   - Check firmware file paths and existence
   - Ensure firmware files match device types
   - Review error messages for specific issues

### Support

- **Help**: Use `help` command to view all available commands
- **Version**: 1.0.0
- **Platform**: Linux x64 only (currently)
- **Update Date**: 2025-08-20

---

<a name="chinese"></a>
## 中文

### 概述

Wujihand固件升级器CLI工具是一个命令行界面工具，用于管理和升级Wujihand设备的固件。本版本为发布版，提供稳定可靠的固件升级功能。

### 系统要求

- **操作系统**: Linux x64（目前仅支持Linux）
- **内存**: 至少 512MB RAM
- **存储**: 至少 100MB 可用空间
- **串口**: USB转串口设备支持
- **权限**: 串口设备访问权限

### 运行时依赖

本发布包包含预编译的原生模块，您只需安装必要的运行时库：

#### 必需的C++运行时库
```bash
# Ubuntu/Debian
sudo apt-get update
# Intel TBB 运行库（不同版本发行版包名可能不同）
sudo apt-get install -y libtbb2 || sudo apt-get install -y libtbb12 || sudo apt-get install -y libtbb
# Boost 运行库
sudo apt-get install -y libboost-system1.74.0 libboost-thread1.74.0 || \
sudo apt-get install -y libboost-system libboost-thread

# CentOS/RHEL/Fedora
sudo yum install -y tbb boost-system boost-thread
# 或者使用 dnf (新版本)
sudo dnf install -y tbb boost-system boost-thread

# Arch Linux
sudo pacman -S tbb boost-libs

# OpenSUSE
sudo zypper install -y tbb boost_system boost_thread

#### 串口权限设置
```bash
# 将用户添加到dialout组以访问串口
sudo usermod -a -G dialout $USER
# 注意：需要重新登录才能使组更改生效
```

#### 依赖验证
```bash
# 方法1：手动检查
ldd resource/downloader_addon_linux_*.node | grep "not found" || echo "所有依赖已满足"

# 方法2：使用依赖检查脚本（推荐）
./check-deps.sh
```

### 安装使用

#### 前置要求

1. **Node.js**: 必须安装版本16或更高
2. **npm**: 通常随Node.js一起安装，但请确保可用
3. **Linux系统**: 目前仅支持Linux x64
4. **串口访问**: USB转串口设备支持，具有适当权限

#### 安装Node.js和npm

**Ubuntu/Debian:**
```bash
# 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

**CentOS/RHEL/Fedora:**
```bash
# 安装Node.js和npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

**使用Node版本管理器(nvm) - 推荐:**
```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重启终端或运行:
source ~/.bashrc

# 安装Node.js 18
nvm install 18
nvm use 18

# 验证安装
node --version
npm --version
```

#### 快速开始

1. 克隆或下载此仓库
2. 确保 `resource/` 目录包含原生模块文件
3. 使用以下方法之一运行程序

### 目录结构

```
wuji-upgrader-cli/
├── run.js                          # 主程序文件
├── resource/                       # 原生模块目录
│   └── downloader_addon_linux_*.node
├── firmware/                       # 固件文件目录
│   ├── JOINT_APP_v*.bin            # 关节板通用固件
│   └── SBOARD_APP_v*.bin           # 脊髓板固件
├── firmware_config.js              # 固件配置文件
├── start-upgrader.sh                # Linux启动脚本
├── check-deps.sh                   # 依赖检查脚本
├── config.js                       # 配置文件
└── README.md                       # 本文件
```

### 固件下载

#### 选项1：从官方仓库下载
```bash
# 创建固件目录
mkdir -p firmware

# 下载固件文件（示例URL - 请替换为实际URL）
wget -O firmware/SBOARD_APP_v2.3.0-A.bin "https://github.com/wujihand/firmware/releases/latest/download/SBOARD_APP_v2.3.0-A.bin"
wget -O firmware/JOINT_APP_v5.0.4-B.bin "https://github.com/wujihand/firmware/releases/latest/download/JOINT_APP_v5.0.4-B.bin"
```

#### 选项2：从开发环境复制
```bash
cp /path/to/your/firmware/*.bin ./firmware/
```

#### 选项3：手动下载
1. 访问官方固件仓库
2. 下载所需的固件文件
3. 将它们放置在 `firmware/` 目录中

### 固件配置

`firmware_config.js` 文件管理固件文件路径和设备映射。用户可以通过修改此文件来自定义固件选择。

#### 固件配置文件结构
```javascript
module.exports = {
  // 固件目录路径
  firmware_dir: './firmware',
  
  // 配置对应设备的固件
  spinal_board: 'SBOARD_APP_*.bin',
  joint_board: 'JOINT_APP_*.bin'
};
```

### 使用方法

#### 启动程序

```bash
# 方法1：使用启动脚本（推荐）
./start-upgrader.sh

# 方法2：设置环境变量，直接使用Node.js运行
export WUJI_MODE=release
node run.js


#### 首次运行

1. 程序启动后会自动搜索可用的串口设备
2. 选择对应的串口设备进行连接
3. 连接成功后即可使用各种指令

### 可用指令

#### 基础指令

- **`help`** - 显示所有可用指令的帮助信息
- **`exit`** - 退出程序

#### 设备管理

- **`off`** - 断开当前设备连接
- **`gi <id|id_range>`** - 获取设备信息

### 设备ID说明

- **0xA0**: 脊髓板 (Spinal Board)
- **0x11-0x14, 0x21-0x24, 0x31-0x34, 0x41-0x44, 0x51-0x54**: 关节板 (Joint Board)

### 输入ID格式

- **单个设备**: `11`
- **连续范围**: `11-14`
- **多个设备**: `11,21,31`
- **所有设备**: `all`

#### 固件升级

- **`dl <id|id_range|all> [firmware_path]`** - 下载固件到指定设备

**详细用法：**
```bash
# 基本语法
dl <设备ID> [固件路径]

# 参数说明：
# - 设备ID: 单个设备 (11), 范围 (11-14), 多个 (11,21,31), 或 all
# - 固件路径: 可选的自定义固件文件路径

# 使用示例：
dl 11                           # 下载到设备11，使用默认固件
dl 11-14                        # 下载到设备11-14，使用默认固件
dl 11,21,31                     # 下载到指定设备，使用默认固件
dl all                          # 下载到所有支持的设备，使用默认固件
```

#### 设备控制

- **`jp <id|id_range>`** - 跳转到应用程序
- **`rb <id|id_range>`** - 重启设备


### 使用示例

```bash
# 获取设备信息
gi 11                 # 单个设备
gi 11-14              # 设备范围
gi 11,21,31           # 多个设备

# 下载固件
dl 11                 # 单个设备
dl 11-14              # 设备范围
dl all                # 所有设备

# 设备控制
jp 11                 # 跳转到应用程序
rb 11-14              # 重启设备
```

### 故障排除

#### 常见问题

1. **串口连接失败**
   - 检查USB线缆连接
   - 确认设备已上电
   - 检查串口权限设置
   - 尝试重新插拔USB设备
   - 验证设备是否处于bootloader模式

2. **固件下载失败**
   - 检查固件文件是否存在于 `firmware/` 目录中
   - 确认固件文件完整性和兼容性
   - 检查设备连接状态和权限
   - 查看详细错误日志信息
   - 确保目标设备支持该固件类型

3. **权限不足**
   ```bash
   # Linux系统
   sudo usermod -a -G dialout $USER
   # 重新登录后生效
   
   # 或者临时授权
   sudo chmod 666 /dev/ttyACM0
   ```

4. **原生模块加载失败**
   ```bash
   # 检查resource/目录中是否存在.node文件
   ls -la resource/
   
   # 验证文件权限
   chmod +x resource/downloader_addon_linux_*.node
   
   # 检查系统架构兼容性
   uname -m  # 应显示 x86_64
   ```

5. **固件配置错误**
   - 验证 `firmware_config.js` 语法
   - 检查固件文件路径和存在性
   - 确保固件文件与设备类型匹配
   - 查看错误消息以了解具体问题

### 技术支持

- **帮助**: 使用 `help` 指令查看所有可用命令
- **版本**: 1.0.0
- **平台**: 仅支持Linux x64（目前）
- **更新日期**: 2025-08-20

---

## 注意事项

**重要**: 本版本为发布版，仅包含稳定可靠的功能。如需开发调试功能，请使用内部版本。

**平台支持**: 目前仅支持Linux x64平台。Windows和macOS版本正在开发中，敬请期待。

## 许可证

本软件采用 MIT 许可证，详见 LICENSE 文件。
