// 调试辅助模块
class DebugHelper {
    constructor() {
        this.isDebugMode = false;
        this.logs = [];
        this.maxLogs = 1000;
        
        this.init();
    }

    /**
     * 初始化调试助手
     */
    init() {
        // 检查是否启用调试模式
        this.isDebugMode = window.location.search.includes('debug=true') || 
                          localStorage.getItem('epub-debug') === 'true';
        
        if (this.isDebugMode) {
            this.enableDebugMode();
        }
    }

    /**
     * 启用调试模式
     */
    enableDebugMode() {
        console.log('🐛 调试模式已启用');
        
        // 添加调试面板
        this.createDebugPanel();
        
        // 拦截console方法
        this.interceptConsole();
        
        // 添加全局调试方法
        window.debug = this;
        window.debugEpub = () => this.showDebugInfo();
    }

    /**
     * 创建调试面板
     */
    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-header">
                <h3>🐛 调试面板</h3>
                <button onclick="debug.togglePanel()">收起</button>
            </div>
            <div class="debug-content">
                <div class="debug-tabs">
                    <button class="debug-tab active" onclick="debug.showTab('logs')">日志</button>
                    <button class="debug-tab" onclick="debug.showTab('files')">文件</button>
                    <button class="debug-tab" onclick="debug.showTab('performance')">性能</button>
                </div>
                <div class="debug-tab-content">
                    <div id="debug-logs" class="debug-tab-panel active">
                        <div class="debug-logs-container"></div>
                    </div>
                    <div id="debug-files" class="debug-tab-panel">
                        <div class="debug-files-container"></div>
                    </div>
                    <div id="debug-performance" class="debug-tab-panel">
                        <div class="debug-performance-container"></div>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #debug-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                max-height: 600px;
                background: #1a1d29;
                border: 1px solid #3b82f6;
                border-radius: 8px;
                z-index: 10000;
                font-family: monospace;
                font-size: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            }
            .debug-header {
                background: #3b82f6;
                color: white;
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }
            .debug-header h3 {
                margin: 0;
                font-size: 14px;
            }
            .debug-header button {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            }
            .debug-content {
                max-height: 550px;
                overflow: hidden;
            }
            .debug-tabs {
                display: flex;
                background: #252936;
                border-bottom: 1px solid #3b82f6;
            }
            .debug-tab {
                flex: 1;
                padding: 8px;
                background: none;
                border: none;
                color: #a1a8b8;
                cursor: pointer;
                font-size: 11px;
            }
            .debug-tab.active {
                background: #3b82f6;
                color: white;
            }
            .debug-tab-panel {
                display: none;
                padding: 12px;
                max-height: 480px;
                overflow-y: auto;
                color: #a1a8b8;
            }
            .debug-tab-panel.active {
                display: block;
            }
            .debug-log-item {
                margin-bottom: 8px;
                padding: 6px;
                border-radius: 4px;
                font-size: 11px;
                line-height: 1.4;
            }
            .debug-log-item.error {
                background: rgba(239, 68, 68, 0.1);
                border-left: 3px solid #ef4444;
            }
            .debug-log-item.warn {
                background: rgba(245, 158, 11, 0.1);
                border-left: 3px solid #f59e0b;
            }
            .debug-log-item.info {
                background: rgba(59, 130, 246, 0.1);
                border-left: 3px solid #3b82f6;
            }
            .debug-log-time {
                color: #6b7280;
                font-size: 10px;
            }
            .debug-collapsed {
                height: 40px !important;
                overflow: hidden;
            }
            .debug-collapsed .debug-content {
                display: none;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);
    }

    /**
     * 拦截console方法
     */
    interceptConsole() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            this.addLog('info', args);
            originalLog.apply(console, args);
        };

        console.warn = (...args) => {
            this.addLog('warn', args);
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            this.addLog('error', args);
            originalError.apply(console, args);
        };
    }

    /**
     * 添加日志
     * @param {string} level - 日志级别
     * @param {any[]} args - 日志参数
     */
    addLog(level, args) {
        const log = {
            level,
            message: args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '),
            timestamp: new Date().toLocaleTimeString()
        };

        this.logs.push(log);
        
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 更新调试面板
        this.updateLogsPanel();
    }

    /**
     * 更新日志面板
     */
    updateLogsPanel() {
        const container = document.querySelector('.debug-logs-container');
        if (!container) return;

        const recentLogs = this.logs.slice(-50); // 只显示最近50条
        container.innerHTML = recentLogs.map(log => `
            <div class="debug-log-item ${log.level}">
                <div class="debug-log-time">${log.timestamp}</div>
                <div class="debug-log-message">${log.message}</div>
            </div>
        `).join('');

        // 自动滚动到底部
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 显示调试信息
     */
    showDebugInfo() {
        if (!window.epubToZipApp) {
            console.log('应用未初始化');
            return;
        }

        const app = window.epubToZipApp;
        const info = {
            应用信息: app.getAppInfo(),
            处理统计: app.getProcessingStats(),
            文件列表: app.fileHandler ? app.fileHandler.getAllFiles() : [],
            浏览器支持: Utils.checkBrowserSupport(),
            性能信息: this.getPerformanceInfo()
        };

        console.log('🐛 调试信息:', info);
        return info;
    }

    /**
     * 获取性能信息
     */
    getPerformanceInfo() {
        return {
            内存使用: this.getMemoryInfo(),
            页面加载时间: performance.now(),
            导航时间: performance.getEntriesByType('navigation')[0],
            资源加载: performance.getEntriesByType('resource').length
        };
    }

    /**
     * 获取内存信息
     */
    getMemoryInfo() {
        if (performance.memory) {
            return {
                已使用: `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB`,
                总计: `${Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)}MB`,
                限制: `${Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)}MB`
            };
        }
        return '不支持内存监控';
    }

    /**
     * 切换面板显示
     */
    togglePanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.classList.toggle('debug-collapsed');
        }
    }

    /**
     * 显示标签页
     * @param {string} tabName - 标签页名称
     */
    showTab(tabName) {
        // 更新标签按钮
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[onclick="debug.showTab('${tabName}')"]`).classList.add('active');

        // 更新面板内容
        document.querySelectorAll('.debug-tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`debug-${tabName}`).classList.add('active');

        // 更新对应内容
        if (tabName === 'files') {
            this.updateFilesPanel();
        } else if (tabName === 'performance') {
            this.updatePerformancePanel();
        }
    }

    /**
     * 更新文件面板
     */
    updateFilesPanel() {
        const container = document.querySelector('.debug-files-container');
        if (!container || !window.epubToZipApp) return;

        const files = window.epubToZipApp.fileHandler ? 
            window.epubToZipApp.fileHandler.getAllFiles() : [];

        container.innerHTML = files.length > 0 ? files.map(file => `
            <div class="debug-file-item">
                <strong>${file.name}</strong><br>
                大小: ${Utils.formatFileSize(file.size)}<br>
                状态: ${file.status}<br>
                输出: ${file.outputName || '未生成'}
            </div>
        `).join('') : '<div>暂无文件</div>';
    }

    /**
     * 更新性能面板
     */
    updatePerformancePanel() {
        const container = document.querySelector('.debug-performance-container');
        if (!container) return;

        const perfInfo = this.getPerformanceInfo();
        container.innerHTML = `
            <div><strong>内存使用:</strong> ${JSON.stringify(perfInfo.内存使用, null, 2)}</div>
            <div><strong>页面运行时间:</strong> ${Math.round(perfInfo.页面加载时间)}ms</div>
            <div><strong>资源数量:</strong> ${perfInfo.资源加载}</div>
        `;
    }

    /**
     * 测试文件验证
     * @param {File} file - 测试文件
     */
    async testFileValidation(file) {
        console.log('🧪 测试文件验证:', file.name);
        
        const isValid = await Utils.validateEpubFile(file);
        console.log('验证结果:', isValid);
        
        // 详细检查
        console.log('文件详情:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleString()
        });

        // 检查文件头
        try {
            const buffer = await file.slice(0, 10).arrayBuffer();
            const view = new Uint8Array(buffer);
            console.log('文件头 (前10字节):', Array.from(view).map(b => 
                b.toString(16).padStart(2, '0')).join(' '));
        } catch (error) {
            console.error('无法读取文件头:', error);
        }

        return isValid;
    }

    /**
     * 导出调试日志
     */
    exportLogs() {
        const data = {
            timestamp: new Date().toISOString(),
            logs: this.logs,
            appInfo: this.showDebugInfo(),
            userAgent: navigator.userAgent
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        Utils.downloadBlob(blob, `epub-debug-${Date.now()}.json`);
    }
}

// 自动初始化调试助手
window.debugHelper = new DebugHelper();