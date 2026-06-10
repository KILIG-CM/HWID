# 设备标识管理器

设备标识管理器（DeviceID Manager）是一个基于 **Tauri + React + Rust** 的 Windows 桌面应用，用于查看当前电脑的网络与硬件标识，并提供模拟生成、模拟应用和诊断流程。

> 当前版本：`v0.1.4`
>
> 最新下载：[GitHub Releases](https://github.com/KILIG-CM/HWID/releases/tag/v0.1.4)

## 当前功能

- 读取当前设备的真实标识信息。
- 按分组展示网络与硬件信息。
- 网络分组：
  - 有效物理网卡 MAC 地址
  - 公网 IP
- 硬件分组：
  - 硬盘序列号
  - CPU 标识
  - 主板序列号
  - 主板 UUID
  - 内存序列号
  - 显卡序列号
- 运行诊断，检查后端通信、注册表访问和 WMI 连接状态。
- 设置页开关支持持久化保存。
- 修改相关操作目前只做页面状态模拟，不会真实写入系统。

## 重要说明

当前版本不会真实修改系统标识。

以下操作均为模拟逻辑：

- 生成
- 锁定
- 应用更改
- 撤销
- 全部还原

应用不会真实写入注册表、网卡信息、硬盘信息、主板信息、内存信息、显卡信息或其他硬件/系统标识。真实修改逻辑后续待定。

历史与备份功能目前暂时禁用，不会创建真实备份，也不会执行真实还原。

## 下载与安装

1. 打开 [v0.1.4 Release 页面](https://github.com/KILIG-CM/HWID/releases/tag/v0.1.4)。
2. 下载 Windows 安装包。
3. 安装后启动「设备标识管理器」。
4. 如需读取部分系统信息，建议右键选择「以管理员身份运行」。

## 开发环境

需要安装：

- Node.js 18 或更高版本
- Rust 稳定版
- Microsoft Edge WebView2 Runtime
- Windows 开发环境建议安装 Visual Studio C++ Build Tools

## 本地开发

```bash
git clone https://github.com/KILIG-CM/HWID.git
cd HWID
npm install
npm run tauri:dev
```

只运行前端预览：

```bash
npm run dev
```

浏览器预览模式无法读取真实设备信息，会使用模拟数据展示界面。

## 构建安装包

```bash
npm run tauri:build
```

构建产物位于：

```text
src-tauri/target/release/bundle/
```

当前 Tauri 配置主要生成 NSIS 安装包。

## 项目结构

```text
src/                         前端 React 代码
src/components/panels/        页面组件
src/services/                 前端服务封装
src-tauri/                    Tauri 桌面端配置和 Rust 后端
src-tauri/src/device.rs       设备信息读取与模拟写入接口
src-tauri/src/settings.rs     设置持久化
```

## 已知限制

- 公网 IP 需要联网才能读取，断网或查询失败时会显示「未知」。
- 显卡通常没有统一标准序列号，当前读取的是更接近唯一实例标识的 PNPDeviceID 片段。
- 部分硬件厂商可能不公开序列号，读取失败时会显示「未知」。
- 非 Windows 环境不会读取真实设备信息。
- 修改系统标识属于高风险系统级能力，当前版本仅保留模拟流程。

## 安全边界

本项目当前定位是设备标识查看与修改流程演示工具，不是系统标识真实修改工具。

如后续接入真实修改逻辑，应单独实现权限确认、备份、回滚、风险提示和管理员提权流程。
