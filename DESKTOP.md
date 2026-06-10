# 设备标识管理器桌面版说明

本项目桌面版基于 **Tauri 2 + React + Rust** 构建，目标平台为 Windows。

前端负责页面展示和交互，Rust 后端负责读取 Windows 上的注册表、WMI 与系统信息。当前版本支持真实读取设备信息，但修改系统标识仍为模拟逻辑。

## 版本信息

- 当前应用版本：`0.1.4`
- 产品名称：设备标识管理器
- 主程序名：DeviceIDManager
- Release 页面：[v0.1.4](https://github.com/KILIG-CM/HWID/releases/tag/v0.1.4)

## Windows 使用说明

1. 从 Release 页面下载安装包。
2. 安装后启动应用。
3. 如果部分系统信息读取失败，可以尝试右键「以管理员身份运行」。

管理员权限可能影响注册表读取、WMI 查询或部分硬件信息枚举结果。

## 本地运行

安装依赖：

```bash
npm install
```

启动桌面开发模式：

```bash
npm run tauri:dev
```

仅启动前端预览：

```bash
npm run dev
```

注意：纯前端预览不会读取真实设备信息，会回退到模拟数据。

## 打包 Windows 安装包

```bash
npm run tauri:build
```

构建产物位于：

```text
src-tauri/target/release/bundle/
```

当前配置主要生成 NSIS 安装包。免安装主程序通常位于：

```text
src-tauri/target/release/DeviceIDManager.exe
```

具体文件名以本机 Tauri 构建输出为准。

## 真实读取能力

Windows 桌面版会通过 Rust 后端读取真实设备信息。

主要后端入口：

```text
src-tauri/src/device.rs
```

当前读取内容包括：

| 分组 | 项目 | 来源 |
| --- | --- | --- |
| 网络 | MAC 地址 | Win32_NetworkAdapter |
| 网络 | 公网 IP | 前端联网查询 |
| 硬件 | 硬盘序列号 | Win32_DiskDrive |
| 硬件 | CPU 标识 | Win32_Processor |
| 硬件 | 主板序列号 | Win32_BaseBoard |
| 硬件 | 主板 UUID | Win32_ComputerSystemProduct |
| 硬件 | 内存序列号 | Win32_PhysicalMemory |
| 硬件 | 显卡序列号 | Win32_VideoController / PNPDeviceID |

读取失败时，界面会显示「未知」或保留对应的失败状态。

## 修改逻辑说明

当前版本不会真实修改系统。

后端接口：

```text
write_identifier(key, value)
```

目前是 no-op 模拟实现，只用于演示应用流程。它不会写入：

- 注册表
- 网卡配置
- 硬盘信息
- 主板信息
- CPU 信息
- 内存信息
- 显卡信息
- 其他硬件或系统标识

前端的生成、应用更改、撤销、还原等操作只改变页面状态或模拟数据。真实写入逻辑后续待定。

## 历史与备份

历史与备份功能当前暂时禁用。

当前版本不会创建真实备份，也不会执行真实还原。「全部还原」如果出现在界面中，也只应视为模拟页面状态恢复。

## 诊断功能

运行诊断会检查：

- 前端与 Tauri 后端通信
- 注册表访问情况
- WMI 服务连接情况
- 当前是否处于模拟修改模式

诊断不会修改系统。

## 非 Windows 环境

在 macOS、Linux 或普通浏览器环境中，后端不会读取真实设备标识。应用会使用模拟数据，方便开发和预览界面。

## 后续接入真实修改时的注意事项

真实修改系统标识属于高风险能力。后续如果启用，应至少补充：

- 明确的用户确认
- 管理员权限检查
- 修改前备份
- 修改失败回滚
- 操作日志
- 风险提示
- 针对不同硬件和 Windows 版本的兼容性处理
