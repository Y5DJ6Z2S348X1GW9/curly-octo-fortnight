// ZIP生成模块
class ZipGenerator {
    constructor() {
        this.compressionLevel = 6; // 压缩级别 (0-9)
        this.maxConcurrentJobs = 3; // 最大并发任务数
        this.currentJobs = 0;
        this.jobQueue = [];
    }

    /**
     * 从图片数组生成ZIP文件
     * @param {object[]} images - 图片数组
     * @param {string} fileName - ZIP文件名
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Promise<Blob>} ZIP文件Blob
     */
    async generateZipFromImages(images, fileName, progressCallback) {
        try {
            if (!images || images.length === 0) {
                throw new Error('没有图片可以打包');
            }

            // 创建新的JSZip实例
            const zip = new JSZip();
            
            // 添加图片到ZIP
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                
                // 更新进度
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: images.length,
                        fileName: image.fileName,
                        status: 'adding'
                    });
                }

                // 生成唯一文件名（避免重复）
                const uniqueFileName = this.generateUniqueFileName(zip, image.fileName);
                
                // 添加文件到ZIP
                zip.file(uniqueFileName, image.blob, {
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: this.compressionLevel
                    }
                });

                // 短暂延迟，避免阻塞UI
                if (i % 10 === 0) {
                    await Utils.delay(1);
                }
            }

            // 生成ZIP文件
            if (progressCallback) {
                progressCallback({
                    current: images.length,
                    total: images.length,
                    fileName: fileName,
                    status: 'compressing'
                });
            }

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: this.compressionLevel
                }
            }, (metadata) => {
                // ZIP生成进度回调
                if (progressCallback) {
                    progressCallback({
                        current: Math.round(metadata.percent),
                        total: 100,
                        fileName: fileName,
                        status: 'compressing',
                        percent: metadata.percent
                    });
                }
            });

            return zipBlob;

        } catch (error) {
            console.error('生成ZIP文件失败:', error);
            throw new Error(`生成ZIP文件失败: ${error.message}`);
        }
    }

    /**
     * 生成唯一文件名
     * @param {JSZip} zip - JSZip实例
     * @param {string} originalName - 原始文件名
     * @returns {string} 唯一文件名
     */
    generateUniqueFileName(zip, originalName) {
        let fileName = originalName;
        let counter = 1;

        // 如果文件名已存在，添加数字后缀
        while (zip.file(fileName)) {
            const nameWithoutExt = Utils.removeFileExtension(originalName);
            const extension = Utils.getFileExtension(originalName);
            fileName = `${nameWithoutExt}_${counter}.${extension}`;
            counter++;
        }

        return fileName;
    }

    /**
     * 批量生成ZIP文件
     * @param {object[]} tasks - 任务数组，每个任务包含 {images, fileName}
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Promise<object[]>} 生成结果数组
     */
    async generateMultipleZips(tasks, progressCallback) {
        const results = [];
        const total = tasks.length;

        // 使用队列控制并发数量
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            
            try {
                // 等待可用的并发槽位
                await this.waitForAvailableSlot();
                
                // 开始任务
                this.currentJobs++;
                
                const result = await this.generateZipFromImages(
                    task.images,
                    task.fileName,
                    (progress) => {
                        if (progressCallback) {
                            progressCallback({
                                taskIndex: i,
                                taskTotal: total,
                                taskName: task.fileName,
                                ...progress
                            });
                        }
                    }
                );

                results.push({
                    success: true,
                    fileName: task.fileName,
                    blob: result,
                    size: result.size,
                    imageCount: task.images.length
                });

            } catch (error) {
                console.error(`生成ZIP失败 ${task.fileName}:`, error);
                results.push({
                    success: false,
                    fileName: task.fileName,
                    error: error.message,
                    blob: null,
                    size: 0,
                    imageCount: task.images ? task.images.length : 0
                });
            } finally {
                this.currentJobs--;
            }
        }

        return results;
    }

    /**
     * 等待可用的并发槽位
     * @returns {Promise<void>}
     */
    async waitForAvailableSlot() {
        while (this.currentJobs >= this.maxConcurrentJobs) {
            await Utils.delay(100);
        }
    }

    /**
     * 创建包含所有ZIP文件的总压缩包
     * @param {object[]} zipResults - ZIP生成结果数组
     * @param {string} archiveName - 总压缩包名称
     * @returns {Promise<Blob>} 总压缩包Blob
     */
    async createArchive(zipResults, archiveName = 'epub_converted_files.zip') {
        try {
            const archive = new JSZip();
            
            // 添加所有成功生成的ZIP文件
            const successfulResults = zipResults.filter(result => result.success && result.blob);
            
            if (successfulResults.length === 0) {
                throw new Error('没有成功生成的ZIP文件可以打包');
            }

            for (const result of successfulResults) {
                archive.file(result.fileName, result.blob);
            }

            // 生成总压缩包
            const archiveBlob = await archive.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: this.compressionLevel
                }
            });

            return archiveBlob;

        } catch (error) {
            console.error('创建总压缩包失败:', error);
            throw new Error(`创建总压缩包失败: ${error.message}`);
        }
    }

    /**
     * 验证图片数据
     * @param {object[]} images - 图片数组
     * @returns {object} 验证结果
     */
    validateImages(images) {
        const issues = [];
        
        if (!Array.isArray(images)) {
            issues.push({
                type: 'invalid_input',
                message: '图片数据不是数组'
            });
            return { isValid: false, issues };
        }

        if (images.length === 0) {
            issues.push({
                type: 'empty_array',
                message: '图片数组为空'
            });
        }

        let totalSize = 0;
        const fileNames = new Set();

        images.forEach((image, index) => {
            // 检查必需字段
            if (!image.blob) {
                issues.push({
                    type: 'missing_blob',
                    message: `图片 ${index + 1} 缺少blob数据`,
                    index
                });
            }

            if (!image.fileName) {
                issues.push({
                    type: 'missing_filename',
                    message: `图片 ${index + 1} 缺少文件名`,
                    index
                });
            }

            // 检查文件名重复
            if (image.fileName && fileNames.has(image.fileName)) {
                issues.push({
                    type: 'duplicate_filename',
                    message: `重复的文件名: ${image.fileName}`,
                    index
                });
            }
            if (image.fileName) {
                fileNames.add(image.fileName);
            }

            // 检查文件大小
            if (image.blob && image.blob.size > 0) {
                totalSize += image.blob.size;
            }

            // 移除超大文件限制，允许任意大小的图片文件
            // 只在文件特别大时给出提示，但不阻止处理
            if (image.blob && image.blob.size > 500 * 1024 * 1024) {
                console.warn(`检测到大文件: ${image.fileName} (${Utils.formatFileSize(image.blob.size)})`);
            }
        });

        // 移除总大小限制，只记录信息
        if (totalSize > 1024 * 1024 * 1024) { // 1GB
            console.info(`处理大量数据: ${Utils.formatFileSize(totalSize)}`);
        }

        return {
            isValid: issues.length === 0,
            issues,
            totalSize,
            fileCount: images.length,
            uniqueFileNames: fileNames.size
        };
    }

    /**
     * 获取压缩统计信息
     * @param {object[]} images - 原始图片数组
     * @param {Blob} zipBlob - 压缩后的ZIP文件
     * @returns {object} 压缩统计信息
     */
    getCompressionStats(images, zipBlob) {
        const originalSize = images.reduce((sum, img) => sum + (img.size || img.blob.size || 0), 0);
        const compressedSize = zipBlob.size;
        const compressionRatio = originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0;

        return {
            originalSize,
            compressedSize,
            compressionRatio: Math.round(compressionRatio * 100) / 100,
            savedBytes: originalSize - compressedSize,
            fileCount: images.length
        };
    }

    /**
     * 设置压缩级别
     * @param {number} level - 压缩级别 (0-9)
     */
    setCompressionLevel(level) {
        if (level >= 0 && level <= 9) {
            this.compressionLevel = level;
        } else {
            console.warn('压缩级别必须在0-9之间');
        }
    }

    /**
     * 设置最大并发任务数
     * @param {number} maxJobs - 最大并发任务数
     */
    setMaxConcurrentJobs(maxJobs) {
        if (maxJobs > 0) {
            this.maxConcurrentJobs = maxJobs;
        } else {
            console.warn('最大并发任务数必须大于0');
        }
    }

    /**
     * 获取当前状态
     * @returns {object} 当前状态
     */
    getStatus() {
        return {
            currentJobs: this.currentJobs,
            maxConcurrentJobs: this.maxConcurrentJobs,
            queueLength: this.jobQueue.length,
            compressionLevel: this.compressionLevel
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.currentJobs = 0;
        this.jobQueue = [];
    }

    /**
     * 测试ZIP生成功能
     * @returns {Promise<boolean>} 测试结果
     */
    async testZipGeneration() {
        try {
            // 创建测试图片数据
            const testImageData = new Uint8Array([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
            ]);
            const testBlob = new Blob([testImageData], { type: 'image/jpeg' });
            
            const testImages = [{
                fileName: 'test.jpg',
                blob: testBlob,
                size: testBlob.size
            }];

            // 尝试生成ZIP
            const zipBlob = await this.generateZipFromImages(testImages, 'test.zip');
            
            return zipBlob && zipBlob.size > 0;
        } catch (error) {
            console.error('ZIP生成测试失败:', error);
            return false;
        }
    }
}

// 导出ZIP生成器类
window.ZipGenerator = ZipGenerator;