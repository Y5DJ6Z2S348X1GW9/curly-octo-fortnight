// 工具函数模块
class Utils {
    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的文件大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间
     * @returns {Function} 防抖后的函数
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 时间限制
     * @returns {Function} 节流后的函数
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 深拷贝对象
     * @param {any} obj - 要拷贝的对象
     * @returns {any} 拷贝后的对象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    /**
     * 延迟执行
     * @param {number} ms - 延迟时间（毫秒）
     * @returns {Promise} Promise对象
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 检查文件类型
     * @param {File} file - 文件对象
     * @param {string[]} allowedTypes - 允许的文件类型
     * @returns {boolean} 是否为允许的类型
     */
    static isValidFileType(file, allowedTypes = ['.epub']) {
        const fileName = file.name.toLowerCase();
        return allowedTypes.some(type => fileName.endsWith(type.toLowerCase()));
    }

    /**
     * 获取文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 扩展名
     */
    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    /**
     * 移除文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 不含扩展名的文件名
     */
    static removeFileExtension(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    }

    /**
     * 安全的JSON解析
     * @param {string} jsonString - JSON字符串
     * @param {any} defaultValue - 默认值
     * @returns {any} 解析结果
     */
    static safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON解析失败:', error);
            return defaultValue;
        }
    }

    /**
     * 创建下载链接
     * @param {Blob} blob - Blob对象
     * @param {string} filename - 文件名
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, warning, info)
     * @param {number} duration - 显示时长（毫秒）
     */
    static showNotification(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} animate-slideInDown`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // 添加样式
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-lg);
                    backdrop-filter: blur(10px);
                    overflow: hidden;
                }
                .notification-success { border-left: 4px solid var(--success-color); }
                .notification-error { border-left: 4px solid var(--error-color); }
                .notification-warning { border-left: 4px solid var(--warning-color); }
                .notification-info { border-left: 4px solid var(--primary-color); }
                .notification-content {
                    display: flex;
                    align-items: center;
                    padding: var(--space-4);
                    gap: var(--space-3);
                }
                .notification-icon {
                    font-size: var(--text-lg);
                    flex-shrink: 0;
                }
                .notification-message {
                    flex: 1;
                    color: var(--text-primary);
                    font-size: var(--text-sm);
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: var(--text-lg);
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }
                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                }
            `;
            document.head.appendChild(styles);
        }

        // 添加到页面
        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('animate-fadeOut');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    /**
     * 获取通知图标
     * @param {string} type - 通知类型
     * @returns {string} 图标
     */
    static getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * 验证EPUB文件
     * @param {File} file - 文件对象
     * @returns {Promise<boolean>} 验证结果
     */
    static async validateEpubFile(file) {
        try {
            // 检查文件扩展名
            if (!this.isValidFileType(file, ['.epub'])) {
                console.log('文件扩展名检查失败:', file.name);
                return false;
            }

            // 移除文件大小限制，允许任意大小的EPUB文件
            if (file.size === 0) {
                console.log('文件大小为0:', file.name);
                return false;
            }

            // 简单的ZIP文件头检查 - 更宽松的验证
            try {
                const buffer = await file.slice(0, 4).arrayBuffer();
                const view = new Uint8Array(buffer);
                
                // ZIP文件魔数: 50 4B 03 04 或 50 4B 05 06 或 50 4B 07 08
                const isZip = (view[0] === 0x50 && view[1] === 0x4B && 
                              (view[2] === 0x03 || view[2] === 0x05 || view[2] === 0x07));
                
                if (!isZip) {
                    console.log('ZIP文件头检查失败:', file.name, 'Header:', Array.from(view).map(b => b.toString(16).padStart(2, '0')).join(' '));
                    // 即使ZIP头检查失败，如果是.epub文件也允许通过
                    return true;
                }
                
                return true;
            } catch (headerError) {
                console.warn('文件头检查出错，但仍允许通过:', headerError);
                return true; // 如果无法读取文件头，但扩展名正确，仍然允许
            }
            
        } catch (error) {
            console.error('EPUB文件验证失败:', error);
            // 验证出错时，如果是.epub文件就允许通过
            return this.isValidFileType(file, ['.epub']);
        }
    }

    /**
     * 批量验证文件
     * @param {FileList|File[]} files - 文件列表
     * @returns {Promise<{valid: File[], invalid: File[]}>} 验证结果
     */
    static async validateFiles(files) {
        const fileArray = Array.from(files);
        const results = await Promise.all(
            fileArray.map(async file => ({
                file,
                isValid: await this.validateEpubFile(file)
            }))
        );

        return {
            valid: results.filter(r => r.isValid).map(r => r.file),
            invalid: results.filter(r => !r.isValid).map(r => r.file)
        };
    }

    /**
     * 错误处理
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     */
    static handleError(error, context = '') {
        console.error(`错误 ${context}:`, error);
        
        let message = '发生未知错误';
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        this.showNotification(`${context ? context + ': ' : ''}${message}`, 'error');
    }

    /**
     * 检查浏览器支持
     * @returns {object} 支持情况
     */
    static checkBrowserSupport() {
        return {
            fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
            dragDrop: 'draggable' in document.createElement('div'),
            jszip: typeof JSZip !== 'undefined',
            promises: typeof Promise !== 'undefined',
            asyncAwait: (function() {
                try {
                    return (function() {}).constructor('return (async () => {})()')().constructor === Promise;
                } catch (e) {
                    return false;
                }
            })()
        };
    }

    /**
     * 初始化浏览器兼容性检查
     */
    static initBrowserCheck() {
        const support = this.checkBrowserSupport();
        const missing = [];

        if (!support.fileApi) missing.push('File API');
        if (!support.dragDrop) missing.push('拖拽功能');
        if (!support.jszip) missing.push('JSZip库');
        if (!support.promises) missing.push('Promise');
        if (!support.asyncAwait) missing.push('Async/Await');

        if (missing.length > 0) {
            this.showNotification(
                `您的浏览器不支持以下功能: ${missing.join(', ')}。建议使用最新版本的Chrome、Firefox或Edge浏览器。`,
                'warning',
                10000
            );
            return false;
        }

        return true;
    }
}

// 导出工具类
window.Utils = Utils;