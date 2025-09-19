// EPUB解析模块
class EpubParser {
    constructor() {
        this.supportedImageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/webp', 'image/bmp', 'image/svg+xml'
        ];
        this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    }

    /**
     * 解析EPUB文件并提取图片
     * @param {File} file - EPUB文件
     * @returns {Promise<object>} 解析结果
     */
    async parseEpub(file) {
        try {
            // 使用JSZip读取EPUB文件
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            
            // 验证EPUB结构
            await this.validateEpubStructure(zipContent);
            
            // 提取图片文件
            const images = await this.extractImages(zipContent);
            
            // 获取元数据
            const metadata = await this.extractMetadata(zipContent);
            
            return {
                success: true,
                images: images,
                metadata: metadata,
                totalImages: images.length,
                totalSize: images.reduce((sum, img) => sum + (img.size || 0), 0)
            };
            
        } catch (error) {
            console.error('EPUB解析失败:', error);
            return {
                success: false,
                error: error.message || '解析失败',
                images: [],
                metadata: null,
                totalImages: 0,
                totalSize: 0
            };
        }
    }

    /**
     * 验证EPUB文件结构
     * @param {JSZip} zipContent - ZIP内容
     */
    async validateEpubStructure(zipContent) {
        // 检查mimetype文件
        const mimetypeFile = zipContent.file('mimetype');
        if (mimetypeFile) {
            const mimetype = await mimetypeFile.async('text');
            if (mimetype.trim() !== 'application/epub+zip') {
                console.warn('EPUB mimetype不正确:', mimetype);
            }
        }

        // 检查META-INF/container.xml
        const containerFile = zipContent.file('META-INF/container.xml');
        if (!containerFile) {
            throw new Error('缺少META-INF/container.xml文件');
        }

        // 基本结构验证通过
        return true;
    }

    /**
     * 提取图片文件
     * @param {JSZip} zipContent - ZIP内容
     * @returns {Promise<object[]>} 图片文件数组
     */
    async extractImages(zipContent) {
        const images = [];
        const imageFiles = [];

        // 遍历所有文件，查找图片
        zipContent.forEach((relativePath, file) => {
            if (!file.dir && this.isImageFile(relativePath)) {
                imageFiles.push({
                    path: relativePath,
                    file: file
                });
            }
        });

        // 按路径排序，确保顺序一致
        imageFiles.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN', { numeric: true }));

        // 提取图片数据
        for (const { path, file } of imageFiles) {
            try {
                const imageData = await this.extractImageData(path, file);
                if (imageData) {
                    images.push(imageData);
                }
            } catch (error) {
                console.warn(`提取图片失败 ${path}:`, error);
                // 继续处理其他图片，不中断整个过程
            }
        }

        return images;
    }

    /**
     * 提取单个图片数据
     * @param {string} path - 图片路径
     * @param {JSZipObject} file - JSZip文件对象
     * @returns {Promise<object>} 图片数据
     */
    async extractImageData(path, file) {
        try {
            // 获取图片二进制数据
            const arrayBuffer = await file.async('arraybuffer');
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // 检测图片类型
            const mimeType = this.detectImageType(uint8Array, path);
            
            // 生成文件名
            const fileName = this.generateImageFileName(path);
            
            // 创建Blob对象
            const blob = new Blob([uint8Array], { type: mimeType });
            
            return {
                originalPath: path,
                fileName: fileName,
                blob: blob,
                size: arrayBuffer.byteLength,
                mimeType: mimeType,
                width: null, // 可以后续添加图片尺寸检测
                height: null
            };
            
        } catch (error) {
            console.error(`处理图片失败 ${path}:`, error);
            return null;
        }
    }

    /**
     * 检查是否为图片文件
     * @param {string} path - 文件路径
     * @returns {boolean} 是否为图片文件
     */
    isImageFile(path) {
        const lowerPath = path.toLowerCase();
        
        // 检查文件扩展名
        const hasImageExtension = this.imageExtensions.some(ext => 
            lowerPath.endsWith(ext)
        );
        
        // 检查是否在常见的图片目录中
        const isInImageDirectory = /\/(images?|pics?|graphics?|assets?|media)\//i.test(path);
        
        // 排除缩略图和封面（通常很小，不是主要内容）
        const isNotThumbnail = !/thumb|thumbnail|cover|icon/i.test(lowerPath);
        
        return hasImageExtension && (isInImageDirectory || isNotThumbnail);
    }

    /**
     * 检测图片类型
     * @param {Uint8Array} data - 图片数据
     * @param {string} path - 文件路径
     * @returns {string} MIME类型
     */
    detectImageType(data, path) {
        // 通过文件头检测图片类型
        if (data.length < 4) {
            return this.getMimeTypeFromExtension(path);
        }

        // JPEG: FF D8 FF
        if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
            return 'image/jpeg';
        }

        // PNG: 89 50 4E 47
        if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
            return 'image/png';
        }

        // GIF: 47 49 46 38
        if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
            return 'image/gif';
        }

        // WebP: 52 49 46 46 ... 57 45 42 50
        if (data.length >= 12 && 
            data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
            data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
            return 'image/webp';
        }

        // BMP: 42 4D
        if (data[0] === 0x42 && data[1] === 0x4D) {
            return 'image/bmp';
        }

        // SVG: 检查是否包含SVG标签
        const textContent = new TextDecoder('utf-8').decode(data.slice(0, Math.min(1000, data.length)));
        if (textContent.includes('<svg') || textContent.includes('<?xml')) {
            return 'image/svg+xml';
        }

        // 如果无法通过文件头检测，使用扩展名
        return this.getMimeTypeFromExtension(path);
    }

    /**
     * 根据文件扩展名获取MIME类型
     * @param {string} path - 文件路径
     * @returns {string} MIME类型
     */
    getMimeTypeFromExtension(path) {
        const extension = path.toLowerCase().split('.').pop();
        const mimeMap = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml'
        };
        return mimeMap[extension] || 'image/jpeg';
    }

    /**
     * 生成图片文件名
     * @param {string} originalPath - 原始路径
     * @returns {string} 生成的文件名
     */
    generateImageFileName(originalPath) {
        // 提取原始文件名
        const pathParts = originalPath.split('/');
        const originalFileName = pathParts[pathParts.length - 1];
        
        // 如果原始文件名合理，直接使用
        if (originalFileName && originalFileName.length > 0 && originalFileName !== '.') {
            return originalFileName;
        }
        
        // 否则生成一个基于路径的文件名
        const cleanPath = originalPath.replace(/[^a-zA-Z0-9._-]/g, '_');
        const extension = this.getFileExtension(originalPath) || 'jpg';
        return `image_${cleanPath}.${extension}`;
    }

    /**
     * 获取文件扩展名
     * @param {string} path - 文件路径
     * @returns {string} 扩展名
     */
    getFileExtension(path) {
        const match = path.match(/\.([^.]+)$/);
        return match ? match[1].toLowerCase() : '';
    }

    /**
     * 提取EPUB元数据
     * @param {JSZip} zipContent - ZIP内容
     * @returns {Promise<object>} 元数据
     */
    async extractMetadata(zipContent) {
        try {
            // 读取container.xml获取OPF文件路径
            const containerFile = zipContent.file('META-INF/container.xml');
            if (!containerFile) {
                return this.getDefaultMetadata();
            }

            const containerXml = await containerFile.async('text');
            const opfPath = this.extractOpfPath(containerXml);
            
            if (!opfPath) {
                return this.getDefaultMetadata();
            }

            // 读取OPF文件
            const opfFile = zipContent.file(opfPath);
            if (!opfFile) {
                return this.getDefaultMetadata();
            }

            const opfXml = await opfFile.async('text');
            return this.parseOpfMetadata(opfXml);
            
        } catch (error) {
            console.warn('提取元数据失败:', error);
            return this.getDefaultMetadata();
        }
    }

    /**
     * 从container.xml中提取OPF文件路径
     * @param {string} containerXml - container.xml内容
     * @returns {string|null} OPF文件路径
     */
    extractOpfPath(containerXml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(containerXml, 'text/xml');
            const rootfile = doc.querySelector('rootfile[media-type="application/oebps-package+xml"]');
            return rootfile ? rootfile.getAttribute('full-path') : null;
        } catch (error) {
            console.warn('解析container.xml失败:', error);
            return null;
        }
    }

    /**
     * 解析OPF文件元数据
     * @param {string} opfXml - OPF文件内容
     * @returns {object} 元数据
     */
    parseOpfMetadata(opfXml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(opfXml, 'text/xml');
            
            const metadata = {
                title: this.getMetadataValue(doc, 'title') || '未知标题',
                creator: this.getMetadataValue(doc, 'creator') || '未知作者',
                language: this.getMetadataValue(doc, 'language') || 'zh',
                publisher: this.getMetadataValue(doc, 'publisher') || '',
                date: this.getMetadataValue(doc, 'date') || '',
                description: this.getMetadataValue(doc, 'description') || '',
                identifier: this.getMetadataValue(doc, 'identifier') || ''
            };
            
            return metadata;
        } catch (error) {
            console.warn('解析OPF元数据失败:', error);
            return this.getDefaultMetadata();
        }
    }

    /**
     * 获取元数据值
     * @param {Document} doc - XML文档
     * @param {string} tagName - 标签名
     * @returns {string} 元数据值
     */
    getMetadataValue(doc, tagName) {
        const element = doc.querySelector(`metadata ${tagName}, metadata dc\\:${tagName}`);
        return element ? element.textContent.trim() : '';
    }

    /**
     * 获取默认元数据
     * @returns {object} 默认元数据
     */
    getDefaultMetadata() {
        return {
            title: '未知标题',
            creator: '未知作者',
            language: 'zh',
            publisher: '',
            date: '',
            description: '',
            identifier: ''
        };
    }

    /**
     * 批量解析EPUB文件
     * @param {File[]} files - EPUB文件数组
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Promise<object[]>} 解析结果数组
     */
    async parseMultipleEpubs(files, progressCallback) {
        const results = [];
        const total = files.length;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                // 更新进度
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: total,
                        fileName: file.name,
                        status: 'processing'
                    });
                }

                // 解析文件
                const result = await this.parseEpub(file);
                result.fileName = file.name;
                result.fileSize = file.size;
                results.push(result);

                // 短暂延迟，避免阻塞UI
                await Utils.delay(10);
                
            } catch (error) {
                console.error(`解析文件失败 ${file.name}:`, error);
                results.push({
                    fileName: file.name,
                    fileSize: file.size,
                    success: false,
                    error: error.message || '解析失败',
                    images: [],
                    metadata: null,
                    totalImages: 0,
                    totalSize: 0
                });
            }
        }

        return results;
    }

    /**
     * 获取图片统计信息
     * @param {object[]} images - 图片数组
     * @returns {object} 统计信息
     */
    getImageStats(images) {
        const stats = {
            total: images.length,
            totalSize: 0,
            types: {},
            averageSize: 0,
            largestImage: null,
            smallestImage: null
        };

        if (images.length === 0) {
            return stats;
        }

        let maxSize = 0;
        let minSize = Infinity;

        images.forEach(image => {
            // 总大小
            stats.totalSize += image.size;

            // 类型统计
            const type = image.mimeType || 'unknown';
            stats.types[type] = (stats.types[type] || 0) + 1;

            // 最大最小图片
            if (image.size > maxSize) {
                maxSize = image.size;
                stats.largestImage = image;
            }
            if (image.size < minSize) {
                minSize = image.size;
                stats.smallestImage = image;
            }
        });

        stats.averageSize = Math.round(stats.totalSize / images.length);

        return stats;
    }

    /**
     * 验证解析结果
     * @param {object} parseResult - 解析结果
     * @returns {object} 验证结果
     */
    validateParseResult(parseResult) {
        const issues = [];

        if (!parseResult.success) {
            issues.push({
                type: 'parse_failed',
                message: parseResult.error || '解析失败'
            });
        }

        if (parseResult.images.length === 0) {
            issues.push({
                type: 'no_images',
                message: '未找到图片文件'
            });
        }

        if (parseResult.totalSize === 0) {
            issues.push({
                type: 'empty_images',
                message: '图片文件为空'
            });
        }

        // 检查图片大小异常
        const stats = this.getImageStats(parseResult.images);
        if (stats.largestImage && stats.largestImage.size > 50 * 1024 * 1024) {
            issues.push({
                type: 'large_image',
                message: `发现超大图片: ${stats.largestImage.fileName} (${Utils.formatFileSize(stats.largestImage.size)})`
            });
        }

        return {
            isValid: issues.length === 0,
            issues: issues,
            stats: stats
        };
    }
}

// 导出EPUB解析器类
window.EpubParser = EpubParser;