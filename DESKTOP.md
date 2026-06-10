# 设备标识管理器 — 桌面应用（Tauri）

本项目是一个 **Tauri 桌面应用**：前端用 React + Vite，后端用 Rust。
界面与浏览器版完全一致，但运行为原生 Windows 窗口，并能调用真实的
注册表 / WMI 来读写设备标识。

## 一、在 Windows 上打包 .exe（你要的最终产物）

> 最终的 `.exe` / 安装包必须在 **Windows 机器**上构建。

### 1. 安装前置环境（一次性）

- **Node.js**（18+）：https://nodejs.org
- **Rust**：https://www.rust-lang.org/tools/install （安装时会自动装 MSVC 工具链；
  如果提示缺少 “Visual Studio C++ Build Tools”，按提示装上即可）
- **WebView2 运行时**：Win11 自带；Win10 若没有，从微软官网装
  “Microsoft Edge WebView2 Runtime”

### 2. 拉取代码并安装依赖

```bash
git clone https://github.com/KILIG-CM/HWID.git
cd HWID
npm install
```

### 3. 开发模式（热重载，边改边看）

```bash
npm run tauri:dev
```

会弹出原生窗口，改前端代码即时刷新。

### 4. 打包正式安装包

```bash
npm run tauri:build
```

产物在：

```
src-tauri/target/release/bundle/
├── nsis/   设备标识管理器_0.1.0_x64-setup.exe   ← NSIS 安装程序
└── msi/    设备标识管理器_0.1.0_x64_zh-CN.msi    ← MSI 安装包
```

免安装的单文件 exe 在：
```
src-tauri/target/release/设备标识管理器.exe
```

## 二、真实系统调用说明

读写注册表/硬件标识是**系统级特权操作**，需以**管理员身份运行**，且仅应在
**授权的运维 / 测试场景**下使用。

后端接口在 `src-tauri/src/device.rs`：

| 命令 | 说明 | 当前状态 |
|------|------|----------|
| `read_identifier(key)`  | 读取单项标识 | 注册表三项（机器GUID/设备ID/产品ID）已接通；硬件项（MAC/硬盘/CPU/主板）待补 WMI |
| `write_identifier(key,value)` | 写入单项标识 | 注册表三项已接通；硬件项待补 |
| `run_diagnostic()` | 环境诊断 | 含管理员/注册表访问检查 |

- 在 **Windows** 上：走真实 `winreg` / `wmi`。
- 在 **非 Windows**（如本地 mac/Linux 开发）或**纯浏览器** `npm run dev`：
  自动回退为模拟实现，界面照常可玩。

> 待办（已在代码中用 `TODO` 标出）：硬件类标识（MAC 地址、硬盘序列号、
> CPU/主板序列号）的 WMI 读取与写入路由。MAC 可通过网卡的
> `NetworkAddress` 注册表值实现；磁盘/主板序列号通常需厂商工具或驱动层支持。

## 三、以管理员身份运行

打包后的 exe 右键「以管理员身份运行」即可获得注册表写入权限。
如需默认请求提权，可在 `src-tauri/tauri.conf.json` 的 NSIS 配置或
应用清单中加入 `requireAdministrator`（需要时告诉我，我来加）。
