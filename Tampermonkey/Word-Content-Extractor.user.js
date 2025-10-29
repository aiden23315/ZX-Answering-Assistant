// ==UserScript==
// @name         Word文档内容提取器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  一个用于提取上传的Word文档内容的油猴脚本
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceText
// @connect      cdnjs.cloudflare.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 检查mammoth库是否已加载
    function checkMammothLibrary() {
        if (typeof mammoth === 'undefined') {
            showStatus('正在加载mammoth.js库，请稍候...', 'loading');
            
            // 动态加载mammoth库
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = function() {
                showStatus('mammoth.js库加载成功', 'success');
            };
            script.onerror = function() {
                showStatus('mammoth.js库加载失败，尝试备用CDN...', 'loading');
                // 尝试备用CDN
                loadMammothFromBackup();
            };
            document.head.appendChild(script);
            
            return false;
        }
        return true;
    }
    
    // 从备用CDN加载mammoth库
    function loadMammothFromBackup() {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/mammoth@1.6.0/mammoth.browser.min.js';
        script.onload = function() {
            showStatus('mammoth.js库从备用CDN加载成功', 'success');
        };
        script.onerror = function() {
            showStatus('所有CDN加载失败，请检查网络连接', 'error');
            // 显示手动下载提示
            showManualDownloadInstructions();
        };
        document.head.appendChild(script);
    }
    
    // 显示手动下载提示
    function showManualDownloadInstructions() {
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; font-size: 12px;">
                <p><strong>自动加载失败，请尝试以下方法：</strong></p>
                <p>1. 检查网络连接</p>
                <p>2. 刷新页面重试</p>
                <p>3. 手动下载mammoth.js库并在控制台中执行</p>
                <p style="font-family: monospace; background-color: #eee; padding: 5px; margin-top: 5px;">
                    fetch('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js')<br>
                    &nbsp;&nbsp;.then(res => res.text())<br>
                    &nbsp;&nbsp;.then(code => eval(code))
                </p>
            </div>
        `;
        container.appendChild(instructions);
    }

    // 创建主容器
    const container = document.createElement('div');
    container.id = 'word-extractor-container';
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.width = '300px';
    container.style.backgroundColor = '#fff';
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '5px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    container.style.zIndex = '10000';
    container.style.padding = '15px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.display = 'none';

    // 创建标题
    const title = document.createElement('h3');
    title.textContent = 'Word文档内容提取器';
    title.style.marginTop = '0';
    title.style.color = '#333';
    title.style.fontSize = '16px';
    title.style.textAlign = 'center';

    // 创建文件上传区域
    const uploadArea = document.createElement('div');
    uploadArea.id = 'upload-area';
    uploadArea.style.border = '2px dashed #ccc';
    uploadArea.style.borderRadius = '5px';
    uploadArea.style.padding = '20px';
    uploadArea.style.textAlign = 'center';
    uploadArea.style.marginBottom = '15px';
    uploadArea.style.cursor = 'pointer';
    uploadArea.style.transition = 'background-color 0.3s';

    // 添加拖拽悬停效果
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#f0f0f0';
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
    });

    // 文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'file-input';
    fileInput.accept = '.docx,.doc';
    fileInput.multiple = true; // 支持多文件选择
    fileInput.style.display = 'none';

    // 上传提示文本
    const uploadText = document.createElement('p');
    uploadText.textContent = '点击或拖拽Word文档到此处（支持批量）';
    uploadText.style.margin = '0';
    uploadText.style.color = '#666';

    // 文件列表容器
    const fileListContainer = document.createElement('div');
    fileListContainer.id = 'file-list-container';
    fileListContainer.style.maxHeight = '150px';
    fileListContainer.style.overflowY = 'auto';
    fileListContainer.style.marginBottom = '15px';
    fileListContainer.style.border = '1px solid #ddd';
    fileListContainer.style.borderRadius = '4px';
    fileListContainer.style.padding = '5px';
    fileListContainer.style.display = 'none';

    // 文件列表标题
    const fileListTitle = document.createElement('div');
    fileListTitle.textContent = '文件列表：';
    fileListTitle.style.fontWeight = 'bold';
    fileListTitle.style.marginBottom = '5px';
    fileListTitle.style.fontSize = '12px';
    fileListContainer.appendChild(fileListTitle);

    // 文件列表
    const fileList = document.createElement('div');
    fileList.id = 'file-list';
    fileList.style.fontSize = '12px';
    fileListContainer.appendChild(fileList);

    // 批量操作按钮容器
    const batchActionsContainer = document.createElement('div');
    batchActionsContainer.style.display = 'flex';
    batchActionsContainer.style.justifyContent = 'space-between';
    batchActionsContainer.style.marginBottom = '10px';

    // 全选/取消全选复选框
    const selectAllContainer = document.createElement('div');
    selectAllContainer.style.display = 'flex';
    selectAllContainer.style.alignItems = 'center';
    selectAllContainer.style.fontSize = '12px';

    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'select-all';
    selectAllCheckbox.style.marginRight = '5px';

    const selectAllLabel = document.createElement('label');
    selectAllLabel.htmlFor = 'select-all';
    selectAllLabel.textContent = '全选';

    selectAllContainer.appendChild(selectAllCheckbox);
    selectAllContainer.appendChild(selectAllLabel);

    // 清空列表按钮
    const clearListButton = document.createElement('button');
    clearListButton.textContent = '清空列表';
    clearListButton.style.backgroundColor = '#ff9800';
    clearListButton.style.color = 'white';
    clearListButton.style.border = 'none';
    clearListButton.style.padding = '5px 10px';
    clearListButton.style.borderRadius = '4px';
    clearListButton.style.cursor = 'pointer';
    clearListButton.style.fontSize = '12px';

    batchActionsContainer.appendChild(selectAllContainer);
    batchActionsContainer.appendChild(clearListButton);

    // 文件信息显示
    const fileInfo = document.createElement('div');
    fileInfo.id = 'file-info';
    fileInfo.style.marginBottom = '15px';
    fileInfo.style.fontSize = '12px';
    fileInfo.style.color = '#666';

    // 提取按钮
    const extractButton = document.createElement('button');
    extractButton.textContent = '提取内容';
    extractButton.style.backgroundColor = '#4CAF50';
    extractButton.style.color = 'white';
    extractButton.style.border = 'none';
    extractButton.style.padding = '8px 15px';
    extractButton.style.borderRadius = '4px';
    extractButton.style.cursor = 'pointer';
    extractButton.style.width = '100%';
    extractButton.style.marginBottom = '10px';
    extractButton.style.display = 'none';

    // 批量提取按钮
    const batchExtractButton = document.createElement('button');
    batchExtractButton.textContent = '批量提取选中文件';
    batchExtractButton.style.backgroundColor = '#2196F3';
    batchExtractButton.style.color = 'white';
    batchExtractButton.style.border = 'none';
    batchExtractButton.style.padding = '8px 15px';
    batchExtractButton.style.borderRadius = '4px';
    batchExtractButton.style.cursor = 'pointer';
    batchExtractButton.style.width = '100%';
    batchExtractButton.style.marginBottom = '10px';
    batchExtractButton.style.display = 'none';

    // 批量导出按钮
    const batchExportButton = document.createElement('button');
    batchExportButton.textContent = '导出所有结果';
    batchExportButton.style.backgroundColor = '#9C27B0';
    batchExportButton.style.color = 'white';
    batchExportButton.style.border = 'none';
    batchExportButton.style.padding = '8px 15px';
    batchExportButton.style.borderRadius = '4px';
    batchExportButton.style.cursor = 'pointer';
    batchExportButton.style.width = '100%';
    batchExportButton.style.marginBottom = '10px';
    batchExportButton.style.display = 'none';

    // 进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.id = 'progress-container';
    progressContainer.style.marginBottom = '10px';
    progressContainer.style.display = 'none';

    // 进度条
    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '10px';
    progressBar.style.backgroundColor = '#e0e0e0';
    progressBar.style.borderRadius = '5px';
    progressBar.style.overflow = 'hidden';

    const progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#4CAF50';
    progressFill.style.width = '0%';
    progressFill.style.transition = 'width 0.3s';

    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressBar);

    // 进度文本
    const progressText = document.createElement('div');
    progressText.id = 'progress-text';
    progressText.style.fontSize = '12px';
    progressText.style.textAlign = 'center';
    progressText.style.marginTop = '5px';
    progressText.textContent = '0 / 0';
    progressContainer.appendChild(progressText);

    // 结果显示区域
    const resultArea = document.createElement('div');
    resultArea.id = 'result-area';
    resultArea.style.border = '1px solid #ddd';
    resultArea.style.borderRadius = '4px';
    resultArea.style.padding = '10px';
    resultArea.style.maxHeight = '200px';
    resultArea.style.overflowY = 'auto';
    resultArea.style.fontSize = '12px';
    resultArea.style.lineHeight = '1.4';
    resultArea.style.whiteSpace = 'pre-wrap';
    resultArea.style.wordBreak = 'break-word';
    resultArea.style.display = 'none';

    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.textContent = '复制内容';
    copyButton.style.backgroundColor = '#2196F3';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.padding = '8px 15px';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.width = '100%';
    copyButton.style.marginBottom = '10px';
    copyButton.style.display = 'none';

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.backgroundColor = '#f44336';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.padding = '8px 15px';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.width = '100%';

    // 状态提示
    const statusMessage = document.createElement('div');
    statusMessage.id = 'status-message';
    statusMessage.style.marginTop = '10px';
    statusMessage.style.fontSize = '12px';
    statusMessage.style.color = '#666';
    statusMessage.style.textAlign = 'center';

    // 组装UI
    uploadArea.appendChild(uploadText);
    uploadArea.appendChild(fileInput);
    
    container.appendChild(title);
    container.appendChild(uploadArea);
    container.appendChild(fileListContainer);
    container.appendChild(batchActionsContainer);
    container.appendChild(fileInfo);
    container.appendChild(extractButton);
    container.appendChild(batchExtractButton);
    container.appendChild(batchExportButton);
    container.appendChild(progressContainer);
    container.appendChild(resultArea);
    container.appendChild(copyButton);
    container.appendChild(closeButton);
    container.appendChild(statusMessage);

    // 添加到页面
    document.body.appendChild(container);

    // 创建浮动按钮
    const floatingButton = document.createElement('div');
    floatingButton.id = 'word-extractor-toggle';
    floatingButton.style.position = 'fixed';
    floatingButton.style.bottom = '20px';
    floatingButton.style.right = '20px';
    floatingButton.style.width = '50px';
    floatingButton.style.height = '50px';
    floatingButton.style.backgroundColor = '#4CAF50';
    floatingButton.style.borderRadius = '50%';
    floatingButton.style.display = 'flex';
    floatingButton.style.justifyContent = 'center';
    floatingButton.style.alignItems = 'center';
    floatingButton.style.cursor = 'pointer';
    floatingButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    floatingButton.style.zIndex = '9999';
    floatingButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>';
    document.body.appendChild(floatingButton);

    // 切换显示/隐藏主容器
    floatingButton.addEventListener('click', function() {
        if (container.style.display === 'none') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    });

    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    // 处理拖拽上传
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    // 处理文件选择
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // 处理多个文件
    function handleFiles(files) {
        // 验证文件类型
        let validFiles = [];
        let invalidFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.match(/\.(docx|doc)$/i)) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        }
        
        if (invalidFiles.length > 0) {
            showStatus(`以下文件不是Word文档，已跳过：${invalidFiles.join(', ')}`, 'error');
        }
        
        if (validFiles.length === 0) {
            showStatus('没有有效的Word文档', 'error');
            return;
        }
        
        // 添加文件到列表
        addFilesToList(validFiles);
        
        // 显示文件列表和批量操作按钮
        fileListContainer.style.display = 'block';
        batchActionsContainer.style.display = 'flex';
        batchExtractButton.style.display = 'block';
        
        // 隐藏单文件操作
        extractButton.style.display = 'none';
        fileInfo.style.display = 'none';
        
        showStatus(`已添加 ${validFiles.length} 个文件`, 'success');
    }

    // 添加文件到列表
    function addFilesToList(files) {
        // 初始化文件数组（如果不存在）
        if (!window.uploadedFiles) {
            window.uploadedFiles = [];
        }
        
        // 添加新文件
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 检查文件是否已存在
            const exists = window.uploadedFiles.some(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                window.uploadedFiles.push({
                    file: file,
                    name: file.name,
                    size: file.size,
                    id: Date.now() + '_' + i,
                    selected: true,
                    extracted: false,
                    content: ''
                });
            }
        }
        
        // 更新文件列表显示
        updateFileListDisplay();
    }

    // 更新文件列表显示
    function updateFileListDisplay() {
        fileList.innerHTML = '';
        
        if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
            fileListContainer.style.display = 'none';
            batchActionsContainer.style.display = 'none';
            batchExtractButton.style.display = 'none';
            return;
        }
        
        window.uploadedFiles.forEach((fileObj, index) => {
            const fileItem = document.createElement('div');
            fileItem.style.display = 'flex';
            fileItem.style.alignItems = 'center';
            fileItem.style.padding = '5px';
            fileItem.style.borderBottom = '1px solid #eee';
            
            // 文件选择复选框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = fileObj.selected;
            checkbox.style.marginRight = '8px';
            checkbox.addEventListener('change', function() {
                fileObj.selected = this.checked;
                updateSelectAllCheckbox();
            });
            
            // 文件信息
            const fileInfo = document.createElement('div');
            fileInfo.style.flex = '1';
            fileInfo.style.fontSize = '12px';
            fileInfo.style.overflow = 'hidden';
            fileInfo.style.textOverflow = 'ellipsis';
            fileInfo.style.whiteSpace = 'nowrap';
            
            // 文件名
            const fileName = document.createElement('div');
            fileName.textContent = fileObj.name;
            fileName.style.fontWeight = 'bold';
            
            // 文件大小
            const fileSize = document.createElement('div');
            fileSize.textContent = formatFileSize(fileObj.size);
            fileSize.style.color = '#666';
            
            // 状态指示器
            const status = document.createElement('div');
            status.style.fontSize = '10px';
            status.style.marginTop = '2px';
            
            if (fileObj.extracted) {
                status.textContent = '已提取';
                status.style.color = '#4CAF50';
            } else {
                status.textContent = '待提取';
                status.style.color = '#ff9800';
            }
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            fileInfo.appendChild(status);
            
            // 删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '×';
            deleteButton.style.backgroundColor = '#f44336';
            deleteButton.style.color = 'white';
            deleteButton.style.border = 'none';
            deleteButton.style.borderRadius = '50%';
            deleteButton.style.width = '18px';
            deleteButton.style.height = '18px';
            deleteButton.style.cursor = 'pointer';
            deleteButton.style.marginLeft = '5px';
            deleteButton.addEventListener('click', function() {
                window.uploadedFiles.splice(index, 1);
                updateFileListDisplay();
                showStatus('文件已从列表中移除', 'info');
            });
            
            fileItem.appendChild(checkbox);
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(deleteButton);
            
            fileList.appendChild(fileItem);
        });
        
        updateSelectAllCheckbox();
    }

    // 更新全选复选框状态
    function updateSelectAllCheckbox() {
        if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
            selectAllCheckbox.checked = false;
            return;
        }
        
        const allSelected = window.uploadedFiles.every(f => f.selected);
        selectAllCheckbox.checked = allSelected;
    }

    // 全选/取消全选
    selectAllCheckbox.addEventListener('change', function() {
        if (!window.uploadedFiles) return;
        
        window.uploadedFiles.forEach(fileObj => {
            fileObj.selected = this.checked;
        });
        
        updateFileListDisplay();
    });

    // 清空文件列表
    clearListButton.addEventListener('click', function() {
        if (window.uploadedFiles) {
            window.uploadedFiles = [];
        }
        updateFileListDisplay();
        showStatus('文件列表已清空', 'info');
    });

    // 处理文件
    function handleFile(file) {
        // 验证文件类型
        if (!file.name.match(/\.(docx|doc)$/i)) {
            showStatus('请上传Word文档（.docx或.doc格式）', 'error');
            return;
        }

        // 显示文件信息
        fileInfo.innerHTML = `
            <div><strong>文件名:</strong> ${file.name}</div>
            <div><strong>大小:</strong> ${formatFileSize(file.size)}</div>
            <div><strong>类型:</strong> ${file.type || '未知'}</div>
        `;
        
        // 显示提取按钮
        extractButton.style.display = 'block';
        
        // 存储文件引用
        window.currentFile = file;
        
        showStatus('文件已准备就绪，点击"提取内容"按钮开始提取', 'success');
    }

    // 提取按钮点击事件
    extractButton.addEventListener('click', async function() {
        if (!window.currentFile) {
            showStatus('请先选择文件', 'error');
            return;
        }
        
        extractButton.disabled = true;
        extractButton.textContent = '提取中...';
        
        try {
            // 检查mammoth库
            if (!checkMammothLibrary()) {
                throw new Error('mammoth.js库未加载');
            }
            
            // 提取内容
            const content = await extractContent(window.currentFile);
            
            // 显示结果
            resultArea.textContent = content;
            resultArea.style.display = 'block';
            
            // 显示复制按钮
            copyButton.style.display = 'block';
            
            showStatus('内容提取成功', 'success');
        } catch (error) {
            console.error('提取失败:', error);
            showStatus(`提取失败: ${error.message}`, 'error');
        } finally {
            extractButton.disabled = false;
            extractButton.textContent = '提取内容';
        }
    });

    // 复制按钮点击事件
    copyButton.addEventListener('click', function() {
        const content = resultArea.textContent;
        if (!content) {
            showStatus('没有可复制的内容', 'error');
            return;
        }
        
        // 创建临时文本区域
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            showStatus('内容已复制到剪贴板', 'success');
        } catch (err) {
            showStatus('复制失败，请手动复制', 'error');
        }
        
        document.body.removeChild(textarea);
    });

    // 关闭按钮点击事件
    closeButton.addEventListener('click', function() {
        container.style.display = 'none';
        resetUI();
    });

    // 提取Word文档内容
    function extractContent(file) {
        // 检查mammoth库是否可用
        if (!checkMammothLibrary()) {
            showStatus('mammoth.js库尚未加载完成，请稍后再试', 'error');
            return;
        }
        
        showStatus('正在提取内容，请稍候...', 'loading');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            
            try {
                // 使用mammoth.js提取内容
                mammoth.extractRawText({arrayBuffer: arrayBuffer})
                    .then(function(result) {
                        const text = result.value; // 提取的纯文本
                        
                        // 显示结果
                        resultArea.textContent = text;
                        resultArea.style.display = 'block';
                        copyButton.style.display = 'block';
                        
                        showStatus('内容提取成功！', 'success');
                    })
                    .catch(function(error) {
                        console.error('提取失败:', error);
                        showStatus('提取失败: ' + error.message, 'error');
                    });
            } catch (error) {
                console.error('mammoth库错误:', error);
                showStatus('mammoth库错误: ' + error.message, 'error');
            }
        };
        
        reader.onerror = function() {
            showStatus('文件读取失败', 'error');
        };
        
        reader.readAsArrayBuffer(file);
    }

    // 显示状态消息
    function showStatus(message, type) {
        statusMessage.textContent = message;
        
        // 根据类型设置颜色
        switch(type) {
            case 'success':
                statusMessage.style.color = '#4CAF50';
                break;
            case 'error':
                statusMessage.style.color = '#f44336';
                break;
            case 'loading':
                statusMessage.style.color = '#2196F3';
                break;
            default:
                statusMessage.style.color = '#666';
        }
    }

    // 重置UI
    function resetUI() {
        fileInput.value = '';
        fileInfo.innerHTML = '';
        resultArea.style.display = 'none';
        resultArea.textContent = '';
        extractButton.style.display = 'none';
        copyButton.style.display = 'none';
        statusMessage.textContent = '';
        window.currentFile = null;
    }

    // 切换单文件/批量文件模式
    function switchToSingleFileMode() {
        // 隐藏批量操作
        fileListContainer.style.display = 'none';
        batchActionsContainer.style.display = 'none';
        batchExtractButton.style.display = 'none';
        batchExportButton.style.display = 'none';
        progressContainer.style.display = 'none';
        
        // 显示单文件操作
        extractButton.style.display = 'block';
        
        // 清空批量文件列表
        if (window.uploadedFiles) {
            window.uploadedFiles = [];
        }
    }
    
    function switchToBatchMode() {
        // 隐藏单文件操作
        fileInfo.style.display = 'none';
        extractButton.style.display = 'none';
        resultContainer.style.display = 'none';
        copyButton.style.display = 'none';
        downloadButton.style.display = 'none';
        
        // 显示批量操作
        fileListContainer.style.display = 'block';
        batchActionsContainer.style.display = 'flex';
    }

    // 添加模式切换按钮
    const modeToggle = document.createElement('button');
    modeToggle.textContent = '切换到批量模式';
    modeToggle.style.marginTop = '10px';
    modeToggle.style.padding = '8px 15px';
    modeToggle.style.backgroundColor = '#9c27b0';
    modeToggle.style.color = 'white';
    modeToggle.style.border = 'none';
    modeToggle.style.borderRadius = '4px';
    modeToggle.style.cursor = 'pointer';
    modeToggle.style.fontSize = '14px';
    
    let isBatchMode = false;
    
    modeToggle.addEventListener('click', function() {
        isBatchMode = !isBatchMode;
        
        if (isBatchMode) {
            modeToggle.textContent = '切换到单文件模式';
            switchToBatchMode();
            showStatus('已切换到批量模式', 'info');
        } else {
            modeToggle.textContent = '切换到批量模式';
            switchToSingleFileMode();
            showStatus('已切换到单文件模式', 'info');
        }
    });
    
    // 将模式切换按钮添加到上传区域后
    uploadArea.parentNode.insertBefore(modeToggle, uploadArea.nextSibling);

    // 处理单个文件（保留原有功能）
    function handleFile(file) {
        // 验证文件类型
        if (!file.name.match(/\.(docx|doc)$/i)) {
            showStatus('请上传Word文档（.docx或.doc格式）', 'error');
            return;
        }
        
        // 如果当前是批量模式，添加到文件列表
        if (isBatchMode) {
            handleFiles([file]);
            return;
        }
        
        // 显示文件信息
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
        
        // 隐藏批量操作
        fileListContainer.style.display = 'none';
        batchActionsContainer.style.display = 'none';
        batchExtractButton.style.display = 'none';
        batchExportButton.style.display = 'none';
        
        // 显示单文件提取按钮
        extractButton.style.display = 'block';
        
        // 保存文件引用
        window.currentFile = file;
        
        showStatus('文件已上传，点击提取按钮开始提取', 'info');
    }

    // 批量提取按钮事件
    batchExtractButton.addEventListener('click', function() {
        if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
            showStatus('没有可提取的文件', 'error');
            return;
        }
        
        const selectedFiles = window.uploadedFiles.filter(f => f.selected);
        
        if (selectedFiles.length === 0) {
            showStatus('请选择要提取的文件', 'error');
            return;
        }
        
        // 显示进度条
        progressContainer.style.display = 'block';
        
        // 开始批量提取
        batchExtractFiles(selectedFiles);
    });

    // 批量提取文件
    async function batchExtractFiles(files) {
        const totalFiles = files.length;
        let completedFiles = 0;
        let successFiles = 0;
        let failedFiles = 0;
        
        // 重置所有选中文件的提取状态
        files.forEach(fileObj => {
            fileObj.extracted = false;
            fileObj.content = '';
        });
        
        // 更新进度
        updateProgress(0, totalFiles, '开始批量提取...');
        
        // 逐个处理文件
        for (let i = 0; i < files.length; i++) {
            const fileObj = files[i];
            
            // 更新进度
            updateProgress(i, totalFiles, `正在提取: ${fileObj.name}`);
            
            try {
                // 检查mammoth库
                if (!checkMammothLibrary()) {
                    throw new Error('mammoth.js库未加载');
                }
                
                // 读取文件
                const content = await extractContent(fileObj.file);
                
                // 保存提取结果
                fileObj.content = content;
                fileObj.extracted = true;
                successFiles++;
                
            } catch (error) {
                console.error(`提取文件 ${fileObj.name} 失败:`, error);
                fileObj.extracted = false;
                fileObj.error = error.message;
                failedFiles++;
            }
            
            completedFiles++;
            
            // 更新进度
            updateProgress(completedFiles, totalFiles, `已完成 ${completedFiles}/${totalFiles}`);
            
            // 更新文件列表显示
            updateFileListDisplay();
        }
        
        // 完成批量提取
        updateProgress(totalFiles, totalFiles, `批量提取完成！成功: ${successFiles}, 失败: ${failedFiles}`);
        
        // 显示批量导出按钮
        if (successFiles > 0) {
            batchExportButton.style.display = 'block';
        }
        
        // 显示完成消息
        showStatus(`批量提取完成！成功: ${successFiles}, 失败: ${failedFiles}`, successFiles > 0 ? 'success' : 'error');
        
        // 3秒后隐藏进度条
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 3000);
    }

    // 更新进度条
    function updateProgress(current, total, message) {
        const percentage = Math.round((current / total) * 100);
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = message || `${current}/${total} (${percentage}%)`;
    }

    // 批量导出按钮事件
    batchExportButton.addEventListener('click', function() {
        if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
            showStatus('没有可导出的文件', 'error');
            return;
        }
        
        // 获取已提取的文件
        const extractedFiles = window.uploadedFiles.filter(f => f.extracted && f.content);
        
        if (extractedFiles.length === 0) {
            showStatus('没有已提取的文件可导出', 'error');
            return;
        }
        
        // 创建导出内容
        let exportContent = '';
        
        // 添加标题和时间戳
        exportContent += `# Word文档内容批量导出\n\n`;
        exportContent += `导出时间: ${new Date().toLocaleString()}\n`;
        exportContent += `文件数量: ${extractedFiles.length}\n\n`;
        exportContent += `---\n\n`;
        
        // 添加每个文件的内容
        extractedFiles.forEach((fileObj, index) => {
            exportContent += `## 文件 ${index + 1}: ${fileObj.name}\n\n`;
            exportContent += `文件大小: ${formatFileSize(fileObj.size)}\n\n`;
            exportContent += `提取内容:\n\n`;
            exportContent += fileObj.content;
            exportContent += '\n\n---\n\n';
        });
        
        // 创建并下载文件
        const blob = new Blob([exportContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `Word文档内容_批量导出_${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus(`已导出 ${extractedFiles.length} 个文件的内容`, 'success');
    });

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 初始提示
    showStatus('请上传Word文档', 'info');
})();