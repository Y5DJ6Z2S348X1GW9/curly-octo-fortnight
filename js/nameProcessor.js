// 文件名处理模块
class NameProcessor {
    constructor() {
        this.numberPattern = /(\d+)/g; // 匹配数字的正则表达式
        this.sortedFiles = []; // 排序后的文件列表
    }

    /**
     * 处理文件名并生成输出名称
     * @param {object[]} files - 文件对象数组
     * @returns {object[]} 包含输出名称的文件映射
     */
    processFileNames(files) {
        try {
            // 1. 提取并解析文件名中的数字
            const filesWithNumbers = this.extractNumbers(files);
            
            // 2. 根据数字排序
            const sortedFiles = this.sortFilesByNumbers(filesWithNumbers);
            
            // 3. 生成输出文件名
            const nameMapping = this.generateOutputNames(sortedFiles);
            
            // 4. 保存排序结果
            this.sortedFiles = sortedFiles;
            
            return nameMapping;
        } catch (error) {
            Utils.handleError(error, '文件名处理');
            return [];
        }
    }

    /**
     * 从文件名中提取数字
     * @param {object[]} files - 文件对象数组
     * @returns {object[]} 包含数字信息的文件数组
     */
    extractNumbers(files) {
        return files.map(fileObj => {
            const fileName = Utils.removeFileExtension(fileObj.name);
            const numbers = [];
            let match;

            // 重置正则表达式
            this.numberPattern.lastIndex = 0;
            
            // 提取所有数字
            while ((match = this.numberPattern.exec(fileName)) !== null) {
                numbers.push({
                    value: parseInt(match[1], 10),
                    originalString: match[1],
                    index: match.index,
                    length: match[1].length
                });
            }

            return {
                ...fileObj,
                fileName: fileName,
                numbers: numbers,
                primaryNumber: this.getPrimaryNumber(numbers, fileName),
                originalIndex: files.indexOf(fileObj)
            };
        });
    }

    /**
     * 获取主要数字（用于排序）
     * @param {object[]} numbers - 数字数组
     * @param {string} fileName - 文件名
     * @returns {number} 主要数字
     */
    getPrimaryNumber(numbers, fileName) {
        if (numbers.length === 0) {
            // 如果没有数字，使用文件名的哈希值
            return this.hashCode(fileName);
        }

        if (numbers.length === 1) {
            return numbers[0].value;
        }

        // 多个数字的情况，选择最可能是序号的数字
        // 优先选择：
        // 1. 位于文件名开头或结尾的数字
        // 2. 较短的数字（通常序号不会太长）
        // 3. 较小的数字（序号通常从小开始）

        let bestNumber = numbers[0];
        let bestScore = this.calculateNumberScore(bestNumber, fileName);

        for (let i = 1; i < numbers.length; i++) {
            const score = this.calculateNumberScore(numbers[i], fileName);
            if (score > bestScore) {
                bestScore = score;
                bestNumber = numbers[i];
            }
        }

        return bestNumber.value;
    }

    /**
     * 计算数字的评分（用于选择主要数字）
     * @param {object} numberObj - 数字对象
     * @param {string} fileName - 文件名
     * @returns {number} 评分
     */
    calculateNumberScore(numberObj, fileName) {
        let score = 0;
        const { value, index, length } = numberObj;
        const fileNameLength = fileName.length;

        // 位置评分：开头或结尾的数字得分更高
        if (index === 0 || index + length === fileNameLength) {
            score += 50;
        } else if (index < fileNameLength * 0.2 || index > fileNameLength * 0.8) {
            score += 30;
        }

        // 长度评分：1-3位数字得分更高（通常序号不会太长）
        if (length >= 1 && length <= 3) {
            score += 30 - (length - 1) * 5;
        }

        // 数值评分：较小的数字得分更高（序号通常从小开始）
        if (value <= 999) {
            score += Math.max(0, 20 - Math.floor(value / 50));
        }

        // 前后字符评分：如果数字前后是分隔符，得分更高
        const beforeChar = index > 0 ? fileName[index - 1] : '';
        const afterChar = index + length < fileNameLength ? fileName[index + length] : '';
        const separators = ['-', '_', ' ', '.', '(', ')', '[', ']'];
        
        if (separators.includes(beforeChar) || separators.includes(afterChar)) {
            score += 15;
        }

        return score;
    }

