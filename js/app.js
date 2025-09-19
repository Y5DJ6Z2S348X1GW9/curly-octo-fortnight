// 主应用模块
class EpubToZipApp {
    constructor() {
        // 模块实例
        this.fileHandler = null;
        this.nameProcessor = null;
        this.epubParser = null;
        this.zipGenerator = null;
        this.uiController = null;
        
        // 应用状态
        this.isProcessing = false;
        this.processedResults = new Map(); // 存储处理结果
        this.currentTask = null;
        
        // 配置
        this.config = {
            maxConcurrentTasks: 3,
            compressionLevel: 6,
            enableDebugMode: false
        };
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 检查浏览器兼容性
            if (!Utils.initBrowserCheck()) {
                return;
            }

            // 等待JSZip库加载
            await this.waitForJSZip();
            
            // 初始化模块
            this.initModules();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 显示成功消息
            Utils.showNotification('应用初始化完成', 'success');
            
            if (this.config.enableDebugMode) {
                console.log('EPUB转ZIP工具已启动', this.getAppInfo());
            }
            
        } catch (error) {
            Utils.handleError(error, '应用初始化');
        }
    }

    /**
     * 等待JSZip库加载
     */
    async waitForJSZip() {
        const maxWaitTime = 10000; // 最大等待10秒
        const startTime = Date.now();
        
        while (typeof JSZip === 'undefined') {
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error('JSZip库加载超时，请检查网络连接');
            }
            await Utils.delay(100);
        }
    }

    /**
     * 初始化各个模块
     */
    initModules() {
        // 初始化UI控制器
        this.uiController = new UIController();
        
        // 初始化文件处理器
        this.fileHandler = new FileHandler();
        
        // 初始化文件名处理器
        this.nameProcessor = new NameProcessor();
        
        // 初始化EPUB解析器
        this.epubParser = new EpubParser();
        
        // 初始化ZIP生成器
        this.zipGenerator = new ZipGenerator();
        this.zipGenerator.setMaxConcurrentJobs(this.config.maxConcurrentTasks);
        this.zipGenerator.setCompressionLevel(this.config.compressionLevel);
        
        // 将实例暴露到全局，供HTML中的事件处理器使用
        window.fileHandler = this.fileHandler;
        window.uiController = this.uiController;
        window.app = this;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 文件处理器事件
        this.fileHandler.on('filesAdded', (files) => {
            this.handleFilesAdded(files);
        });

        this.fileHandler.on('fileRemoved', (fileObj) => {
            this.handleFileRemoved(fileObj);
        });

        this.fileHandler.on('filesCleared', () => {
            this.handleFilesCleared();
        });

        // UI控制器事件
        this.uiController.on('startProcessing', () => {
            this.startProcessing();
        });

        this.uiController.on('downloadAll', () => {
            this.downloadAllResults();
        });

        this.uiController.on('downloadSingle', (event) => {
            this.downloadSingleResult(event.detail);
        });

        // 全局错误处理
        window.addEventListener('error', (event) => {
            Utils.handleError(event.error, '全局错误');
        });

        window.addEventListener('unhandledrejection', (event) => {
            Utils.handleError(event.reason, '未处理的Promise拒绝');
        });
    }

    /**
     * 处理文件添加事件
     * @param {object[]} files - 文件数组
     */
    async handleFilesAdded(files) {
        try {
            // 处理文件名并生成输出名称
            const nameMapping = this.nameProcessor.processFileNames(files);
            
            // 更新文件处理器中的输出名称
            this.fileHandler.updateOutputNames(nameMapping);
            
            // 显示文件列表和控制区域
            this.uiController.showFileListSection(true);
            this.uiController.showControlSection(true);
            
            // 滚动到文件列表
            setTimeout(() => {
                this.uiController.scrollToSection('fileListSection');
            }, 300);
            
        } catch (error) {
            Utils.handleError(error, '处理文件添加');
        }
    }

    /**
     * 处理文件移除事件
     * @param {object} fileObj - 文件对象
     */
    handleFileRemoved(fileObj) {
        // 从处理结果中移除
        this.processedResults.delete(fileObj.id);
        
        // 如果没有文件了，隐藏相关区域
        if (this.fileHandler.getFileCount() === 0) {
            this.uiController.showFileListSection(false);
            this.uiController.showControlSection(false);
            this.uiController.showProgressSection(false);
            this.uiController.showResultSection(false);
        }
    }

    /**
     * 处理文件清空事件
     */
    handleFilesCleared() {
        // 清空处理结果
        this.processedResults.clear();
        
        // 重置名称处理器
        this.nameProcessor.reset();
        
        // 重置UI
        this.uiController.resetUI();
    }

    /**
     * 开始处理文件
     */
    async startProcessing() {
        if (this.isProcessing) {
            Utils.showNotification('正在处理中，请稍候...', 'warning');
            return;
        }

        const files = this.fileHandler.getAllFiles();
        if (files.length === 0) {
            Utils.showNotification('请先选择EPUB文件', 'warning');
            return;
        }

        try {
            this.isProcessing = true;
            
            // 更新UI状态
            this.uiController.updateProcessButton('processing', '处理中...');
            this.uiController.showProgressSection(true);
            this.uiController.clearFileProgressList();
            this.uiController.clearResultList();
            
            // 滚动到进度区域
            setTimeout(() => {
                this.uiController.scrollToSection('progressSection');
            }, 300);

            // 初始化进度显示
            files.forEach(fileObj => {
                this.uiController.addFileProgressItem(fileObj.id, fileObj.name, 'waiting');
            });

            // 开始批量处理
            await this.processBatch(files);
            
            // 处理完成
            this.handleProcessingComplete();
            
        } catch (error) {
            Utils.handleError(error, '批量处理');
            this.handleProcessingError(error);
        } finally {
            this.isProcessing = false;
            this.uiController.updateProcessButton('normal', '开始处理');
        }
    }

    /**
     * 批量处理文件
     * @param {object[]} files - 文件数组
     */
    async processBatch(files) {
        const totalFiles = files.length;
        let completedFiles = 0;
        let successfulFiles = 0;

        // 更新整体进度
        this.uiController.updateOverallProgress(0, totalFiles, `0 / ${totalFiles}`);

        // 逐个处理文件
        for (const fileObj of files) {
            try {
                // 更新文件状态为处理中
                this.uiController.updateFileProgressItem(fileObj.id, 'processing', '正在解析EPUB...');
                this.fileHandler.updateFileStatus(fileObj.id, 'processing');

                // 解析EPUB文件
                const parseResult = await this.epubParser.parseEpub(fileObj.file);
                
                if (!parseResult.success) {
                    throw new Error(parseResult.error || '解析失败');
                }

                if (parseResult.images.length === 0) {
                    throw new Error('未找到图片文件');
                }

                // 更新状态
                this.uiController.updateFileProgressItem(fileObj.id, 'processing', '正在生成ZIP...');

                // 生成ZIP文件
                const zipBlob = await this.zipGenerator.generateZipFromImages(
                    parseResult.images,
                    fileObj.outputName,
                    (progress) => {
                        const statusText = progress.status === 'compressing' 
                            ? `压缩中... ${Math.round(progress.percent || 0)}%`
                            : '添加文件中...';
                        this.uiController.updateFileProgressItem(fileObj.id, 'processing', statusText);
                    }
                );

                // 保存处理结果
                const result = {
                    fileId: fileObj.id,
                    fileName: fileObj.outputName,
                    originalName: fileObj.name,
                    blob: zipBlob,
                    size: zipBlob.size,
                    imageCount: parseResult.images.length,
                    metadata: parseResult.metadata,
                    success: true
                };

                this.processedResults.set(fileObj.id, result);

                // 更新状态为完成
                this.uiController.updateFileProgressItem(fileObj.id, 'completed', '处理完成');
                this.fileHandler.updateFileStatus(fileObj.id, 'completed');
                
                successfulFiles++;

            } catch (error) {
                console.error(`处理文件失败 ${fileObj.name}:`, error);
                
                // 更新状态为错误
                this.uiController.updateFileProgressItem(fileObj.id, 'error', error.message);
                this.fileHandler.updateFileStatus(fileObj.id, 'error', { error: error.message });
            }

            // 更新整体进度
            completedFiles++;
            this.uiController.updateOverallProgress(
                completedFiles, 
                totalFiles, 
                `${completedFiles} / ${totalFiles} (成功: ${successfulFiles})`
            );

            // 短暂延迟，避免阻塞UI
            await Utils.delay(50);
        }
    }

    /**
     * 处理完成后的操作
     */
    handleProcessingComplete() {
        const successfulResults = Array.from(this.processedResults.values())
            .filter(result => result.success);

        if (successfulResults.length === 0) {
            Utils.showNotification('没有文件处理成功', 'error');
            return;
        }

        // 显示结果区域
        this.uiController.showResultSection(true);
        
        // 添加结果项
        successfulResults.forEach(result => {
            this.uiController.addResultItem(result);
        });

        // 滚动到结果区域
        setTimeout(() => {
            this.uiController.scrollToSection('resultSection');
        }, 300);

        // 显示完成通知
        Utils.showNotification(
            `处理完成！成功转换 ${successfulResults.length} 个文件`,
            'success',
            5000
        );
    }

    /**
     * 处理错误
     * @param {Error} error - 错误对象
     */
    handleProcessingError(error) {
        Utils.showNotification(`处理过程中发生错误: ${error.message}`, 'error');
        
        // 重置进度显示
        this.uiController.updateOverallProgress(0, 0, '处理失败');
    }

    /**
     * 下载单个结果文件
     * @param {string} fileName - 文件名
     */
    downloadSingleResult(fileName) {
        const result = Array.from(this.processedResults.values())
            .find(r => r.fileName === fileName);

        if (!result) {
            Utils.showNotification('找不到指定的文件', 'error');
            return;
        }

        try {
            Utils.downloadBlob(result.blob, result.fileName);
            Utils.showNotification(`开始下载 ${result.fileName}`, 'success');
        } catch (error) {
            Utils.handleError(error, '下载文件');
        }
    }

    /**
     * 下载所有结果文件
     */
    async downloadAllResults() {
        const successfulResults = Array.from(this.processedResults.values())
            .filter(result => result.success);

        if (successfulResults.length === 0) {
            Utils.showNotification('没有可下载的文件', 'warning');
            return;
        }

        try {
            if (successfulResults.length === 1) {
                // 只有一个文件，直接下载
                const result = successfulResults[0];
                Utils.downloadBlob(result.blob, result.fileName);
                Utils.showNotification(`开始下载 ${result.fileName}`, 'success');
            } else {
                // 多个文件，打包下载
                Utils.showNotification('正在打包文件...', 'info');
                
                const archiveBlob = await this.zipGenerator.createArchive(
                    successfulResults,
                    'epub_converted_files.zip'
                );
                
                Utils.downloadBlob(archiveBlob, 'epub_converted_files.zip');
                Utils.showNotification(
                    `开始下载打包文件 (包含 ${successfulResults.length} 个ZIP文件)`,
                    'success'
                );
            }
        } catch (error) {
            Utils.handleError(error, '批量下载');
        }
    }

    /**
     * 获取应用信息
     * @returns {object} 应用信息
     */
    getAppInfo() {
        return {
            version: '1.0.0',
            modules: {
                fileHandler: !!this.fileHandler,
                nameProcessor: !!this.nameProcessor,
                epubParser: !!this.epubParser,
                zipGenerator: !!this.zipGenerator,
                uiController: !!this.uiController
            },
            config: this.config,
            stats: {
                totalFiles: this.fileHandler ? this.fileHandler.getFileCount() : 0,
                processedFiles: this.processedResults.size,
                isProcessing: this.isProcessing
            }
        };
    }

    /**
     * 获取处理统计信息
     * @returns {object} 统计信息
     */
    getProcessingStats() {
        const results = Array.from(this.processedResults.values());
        const successful = results.filter(r => r.success);
        
        return {
            totalFiles: results.length,
            successfulFiles: successful.length,
            failedFiles: results.length - successful.length,
            totalSize: successful.reduce((sum, r) => sum + r.size, 0),
            totalImages: successful.reduce((sum, r) => sum + r.imageCount, 0),
            averageSize: successful.length > 0 
                ? Math.round(successful.reduce((sum, r) => sum + r.size, 0) / successful.length)
                : 0
        };
    }

    /**
     * 导出处理结果
     * @returns {object} 处理结果数据
     */
    exportResults() {
        const stats = this.getProcessingStats();
        const results = Array.from(this.processedResults.values()).map(result => ({
            originalName: result.originalName,
            outputName: result.fileName,
            success: result.success,
            size: result.size,
            imageCount: result.imageCount,
            metadata: result.metadata
        }));

        return {
            timestamp: new Date().toISOString(),
            stats: stats,
            results: results
        };
    }

    /**
     * 重置应用状态
     */
    reset() {
        if (this.isProcessing) {
            Utils.showNotification('正在处理中，无法重置', 'warning');
            return;
        }

        // 清空文件处理器
        this.fileHandler.clearAllFiles();
        
        // 清空处理结果
        this.processedResults.clear();
        
        // 重置名称处理器
        this.nameProcessor.reset();
        
        // 重置UI
        this.uiController.resetUI();
        
        Utils.showNotification('应用已重置', 'info');
    }

    /**
     * 设置配置
     * @param {object} newConfig - 新配置
     */
    setConfig(newConfig) {
        Object.assign(this.config, newConfig);
        
        // 应用配置到相关模块
        if (this.zipGenerator) {
            if (newConfig.maxConcurrentTasks) {
                this.zipGenerator.setMaxConcurrentJobs(newConfig.maxConcurrentTasks);
            }
            if (newConfig.compressionLevel !== undefined) {
                this.zipGenerator.setCompressionLevel(newConfig.compressionLevel);
            }
        }
    }

    /**
     * 销毁应用
     */
    destroy() {
        // 停止处理
        this.isProcessing = false;
        
        // 销毁模块
        if (this.fileHandler) {
            this.fileHandler.destroy();
        }
        if (this.nameProcessor) {
            this.nameProcessor.reset();
        }
        if (this.zipGenerator) {
            this.zipGenerator.cleanup();
        }
        if (this.uiController) {
            this.uiController.destroy();
        }
        
        // 清空数据
        this.processedResults.clear();
        
        // 清理全局引用
        delete window.fileHandler;
        delete window.uiController;
        delete window.app;
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    // 创建应用实例
    window.epubToZipApp = new EpubToZipApp();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (window.epubToZipApp) {
        window.epubToZipApp.destroy();
    }
});