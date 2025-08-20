#!/bin/bash
# Dependency check script for Wujihand Upgrader CLI
# 检查系统是否满足所有运行时依赖要求

echo "=============================================================="
echo "Wujihand Upgrader CLI - 依赖检查脚本"
echo "=============================================================="

# 检查系统架构
echo "1. 检查系统架构..."
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    echo "✅ 系统架构: $ARCH (支持)"
else
    echo "❌ 系统架构: $ARCH (不支持，需要 x86_64)"
    exit 1
fi

# 检查操作系统
echo -e "\n2. 检查操作系统..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "操作系统: $PRETTY_NAME"
else
    echo "操作系统: 未知"
fi

# 检查TBB库
echo -e "\n3. 检查Intel TBB运行时库..."
TBB_FOUND=false
if ldconfig -p | grep -q "libtbb"; then
    echo "✅ Intel TBB库已安装"
    TBB_FOUND=true
elif [ -f "/usr/lib/x86_64-linux-gnu/libtbb.so" ] || [ -f "/usr/lib64/libtbb.so" ]; then
    echo "✅ Intel TBB库文件存在"
    TBB_FOUND=true
else
    echo "❌ Intel TBB库未找到"
    echo "   请安装: sudo apt-get install libtbb2 或 sudo yum install tbb"
fi

# 检查Boost库
echo -e "\n4. 检查Boost运行时库..."
BOOST_FOUND=false
if ldconfig -p | grep -q "libboost_system" && ldconfig -p | grep -q "libboost_thread"; then
    echo "✅ Boost库已安装"
    BOOST_FOUND=true
elif [ -f "/usr/lib/x86_64-linux-gnu/libboost_system.so" ] || [ -f "/usr/lib64/libboost_system.so" ]; then
    echo "✅ Boost库文件存在"
    BOOST_FOUND=true
else
    echo "❌ Boost库未找到"
    echo "   请安装: sudo apt-get install libboost-system libboost-thread 或 sudo yum install boost-system boost-thread"
fi

# 检查串口权限
echo -e "\n5. 检查串口访问权限..."
if groups $USER | grep -q "dialout"; then
    echo "✅ 用户已在dialout组中"
elif groups $USER | grep -q "uucp"; then
    echo "✅ 用户已在uucp组中"
else
    echo "⚠️  用户不在dialout或uucp组中"
    echo "   请运行: sudo usermod -a -G dialout $USER"
    echo "   然后重新登录"
fi

# 检查resource目录和.node文件
echo -e "\n6. 检查原生模块文件..."
if [ -d "resource" ]; then
    NODE_FILES=$(ls resource/downloader_addon_linux_*.node 2>/dev/null | wc -l)
    if [ $NODE_FILES -gt 0 ]; then
        echo "✅ 找到 $NODE_FILES 个原生模块文件"
        
        # 检查.node文件的依赖
        echo -e "\n7. 检查原生模块的运行时依赖..."
        for node_file in resource/downloader_addon_linux_*.node; do
            echo "检查文件: $node_file"
            MISSING_DEPS=$(ldd "$node_file" 2>/dev/null | grep "not found" | wc -l)
            if [ $MISSING_DEPS -eq 0 ]; then
                echo "✅ 所有依赖已满足"
            else
                echo "❌ 缺少 $MISSING_DEPS 个依赖库"
                ldd "$node_file" 2>/dev/null | grep "not found"
            fi
        done
    else
        echo "❌ 未找到原生模块文件"
        echo "   请确保resource目录中包含downloader_addon_linux_*.node文件"
    fi
else
    echo "❌ resource目录不存在"
    echo "   请确保resource目录存在并包含原生模块文件"
fi

# 检查firmware目录
echo -e "\n8. 检查固件文件..."
if [ -d "firmware" ]; then
    FIRMWARE_COUNT=$(ls firmware/*.bin 2>/dev/null | wc -l)
    if [ $FIRMWARE_COUNT -gt 0 ]; then
        echo "✅ 找到 $FIRMWARE_COUNT 个固件文件"
    else
        echo "⚠️  固件目录为空"
    fi
else
    echo "❌ firmware目录不存在"
fi

echo -e "\n=============================================================="
if [ "$TBB_FOUND" = true ] && [ "$BOOST_FOUND" = true ]; then
    echo "✅ 依赖检查完成 - 系统满足基本要求"
    echo "   如果仍有问题，请检查串口权限和原生模块文件"
else
    echo "❌ 依赖检查失败 - 请安装缺失的运行时库"
fi
echo "=============================================================="
