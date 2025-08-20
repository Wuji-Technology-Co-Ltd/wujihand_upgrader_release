// Configuration file for Wujihand Upgrader CLI
// Controls which commands are available in different modes

module.exports = {
    // 运行模式：release(发布版) | internal(内部版)
    mode: process.env.WUJI_MODE || 'internal',
    
    // 发布版可用指令
    releaseCommands: [
        'off',      // 断开连接
        'gi',       // 获取设备信息
        'dl',       // 下载固件
        'jp',       // 跳转到应用
        'rb',       // 重启设备
        'help',     // 显示帮助
        'exit'      // 退出程序
    ],
    
    // 内部版额外指令
    internalCommands: [
        'ge',           // 获取错误代码
        'sb',           // 设置板信息
        'at',           // 设置自动请求周期
        'tg',           // 设置传输间隔比例
        'swrp_binfo',   // 设置闪存写保护-板信息
        'rswrp_binfo',  // 重置闪存写保护-板信息
        'swrp_bldr',    // 设置闪存写保护-引导程序
        'rswrp_bldr'    // 重置闪存写保护-引导程序
    ]
};