    /**
     * 根据数字对文件进行排序
     * @param {object[]} filesWithNumbers - 包含数字信息的文件数组
     * @returns {object[]} 排序后的文件数组
     */
    sortFilesByNumbers(filesWithNumbers) {
        return filesWithNumbers.sort((a, b) => {
            // 首先按主要数字排序
            if (a.primaryNumber !== b.primaryNumber) {
                return a.primaryNumber - b.primaryNumber;
            }

            // 如果主要数字相同，按文件名字典序排序
            if (a.fileName !== b.fileName) {
                return a.fileName.localeCompare(b.fileName, 'zh-CN', { numeric: true });
            }

            // 如果文件名也相同，按原始索引排序
            return a.originalIndex - b.originalIndex;
        });
    }

    /**
     * 生成输出文件名
     * @param {object[]} sortedFiles - 排序后的文件数组
     * @returns {object[]} 文件名映射数组
     */
    generateOutputNames(sortedFiles) {
        const totalFiles = sortedFiles.length;
        const digits = Math.max(3, totalFiles.toString().length); // 至少3位数

        return sortedFiles.map((fileObj, index) => {
            const sequenceNumber = index + 1;
            const paddedNumber = sequenceNumber.toString().padStart(digits, '0');
            const outputName = `${paddedNumber}.zip`;

            return {
                fileId: fileObj.id,
                originalName: fileObj.name,
                outputName: outputName,
                sequenceNumber: sequenceNumber,
                primaryNumber: fileObj.primaryNumber
            };
        });
    }

    /**
     * 字符串哈希函数
     * @param {string} str - 字符串
     * @returns {number} 哈希值
     */
    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return Math.abs(hash);
    }

    /**
     * 获取排序后的文件列表
     * @returns {object[]} 排序后的文件列表
     */
    getSortedFiles() {
        return this.sortedFiles;
    }

    /**
     * 预览排序结果
     * @param {object[]} files - 文件对象数组
     * @returns {object[]} 预览结果
     */
    previewSorting(files) {
        const filesWithNumbers = this.extractNumbers(files);
        const sortedFiles = this.sortFilesByNumbers(filesWithNumbers);
        const nameMapping = this.generateOutputNames(sortedFiles);

        return nameMapping.map(mapping => ({
            originalName: mapping.originalName,
            outputName: mapping.outputName,
            primaryNumber: mapping.primaryNumber,
            sequenceNumber: mapping.sequenceNumber
        }));
    }

    /**
     * 验证文件名处理结果
     * @param {object[]} nameMapping - 文件名映射
     * @returns {object} 验证结果
     */
    validateNameMapping(nameMapping) {
        const issues = [];
        const outputNames = new Set();
        const sequenceNumbers = new Set();

        nameMapping.forEach((mapping, index) => {
            // 检查输出文件名重复
            if (outputNames.has(mapping.outputName)) {
                issues.push({
                    type: 'duplicate_output',
                    message: `输出文件名重复: ${mapping.outputName}`,
                    fileId: mapping.fileId
                });
            }
            outputNames.add(mapping.outputName);

            // 检查序号重复
            if (sequenceNumbers.has(mapping.sequenceNumber)) {
                issues.push({
                    type: 'duplicate_sequence',
                    message: `序号重复: ${mapping.sequenceNumber}`,
                    fileId: mapping.fileId
                });
            }
            sequenceNumbers.add(mapping.sequenceNumber);

            // 检查序号连续性
            if (mapping.sequenceNumber !== index + 1) {
                issues.push({
                    type: 'sequence_gap',
                    message: `序号不连续: 期望 ${index + 1}，实际 ${mapping.sequenceNumber}`,
                    fileId: mapping.fileId
                });
            }
        });

        return {
            isValid: issues.length === 0,
            issues: issues,
            totalFiles: nameMapping.length,
            uniqueOutputNames: outputNames.size
        };
    }

    /**
     * 调试信息
     * @param {object[]} files - 文件对象数组
     * @returns {object} 调试信息
     */
    getDebugInfo(files) {
        const filesWithNumbers = this.extractNumbers(files);
        
        return {
            originalOrder: files.map(f => f.name),
            extractedNumbers: filesWithNumbers.map(f => ({
                name: f.name,
                numbers: f.numbers,
                primaryNumber: f.primaryNumber
            })),
            sortedOrder: this.sortFilesByNumbers(filesWithNumbers).map(f => f.name),
            nameMapping: this.generateOutputNames(this.sortFilesByNumbers(filesWithNumbers))
        };
    }

    /**
     * 重置处理器状态
     */
    reset() {
        this.sortedFiles = [];
    }
}

// 导出文件名处理器类
window.NameProcessor = NameProcessor;