// UI控制模块
class UIController {
    constructor() {
        this.elements = {};
        this.currentSection = 'upload';
        this.animationQueue = [];
        this.isAnimating = false;
        
        this.init();
    }

    /**
     * 初始化UI控制器
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.initializeAnimations();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 主要区域
            uploadSection: document.getElementById('uploadArea'),
            fileListSection: document.getElementById('fileListSection'),
            controlSection: document.getElementById('controlSection'),
            progressSection: document.getElementById('progressSection'),
            resultSection: document.getElementById('resultSection'),
            
            // 列表容器
            fileList: document.getElementById('fileList'),
            fileProgressList: document.getElementById('fileProgressList'),
            resultList: document.getElementById('resultList'),
            
            // 按钮
            processBtn: document.getElementById('processBtn'),
            clearBtn: document.getElementById('clearBtn'),
            downloadAllBtn: document.getElementById('downloadAllBtn'),
            
            // 进度相关
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            
            // 其他
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 处理按钮点击
        if (this.elements.processBtn) {
            this.elements.processBtn.addEventListener('click', () => {
                this.emit('startProcessing');
            });
        }

        // 全部下载按钮
        if (this.elements.downloadAllBtn) {
            this.elements.downloadAllBtn.addEventListener('click', () => {
                this.emit('downloadAll');
            });
        }

        // 窗口大小变化
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * 初始化动画
     */
    initializeAnimations() {
        // 为现有元素添加进入动画
        const animatedElements = document.querySelectorAll('.upload-section, .header');
        animatedElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.6s ease-out';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * 显示文件列表区域
     * @param {boolean} show - 是否显示
     */
    showFileListSection(show = true) {
        if (!this.elements.fileListSection) return;

        if (show) {
            this.elements.fileListSection.style.display = 'block';
            this.elements.fileListSection.classList.add('animate-fadeInUp');
        } else {
            this.elements.fileListSection.style.display = 'none';
            this.elements.fileListSection.classList.remove('animate-fadeInUp');
        }
    }

    /**
     * 显示控制区域
     * @param {boolean} show - 是否显示
     */
    showControlSection(show = true) {
        if (!this.elements.controlSection) return;

        if (show) {
            this.elements.controlSection.style.display = 'block';
            this.elements.controlSection.classList.add('animate-fadeInUp');
        } else {
            this.elements.controlSection.style.display = 'none';
            this.elements.controlSection.classList.remove('animate-fadeInUp');
        }
    }

    /**
     * 显示进度区域
     * @param {boolean} show - 是否显示
     */
    showProgressSection(show = true) {
        if (!this.elements.progressSection) return;

        if (show) {
            this.elements.progressSection.style.display = 'block';
            this.elements.progressSection.classList.add('animate-slideInUp');
            this.currentSection = 'progress';
        } else {
            this.elements.progressSection.style.display = 'none';
            this.elements.progressSection.classList.remove('animate-slideInUp');
        }
    }

    /**
     * 显示结果区域
     * @param {boolean} show - 是否显示
     */
    showResultSection(show = true) {
        if (!this.elements.resultSection) return;

        if (show) {
            this.elements.resultSection.style.display = 'block';
            this.elements.resultSection.classList.add('animate-fadeInUp');
            this.currentSection = 'result';
        } else {
            this.elements.resultSection.style.display = 'none';
            this.elements.resultSection.classList.remove('animate-fadeInUp');
        }
    }

    /**
     * 更新处理按钮状态
     * @param {string} state - 按钮状态 (normal, processing, disabled)
     * @param {string} text - 按钮文本
     */
    updateProcessButton(state = 'normal', text = '开始处理') {
        if (!this.elements.processBtn) return;

        const btn = this.elements.processBtn;
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        // 移除所有状态类
        btn.classList.remove('processing', 'disabled');
        
        switch (state) {
            case 'processing':
                btn.classList.add('processing');
                btn.disabled = true;
                if (btnText) btnText.textContent = text;
                if (btnLoader) btnLoader.style.display = 'block';
                break;
                
            case 'disabled':
                btn.classList.add('disabled');
                btn.disabled = true;
                if (btnText) btnText.textContent = text;
                if (btnLoader) btnLoader.style.display = 'none';
                break;
                
            default: // normal
                btn.disabled = false;
                if (btnText) btnText.textContent = text;
                if (btnLoader) btnLoader.style.display = 'none';
                break;
        }
    }

    /**
     * 更新整体进度
     * @param {number} current - 当前进度
     * @param {number} total - 总数
     * @param {string} text - 进度文本
     */
    updateOverallProgress(current, total, text = '') {
        if (!this.elements.progressFill || !this.elements.progressText) return;

        const percentage = total > 0 ? (current / total) * 100 : 0;
        
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = text || `${current} / ${total}`;

        // 添加进度动画类
        if (percentage > 0) {
            this.elements.progressFill.classList.add('progress-animated');
        }
    }

    /**
     * 添加文件进度项
     * @param {string} fileId - 文件ID
     * @param {string} fileName - 文件名
     * @param {string} status - 状态
     */
    addFileProgressItem(fileId, fileName, status = 'waiting') {
        if (!this.elements.fileProgressList) return;

        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item enter-animation';
        progressItem.id = `progress-${fileId}`;
        
        progressItem.innerHTML = `
            <div class="progress-icon ${status}">
                ${this.getStatusIcon(status)}
            </div>
            <div class="progress-info">
                <div class="progress-filename">${fileName}</div>
                <div class="progress-status">${this.getStatusText(status)}</div>
            </div>
        `;

        this.elements.fileProgressList.appendChild(progressItem);
    }

    /**
     * 更新文件进度项状态
     * @param {string} fileId - 文件ID
     * @param {string} status - 新状态
     * @param {string} message - 状态消息
     */
    updateFileProgressItem(fileId, status, message = '') {
        const progressItem = document.getElementById(`progress-${fileId}`);
        if (!progressItem) return;

        const icon = progressItem.querySelector('.progress-icon');
        const statusEl = progressItem.querySelector('.progress-status');

        if (icon) {
            icon.className = `progress-icon ${status}`;
            icon.innerHTML = this.getStatusIcon(status);
        }

        if (statusEl) {
            statusEl.textContent = message || this.getStatusText(status);
        }

        // 更新进度项样式
        progressItem.className = `progress-item ${status}`;

        // 添加动画效果
        if (status === 'completed') {
            progressItem.classList.add('success-animation');
        } else if (status === 'error') {
            progressItem.classList.add('error-animation');
        }
    }

    /**
     * 清空文件进度列表
     */
    clearFileProgressList() {
        if (this.elements.fileProgressList) {
            this.elements.fileProgressList.innerHTML = '';
        }
    }

    /**
     * 添加结果项
     * @param {object} result - 结果对象
     */
    addResultItem(result) {
        if (!this.elements.resultList) return;

        const resultItem = document.createElement('div');
        resultItem.className = 'result-item enter-animation';
        
        resultItem.innerHTML = `
            <div class="result-info">
                <div class="result-filename">${result.fileName}</div>
                <div class="result-details">
                    ${result.imageCount} 张图片 • ${Utils.formatFileSize(result.size)}
                </div>
            </div>
            <button class="download-btn" onclick="window.uiController.downloadResult('${result.fileName}')">
                下载
            </button>
        `;

        this.elements.resultList.appendChild(resultItem);
    }

    /**
     * 清空结果列表
     */
    clearResultList() {
        if (this.elements.resultList) {
            this.elements.resultList.innerHTML = '';
        }
    }

    /**
     * 显示加载遮罩
     * @param {boolean} show - 是否显示
     * @param {string} message - 加载消息
     */
    showLoadingOverlay(show = true, message = '正在加载...') {
        if (!this.elements.loadingOverlay) return;

        if (show) {
            this.elements.loadingOverlay.style.display = 'flex';
            const messageEl = this.elements.loadingOverlay.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
        } else {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    /**
     * 获取状态图标
     * @param {string} status - 状态
     * @returns {string} 图标HTML
     */
    getStatusIcon(status) {
        const icons = {
            waiting: '⏳',
            processing: '<div class="animate-spin">⚙️</div>',
            completed: '✅',
            error: '❌'
        };
        return icons[status] || '❓';
    }

    /**
     * 获取状态文本
     * @param {string} status - 状态
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const texts = {
            waiting: '等待处理',
            processing: '处理中...',
            completed: '处理完成',
            error: '处理失败'
        };
        return texts[status] || '未知状态';
    }

    /**
     * 显示通知
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型
     * @param {number} duration - 显示时长
     */
    showNotification(message, type = 'info', duration = 3000) {
        Utils.showNotification(message, type, duration);
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 响应式调整
        const width = window.innerWidth;
        
        if (width < 768) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    }

    /**
     * 处理键盘快捷键
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter: 开始处理
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (this.elements.processBtn && !this.elements.processBtn.disabled) {
                this.elements.processBtn.click();
            }
        }

        // Escape: 清空文件列表
        if (e.key === 'Escape' && this.currentSection === 'upload') {
            if (this.elements.clearBtn) {
                this.elements.clearBtn.click();
            }
        }
    }

    /**
     * 滚动到指定区域
     * @param {string} sectionId - 区域ID
     */
    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * 添加CSS动画类
     * @param {HTMLElement} element - 元素
     * @param {string} animationClass - 动画类名
     * @param {number} duration - 动画持续时间
     */
    addAnimation(element, animationClass, duration = 600) {
        if (!element) return;

        element.classList.add(animationClass);
        
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }

    /**
     * 批量添加动画
     * @param {NodeList|Array} elements - 元素列表
     * @param {string} animationClass - 动画类名
     * @param {number} delay - 延迟时间
     */
    addStaggeredAnimation(elements, animationClass, delay = 100) {
        elements.forEach((element, index) => {
            setTimeout(() => {
                this.addAnimation(element, animationClass);
            }, index * delay);
        });
    }

    /**
     * 重置UI到初始状态
     */
    resetUI() {
        // 隐藏所有区域
        this.showFileListSection(false);
        this.showControlSection(false);
        this.showProgressSection(false);
        this.showResultSection(false);
        
        // 清空列表
        this.clearFileProgressList();
        this.clearResultList();
        
        // 重置按钮状态
        this.updateProcessButton('normal', '开始处理');
        
        // 重置进度
        this.updateOverallProgress(0, 0, '0 / 0');
        
        // 隐藏加载遮罩
        this.showLoadingOverlay(false);
        
        this.currentSection = 'upload';
    }

    /**
     * 事件发射器
     * @param {string} eventName - 事件名称
     * @param {any} data - 事件数据
     */
    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(eventName, callback) {
        document.addEventListener(eventName, callback);
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(eventName, callback) {
        document.removeEventListener(eventName, callback);
    }

    /**
     * 下载结果文件（由结果项调用）
     * @param {string} fileName - 文件名
     */
    downloadResult(fileName) {
        this.emit('downloadSingle', fileName);
    }

    /**
     * 获取当前UI状态
     * @returns {object} UI状态
     */
    getState() {
        return {
            currentSection: this.currentSection,
            isAnimating: this.isAnimating,
            visibleSections: {
                fileList: this.elements.fileListSection?.style.display !== 'none',
                control: this.elements.controlSection?.style.display !== 'none',
                progress: this.elements.progressSection?.style.display !== 'none',
                result: this.elements.resultSection?.style.display !== 'none'
            }
        };
    }

    /**
     * 销毁UI控制器
     */
    destroy() {
        // 清理事件监听器
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        // 重置UI
        this.resetUI();
        
        // 清空缓存
        this.elements = {};
        this.animationQueue = [];
    }
}

// 导出UI控制器类
window.UIController = UIController;