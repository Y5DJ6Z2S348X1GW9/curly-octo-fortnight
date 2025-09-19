// 文件处理模块
class FileHandler {
    constructor() {
        this.selectedFiles = new Map(); // 存储选中的文件
        this.maxFileSize = Infinity; // 移除文件大小限制
        this.allowedTypes = ['.epub'];
        this.eventListeners = new Map(); // 事件监听器
        
        this.init();
    }

    /**
     * 初始化文件处理器
     */
    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 文件选择按钮
        const selectBtn = document.getElementById('selectBtn');
        const fileInput = document.getElementById('fileInput');
        
        if (selectBtn && fileInput) {
            selectBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        // 清空按钮
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllFiles();
            });
        }
    }

    /**
     * 设置拖拽功能
     */
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;

        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // 拖拽进入和离开的视觉反馈
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            }, false);
        });

        // 处理文件拖放
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelect(files);
        }, false);

        // 全局拖拽处理
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            // 如果不是在上传区域内拖放，则忽略
            if (!uploadArea.contains(e.target)) {
                return;
            }
        });
    }

    /**
     * 阻止默认事件
     * @param {Event} e - 事件对象
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * 处理文件选择
     * @param {FileList} files - 文件列表
     */
    async handleFileSelect(files) {
        if (!files || files.length === 0) return;

        try {
            // 显示加载状态
            this.showLoadingState(true);

            // 验证文件
            const { valid, invalid } = await Utils.validateFiles(files);

            // 处理无效文件
            if (invalid.length > 0) {
                const invalidNames = invalid.map(f => f.name).join(', ');
                console.log('无效文件详情:', invalid);
                Utils.showNotification(
                    `以下文件可能不是有效的EPUB格式: ${invalidNames}`,
                    'warning',
                    5000
                );
            }

            // 添加有效文件
            if (valid.length > 0) {
                await this.addFiles(valid);
                Utils.showNotification(
                    `成功添加 ${valid.length} 个文件`,
                    'success'
                );
            }

        } catch (error) {
            Utils.handleError(error, '文件选择');
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * 添加文件到列表
     * @param {File[]} files - 文件数组
     */
    async addFiles(files) {
        for (const file of files) {
            // 检查是否已存在
            const existingFile = Array.from(this.selectedFiles.values())
                .find(f => f.name === file.name && f.size === file.size);
            
            if (existingFile) {
                Utils.showNotification(
                    `文件 "${file.name}" 已存在`,
                    'warning'
                );
                continue;
            }

            // 生成唯一ID
            const fileId = Utils.generateId();
            
            // 创建文件对象
            const fileObj = {
                id: fileId,
                file: file,
                name: file.name,
                size: file.size,
                status: 'waiting', // waiting, processing, completed, error
                outputName: '', // 将在nameProcessor中生成
                progress: 0,
                error: null
            };

            // 添加到集合
            this.selectedFiles.set(fileId, fileObj);
        }

        // 更新UI
        this.updateFileList();
        this.updateControlsVisibility();
        
        // 触发文件添加事件
        this.emit('filesAdded', Array.from(this.selectedFiles.values()));
    }

    /**
     * 移除文件
     * @param {string} fileId - 文件ID
     */
    removeFile(fileId) {
        if (this.selectedFiles.has(fileId)) {
            const fileObj = this.selectedFiles.get(fileId);
            this.selectedFiles.delete(fileId);
            
            // 更新UI
            this.updateFileList();
            this.updateControlsVisibility();
            
            // 触发文件移除事件
            this.emit('fileRemoved', fileObj);
            
            Utils.showNotification(
                `已移除文件 "${fileObj.name}"`,
                'info'
            );
        }
    }

    /**
     * 清空所有文件
     */
    clearAllFiles() {
        const count = this.selectedFiles.size;
        this.selectedFiles.clear();
        
        // 更新UI
        this.updateFileList();
        this.updateControlsVisibility();
        
        // 触发清空事件
        this.emit('filesCleared');
        
        if (count > 0) {
            Utils.showNotification(
                `已清空 ${count} 个文件`,
                'info'
            );
        }
    }

    /**
     * 更新文件列表UI
     */
    updateFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        // 清空现有内容
        fileList.innerHTML = '';

        // 如果没有文件，隐藏文件列表区域
        if (this.selectedFiles.size === 0) {
            return;
        }

        // 创建文件卡片
        const files = Array.from(this.selectedFiles.values());
        files.forEach((fileObj, index) => {
            const fileCard = this.createFileCard(fileObj, index);
            fileList.appendChild(fileCard);
        });
    }

    /**
     * 创建文件卡片
     * @param {object} fileObj - 文件对象
     * @param {number} index - 索引
     * @returns {HTMLElement} 文件卡片元素
     */
    createFileCard(fileObj, index) {
        const card = document.createElement('div');
        card.className = 'file-card enter-animation';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="file-card-header">
                <div class="file-info">
                    <div class="file-name" title="${fileObj.name}">${fileObj.name}</div>
                    <div class="file-size">${Utils.formatFileSize(fileObj.size)}</div>
                </div>
                <div class="file-actions">
                    <button class="remove-btn" onclick="window.fileHandler.removeFile('${fileObj.id}')" 
                            title="移除文件">×</button>
                </div>
            </div>
            <div class="file-card-footer">
                <div class="output-name">
                    输出: <strong>${fileObj.outputName || '待生成...'}</strong>
                </div>
                <div class="status-indicator ${fileObj.status}">
                    ${this.getStatusText(fileObj.status)}
                </div>
            </div>
        `;

        return card;
    }

    /**
     * 获取状态文本
     * @param {string} status - 状态
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            waiting: '等待处理',
            processing: '处理中',
            completed: '已完成',
            error: '处理失败'
        };
        return statusMap[status] || '未知状态';
    }

    /**
     * 更新控件可见性
     */
    updateControlsVisibility() {
        const fileListSection = document.getElementById('fileListSection');
        const controlSection = document.getElementById('controlSection');
        
        const hasFiles = this.selectedFiles.size > 0;
        
        if (fileListSection) {
            fileListSection.style.display = hasFiles ? 'block' : 'none';
        }
        
        if (controlSection) {
            controlSection.style.display = hasFiles ? 'block' : 'none';
        }
    }

    /**
     * 显示加载状态
     * @param {boolean} loading - 是否加载中
     */
    showLoadingState(loading) {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;

        if (loading) {
            uploadArea.style.opacity = '0.6';
            uploadArea.style.pointerEvents = 'none';
        } else {
            uploadArea.style.opacity = '1';
            uploadArea.style.pointerEvents = 'auto';
        }
    }

    /**
     * 获取所有文件
     * @returns {object[]} 文件对象数组
     */
    getAllFiles() {
        return Array.from(this.selectedFiles.values());
    }

    /**
     * 获取文件数量
     * @returns {number} 文件数量
     */
    getFileCount() {
        return this.selectedFiles.size;
    }

    /**
     * 根据ID获取文件
     * @param {string} fileId - 文件ID
     * @returns {object|null} 文件对象
     */
    getFileById(fileId) {
        return this.selectedFiles.get(fileId) || null;
    }

    /**
     * 更新文件状态
     * @param {string} fileId - 文件ID
     * @param {string} status - 新状态
     * @param {object} data - 额外数据
     */
    updateFileStatus(fileId, status, data = {}) {
        const fileObj = this.selectedFiles.get(fileId);
        if (!fileObj) return;

        fileObj.status = status;
        Object.assign(fileObj, data);

        // 更新UI
        this.updateFileList();
        
        // 触发状态更新事件
        this.emit('fileStatusUpdated', { fileId, status, data });
    }

    /**
     * 批量更新输出文件名
     * @param {object[]} nameMapping - 名称映射数组
     */
    updateOutputNames(nameMapping) {
        nameMapping.forEach(({ fileId, outputName }) => {
            const fileObj = this.selectedFiles.get(fileId);
            if (fileObj) {
                fileObj.outputName = outputName;
            }
        });

        // 更新UI
        this.updateFileList();
    }

    /**
     * 事件发射器
     * @param {string} eventName - 事件名称
     * @param {any} data - 事件数据
     */
    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`事件监听器错误 (${eventName}):`, error);
            }
        });
    }

    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(eventName, callback) {
        const listeners = this.eventListeners.get(eventName) || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * 销毁文件处理器
     */
    destroy() {
        this.selectedFiles.clear();
        this.eventListeners.clear();
        
        // 清理UI
        this.updateFileList();
        this.updateControlsVisibility();
    }
}

// 导出文件处理器类
window.FileHandler = FileHandler;