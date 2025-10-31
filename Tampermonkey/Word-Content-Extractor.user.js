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
    container.style.width = '400px';
    container.style.maxWidth = '90vw';
    container.style.maxHeight = '90vh';
    container.style.minHeight = '300px';
    container.style.backgroundColor = '#fff';
    container.style.border = '1px solid #e0e0e0';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    container.style.zIndex = '10000';
    container.style.padding = '20px';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    container.style.display = 'none';
    container.style.transition = 'all 0.3s ease';
    container.style.overflow = 'auto';

    // 创建标题
    const title = document.createElement('h3');
    title.textContent = 'Word文档内容提取器';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.color = '#333';
    title.style.fontSize = '18px';
    title.style.textAlign = 'center';
    title.style.fontWeight = '600';
    title.style.paddingBottom = '10px';
    title.style.borderBottom = '1px solid #eee';

    // 创建文件上传区域
    const uploadArea = document.createElement('div');
    uploadArea.id = 'upload-area';
    uploadArea.style.border = '2px dashed #ccc';
    uploadArea.style.borderRadius = '8px';
    uploadArea.style.padding = '25px 15px';
    uploadArea.style.textAlign = 'center';
    uploadArea.style.marginBottom = '20px';
    uploadArea.style.cursor = 'pointer';
    uploadArea.style.transition = 'all 0.3s ease';
    uploadArea.style.backgroundColor = '#fafafa';

    // 添加拖拽悬停效果
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#e8f4fd';
        uploadArea.style.borderColor = '#2196F3';
        uploadArea.style.transform = 'scale(1.02)';
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#fafafa';
        uploadArea.style.borderColor = '#ccc';
        uploadArea.style.transform = 'scale(1)';
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
    uploadText.style.color = '#555';
    uploadText.style.fontSize = '14px';
    uploadText.style.fontWeight = '500';

    // 文件列表容器
    const fileListContainer = document.createElement('div');
    fileListContainer.id = 'file-list-container';
    fileListContainer.style.maxHeight = '30vh';
    fileListContainer.style.minHeight = '100px';
    fileListContainer.style.overflowY = 'auto';
    fileListContainer.style.marginBottom = '20px';
    fileListContainer.style.border = '1px solid #e0e0e0';
    fileListContainer.style.borderRadius = '8px';
    fileListContainer.style.padding = '10px';
    fileListContainer.style.display = 'none';
    fileListContainer.style.backgroundColor = '#f9f9f9';

    // 文件列表标题
    const fileListTitle = document.createElement('div');
    fileListTitle.textContent = '文件列表：';
    fileListTitle.style.fontWeight = '600';
    fileListTitle.style.marginBottom = '8px';
    fileListTitle.style.fontSize = '13px';
    fileListTitle.style.color = '#333';
    fileListContainer.appendChild(fileListTitle);

    // 文件列表
    const fileList = document.createElement('div');
    fileList.id = 'file-list';
    fileList.style.fontSize = '13px';
    fileListContainer.appendChild(fileList);

    // 批量操作按钮容器
    const batchActionsContainer = document.createElement('div');
    batchActionsContainer.style.display = 'flex';
    batchActionsContainer.style.justifyContent = 'space-between';
    batchActionsContainer.style.alignItems = 'center';
    batchActionsContainer.style.marginBottom = '15px';
    batchActionsContainer.style.padding = '0 5px';

    // 全选/取消全选复选框
    const selectAllContainer = document.createElement('div');
    selectAllContainer.style.display = 'flex';
    selectAllContainer.style.alignItems = 'center';
    selectAllContainer.style.fontSize = '13px';
    selectAllContainer.style.cursor = 'pointer';

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
    clearListButton.style.padding = '6px 12px';
    clearListButton.style.borderRadius = '6px';
    clearListButton.style.cursor = 'pointer';
    clearListButton.style.fontSize = '12px';
    clearListButton.style.fontWeight = '500';
    clearListButton.style.transition = 'all 0.2s ease';
    clearListButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

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
    extractButton.style.padding = '10px 20px';
    extractButton.style.borderRadius = '8px';
    extractButton.style.cursor = 'pointer';
    extractButton.style.width = '100%';
    extractButton.style.marginBottom = '12px';
    extractButton.style.display = 'none';
    extractButton.style.fontSize = '14px';
    extractButton.style.fontWeight = '500';
    extractButton.style.transition = 'all 0.2s ease';
    extractButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';

    // 批量提取按钮
    const batchExtractButton = document.createElement('button');
    batchExtractButton.textContent = '批量提取选中文件';
    batchExtractButton.style.backgroundColor = '#2196F3';
    batchExtractButton.style.color = 'white';
    batchExtractButton.style.border = 'none';
    batchExtractButton.style.padding = '10px 20px';
    batchExtractButton.style.borderRadius = '8px';
    batchExtractButton.style.cursor = 'pointer';
    batchExtractButton.style.width = '100%';
    batchExtractButton.style.marginBottom = '12px';
    batchExtractButton.style.display = 'none';
    batchExtractButton.style.fontSize = '14px';
    batchExtractButton.style.fontWeight = '500';
    batchExtractButton.style.transition = 'all 0.2s ease';
    batchExtractButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';

    // 批量导出按钮
    const batchExportButton = document.createElement('button');
    batchExportButton.textContent = '导出所有结果';
    batchExportButton.style.backgroundColor = '#9C27B0';
    batchExportButton.style.color = 'white';
    batchExportButton.style.border = 'none';
    batchExportButton.style.padding = '10px 20px';
    batchExportButton.style.borderRadius = '8px';
    batchExportButton.style.cursor = 'pointer';
    batchExportButton.style.width = '100%';
    batchExportButton.style.marginBottom = '12px';
    batchExportButton.style.display = 'none';
    batchExportButton.style.fontSize = '14px';
    batchExportButton.style.fontWeight = '500';
    batchExportButton.style.transition = 'all 0.2s ease';
    batchExportButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';

    // 进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.id = 'progress-container';
    progressContainer.style.marginBottom = '15px';
    progressContainer.style.display = 'none';
    progressContainer.style.backgroundColor = '#f5f5f5';
    progressContainer.style.borderRadius = '8px';
    progressContainer.style.padding = '10px';

    // 进度条
    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '12px';
    progressBar.style.backgroundColor = '#e0e0e0';
    progressBar.style.borderRadius = '6px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.marginBottom = '8px';

    const progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#4CAF50';
    progressFill.style.width = '0%';
    progressFill.style.transition = 'width 0.4s ease';
    progressFill.style.borderRadius = '6px';
    progressFill.style.background = 'linear-gradient(90deg, #4CAF50, #66BB6A)';

    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressBar);

    // 进度文本
    const progressText = document.createElement('div');
    progressText.id = 'progress-text';
    progressText.style.fontSize = '13px';
    progressText.style.textAlign = 'center';
    progressText.style.color = '#555';
    progressText.style.fontWeight = '500';
    progressText.textContent = '0 / 0';
    progressContainer.appendChild(progressText);

    // 结果显示区域
    const resultArea = document.createElement('div');
    resultArea.id = 'result-area';
    resultArea.style.border = '1px solid #e0e0e0';
    resultArea.style.borderRadius = '8px';
    resultArea.style.padding = '15px';
    resultArea.style.maxHeight = '40vh';
    resultArea.style.minHeight = '150px';
    resultArea.style.overflowY = 'auto';
    resultArea.style.fontSize = '13px';
    resultArea.style.lineHeight = '1.5';
    resultArea.style.whiteSpace = 'pre-wrap';
    resultArea.style.wordBreak = 'break-word';
    resultArea.style.display = 'none';
    resultArea.style.backgroundColor = '#f9f9f9';
    resultArea.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';

    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.textContent = '复制内容';
    copyButton.style.backgroundColor = '#2196F3';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.padding = '10px 20px';
    copyButton.style.borderRadius = '8px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.width = '100%';
    copyButton.style.marginBottom = '12px';
    copyButton.style.display = 'none';
    copyButton.style.fontSize = '14px';
    copyButton.style.fontWeight = '500';
    copyButton.style.transition = 'all 0.2s ease';
    copyButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.backgroundColor = '#f44336';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 20px';
    closeButton.style.borderRadius = '8px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.width = '100%';
    closeButton.style.fontSize = '14px';
    closeButton.style.fontWeight = '500';
    closeButton.style.transition = 'all 0.2s ease';
    closeButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';

    // 状态提示
    const statusMessage = document.createElement('div');
    statusMessage.id = 'status-message';
    statusMessage.style.marginTop = '12px';
    statusMessage.style.fontSize = '13px';
    statusMessage.style.color = '#666';
    statusMessage.style.textAlign = 'center';
    statusMessage.style.fontWeight = '500';

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
        fileItem.style.justifyContent = 'space-between';
        fileItem.style.alignItems = 'center';
        fileItem.style.padding = '10px 12px';
        fileItem.style.borderBottom = '1px solid #eee';
        fileItem.style.fontSize = '13px';
        fileItem.style.cursor = 'pointer';
        fileItem.style.transition = 'background-color 0.2s ease';
        fileItem.style.borderRadius = '6px';
        fileItem.style.marginBottom = '4px';
            
            // 文件选择复选框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = fileObj.selected;
            checkbox.style.marginRight = '8px';
            checkbox.style.transform = 'scale(1.2)';
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
            fileName.style.flex = '1';
            fileName.style.overflow = 'hidden';
            fileName.style.textOverflow = 'ellipsis';
            fileName.style.whiteSpace = 'nowrap';
            fileName.style.fontSize = '13px';
            fileName.style.color = '#333';
            
            // 文件大小
            const fileSize = document.createElement('div');
            fileSize.textContent = formatFileSize(fileObj.size);
            fileSize.style.color = '#666';
            fileSize.style.fontSize = '12px';
            fileSize.style.marginRight = '10px';
            fileSize.style.minWidth = '50px';
            fileSize.style.textAlign = 'right';
            
            // 状态指示器
            const status = document.createElement('div');
            status.style.fontSize = '10px';
            status.style.marginTop = '2px';
            status.style.padding = '2px 6px';
            status.style.borderRadius = '10px';
            status.style.display = 'inline-block';
            status.style.fontWeight = '500';
            status.style.transition = 'all 0.3s ease';
            
            if (fileObj.extracted) {
                status.textContent = '已提取';
                status.style.color = '#4CAF50';
                status.style.backgroundColor = '#e8f5e8';
            } else {
                status.textContent = '待提取';
                status.style.color = '#ff9800';
                status.style.backgroundColor = '#fff3e0';
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
            deleteButton.style.transition = 'all 0.2s ease';
            deleteButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            // 文件项悬停效果
            fileItem.addEventListener('mouseenter', () => {
                fileItem.style.backgroundColor = '#f5f5f5';
            });
            
            fileItem.addEventListener('mouseleave', () => {
                fileItem.style.backgroundColor = 'transparent';
            });
            
            // 删除按钮悬停效果
            deleteButton.addEventListener('mouseenter', () => {
                deleteButton.style.backgroundColor = '#d32f2f';
                deleteButton.style.transform = 'scale(1.1)';
            });
            
            deleteButton.addEventListener('mouseleave', () => {
                deleteButton.style.backgroundColor = '#f44336';
                deleteButton.style.transform = 'scale(1)';
            });
            
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
        showStatus('正在提取内容，请稍候...', 'loading');
        
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
        return new Promise((resolve, reject) => {
            // 检查mammoth库是否可用
            if (!checkMammothLibrary()) {
                reject(new Error('mammoth.js库尚未加载完成，请稍后再试'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                
                try {
                    // 使用mammoth.js提取内容
                    mammoth.extractRawText({arrayBuffer: arrayBuffer})
                        .then(function(result) {
                            const text = result.value; // 提取的纯文本
                            // 格式化提取的内容
                            const formattedContent = formatExtractedContent(text);
                            resolve(formattedContent);
                        })
                        .catch(function(error) {
                            console.error('提取失败:', error);
                            reject(new Error('提取失败: ' + error.message));
                        });
                } catch (error) {
                    console.error('mammoth库错误:', error);
                    reject(new Error('mammoth库错误: ' + error.message));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // 格式化提取的内容
    function formatExtractedContent(text) {
        // 按行分割文本
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        let formattedContent = '';
        let currentQuestion = null;
        let questionNumber = 0;
        let inOptions = false;
        let options = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检测题目标题（包含【】的内容）
            if (line.includes('【') && line.includes('】') && !line.includes('答案')) {
                // 如果之前有题目，先添加到结果中
                if (currentQuestion) {
                    formattedContent += formatQuestion(currentQuestion, questionNumber);
                }
                
                // 开始新题目
                questionNumber++;
                currentQuestion = {
                    title: line,
                    options: [],
                    answer: null
                };
                inOptions = false;
                options = [];
                continue;
            }
            
            // 检测选项（以A.、B.、C.、D.开头）
            if (/^[A-D]\./.test(line)) {
                inOptions = true;
                if (currentQuestion) {
                    currentQuestion.options.push(line);
                }
                continue;
            }
            
            // 检测答案（包含"答案："）
            if (line.includes('答案：') || line.includes('答案:')) {
                inOptions = false;
                if (currentQuestion) {
                    // 提取答案部分
                    const answerMatch = line.match(/答案[：:]\s*(.+)/);
                    if (answerMatch) {
                        currentQuestion.answer = answerMatch[1];
                    }
                }
                continue;
            }
            
            // 如果在选项部分，且不是选项或答案，可能是题目的延续
            if (inOptions && currentQuestion) {
                // 检查是否是题目的延续（不包含选项格式）
                if (!/^[A-D]\./.test(line) && !line.includes('答案：') && !line.includes('答案:')) {
                    currentQuestion.title += ' ' + line;
                }
            }
        }
        
        // 添加最后一个题目
        if (currentQuestion) {
            formattedContent += formatQuestion(currentQuestion, questionNumber);
        }
        
        return formattedContent;
    }

    // 格式化单个题目
    function formatQuestion(question, number) {
        let formatted = '';
        
        // 添加题目标题和编号
        formatted += `${number}）\t${question.title}\n`;
        
        // 添加选项
        if (question.options && question.options.length > 0) {
            question.options.forEach(option => {
                formatted += `${option}\n`;
            });
        }
        
        // 添加答案
        if (question.answer) {
            formatted += `答案：${question.answer}\n`;
        }
        
        // 添加空行分隔
        formatted += '\n';
        
        return formatted;
    }

    // 显示状态消息
    function showStatus(message, type) {
        const statusElement = document.getElementById('status-message');
        if (!statusElement) {
            statusElement = statusMessage;
        }
        
        statusElement.textContent = message;
        
        // 根据消息类型设置颜色和样式
        switch(type) {
            case 'success':
                statusElement.style.color = '#4CAF50';
                statusElement.style.fontWeight = '600';
                statusElement.style.backgroundColor = '#e8f5e8';
                statusElement.style.padding = '8px 12px';
                statusElement.style.borderRadius = '6px';
                break;
            case 'error':
                statusElement.style.color = '#f44336';
                statusElement.style.fontWeight = '600';
                statusElement.style.backgroundColor = '#ffebee';
                statusElement.style.padding = '8px 12px';
                statusElement.style.borderRadius = '6px';
                break;
            case 'warning':
                statusElement.style.color = '#ff9800';
                statusElement.style.fontWeight = '500';
                statusElement.style.backgroundColor = '#fff3e0';
                statusElement.style.padding = '8px 12px';
                statusElement.style.borderRadius = '6px';
                break;
            case 'loading':
                statusElement.style.color = '#2196F3';
                statusElement.style.fontWeight = '500';
                statusElement.style.backgroundColor = '#e3f2fd';
                statusElement.style.padding = '8px 12px';
                statusElement.style.borderRadius = '6px';
                break;
            default: // info
                statusElement.style.color = '#666';
                statusElement.style.fontWeight = '500';
                statusElement.style.backgroundColor = 'transparent';
                statusElement.style.padding = '0';
        }
        
        // 添加过渡效果
        statusElement.style.transition = 'all 0.3s ease';
        
        // 如果是成功或错误消息，3秒后恢复默认样式
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusElement.style.color = '#666';
                statusElement.style.fontWeight = '500';
                statusElement.style.backgroundColor = 'transparent';
                statusElement.style.padding = '0';
            }, 3000);
        }
    }

    // 显示结果区域
    function showResult(content) {
        const resultArea = document.getElementById('result-area');
        const copyButton = document.getElementById('copy-button');
        const closeButton = document.getElementById('close-button');
        
        if (!resultArea || !copyButton || !closeButton) return;
        
        resultArea.textContent = content;
        resultArea.style.display = 'block';
        copyButton.style.display = 'block';
        closeButton.style.display = 'block';
        
        // 添加淡入动画
        resultArea.style.opacity = '0';
        resultArea.style.transform = 'translateY(10px)';
        resultArea.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
            resultArea.style.opacity = '1';
            resultArea.style.transform = 'translateY(0)';
        }, 10);
        
        // 同样为按钮添加动画
        [copyButton, closeButton].forEach((button, index) => {
            button.style.opacity = '0';
            button.style.transform = 'translateY(10px)';
            button.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            setTimeout(() => {
                button.style.opacity = '1';
                button.style.transform = 'translateY(0)';
            }, 100 + (index * 50));
        });
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
        
        // 重置批量模式相关UI
        if (window.uploadedFiles) {
            window.uploadedFiles = [];
        }
        fileListContainer.style.display = 'none';
        batchActionsContainer.style.display = 'none';
        batchExtractButton.style.display = 'none';
        batchExportButton.style.display = 'none';
        progressContainer.style.display = 'none';
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
        resultArea.style.display = 'none';
        copyButton.style.display = 'none';
        
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
        fileInfo.innerHTML = `
            <div><strong>文件名:</strong> ${file.name}</div>
            <div><strong>大小:</strong> ${formatFileSize(file.size)}</div>
            <div><strong>类型:</strong> ${file.type || '未知'}</div>
        `;
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
    function batchExtractFiles(files) {
        if (!files || files.length === 0) {
            showStatus('没有可提取的文件', 'error');
            return;
        }
        
        let currentIndex = 0;
        let globalQuestionNumber = 1; // 全局题目编号
        let combinedContent = ''; // 拼接的内容
        
        updateProgress(0, files.length, '准备提取...');
        
        // 处理下一个文件
        function processNextFile() {
            if (currentIndex >= files.length) {
                // 所有文件处理完成
                updateProgress(files.length, files.length, '提取完成');
                showStatus(`批量提取完成，共处理 ${files.length} 个文件`, 'success');
                
                // 显示拼接后的内容
                resultArea.textContent = combinedContent;
                resultArea.style.display = 'block';
                
                // 添加淡入动画
                resultArea.style.opacity = '0';
                resultArea.style.transform = 'translateY(10px)';
                resultArea.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                setTimeout(() => {
                    resultArea.style.opacity = '1';
                    resultArea.style.transform = 'translateY(0)';
                }, 10);
                
                // 显示复制按钮
                copyButton.style.display = 'block';
                
                // 为复制按钮添加动画
                copyButton.style.opacity = '0';
                copyButton.style.transform = 'translateY(10px)';
                copyButton.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                setTimeout(() => {
                    copyButton.style.opacity = '1';
                    copyButton.style.transform = 'translateY(0)';
                }, 100);
                
                // 显示导出按钮
                batchExportButton.style.display = 'block';
                
                // 为导出按钮添加动画
                batchExportButton.style.opacity = '0';
                batchExportButton.style.transform = 'translateY(10px)';
                batchExportButton.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                setTimeout(() => {
                    batchExportButton.style.opacity = '1';
                    batchExportButton.style.transform = 'translateY(0)';
                }, 200);
                return;
            }
            
            const fileObj = files[currentIndex];
            updateProgress(currentIndex, files.length, `正在提取: ${fileObj.name}`);
            
            // 提取当前文件
            extractContent(fileObj.file)
                .then(function(content) {
                    // 保存提取的内容
                    fileObj.content = content;
                    fileObj.extracted = true;
                    
                    // 更新文件列表显示
                    updateFileListDisplay();
                    
                    // 添加文件分隔符和文件名
                    if (combinedContent) {
                        combinedContent += '\n\n---\n\n';
                    }
                    combinedContent += `## 文件 ${currentIndex + 1}: ${fileObj.name}\n\n`;
                    
                    // 获取格式化内容并更新题目编号
                    const formattedContent = updateQuestionNumbers(content, globalQuestionNumber);
                    combinedContent += formattedContent;
                    
                    // 计算当前文件中的题目数量，更新全局编号
                    const questionCount = countQuestionsInContent(formattedContent);
                    globalQuestionNumber += questionCount;
                    
                    // 处理下一个文件
                    currentIndex++;
                    setTimeout(processNextFile, 100); // 短暂延迟，避免界面卡顿
                })
                .catch(function(error) {
                    // 处理错误
                    showStatus(`提取文件 ${fileObj.name} 失败: ${error}`, 'error');
                    
                    // 在拼接内容中添加错误信息
                    if (combinedContent) {
                        combinedContent += '\n\n---\n\n';
                    }
                    combinedContent += `## 文件 ${currentIndex + 1}: ${fileObj.name}\n\n`;
                    combinedContent += `提取失败: ${error}\n\n`;
                    
                    // 继续处理下一个文件
                    currentIndex++;
                    setTimeout(processNextFile, 100);
                });
        }
        
        // 开始处理
        processNextFile();
    }
    
    // 更新进度条
    function updateProgress(current, total, message) {
        const percentage = Math.round((current / total) * 100);
        progressBar.style.width = `${percentage}%`;
        
        // 添加动画效果
        progressBar.style.transition = 'width 0.4s ease';
        
        // 更新进度文本，添加更详细的信息
        progressText.textContent = message || `${current}/${total} (${percentage}%)`;
        
        // 根据进度改变进度条颜色
        if (percentage < 30) {
            progressBar.style.background = 'linear-gradient(90deg, #ff9800, #ffb74d)';
        } else if (percentage < 70) {
            progressBar.style.background = 'linear-gradient(90deg, #2196F3, #64B5F6)';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #4CAF50, #66BB6A)';
        }
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
        let globalQuestionNumber = 1; // 全局题目编号
        
        // 添加标题和时间戳
        exportContent += `# Word文档内容批量导出\n\n`;
        exportContent += `导出时间: ${new Date().toLocaleString()}\n`;
        exportContent += `文件数量: ${extractedFiles.length}\n\n`;
        exportContent += `---\n\n`;
        
        // 添加每个文件的内容
        extractedFiles.forEach((fileObj, index) => {
            exportContent += `## 文件 ${index + 1}: ${fileObj.name}\n\n`;
            exportContent += `文件大小: ${formatFileSize(fileObj.size)}\n\n`;
            
            // 获取格式化内容并更新题目编号
            const formattedContent = updateQuestionNumbers(fileObj.content, globalQuestionNumber);
            exportContent += `提取内容:\n\n`;
            exportContent += formattedContent;
            exportContent += '\n\n';
            
            // 计算当前文件中的题目数量，更新全局编号
            const questionCount = countQuestionsInContent(formattedContent);
            globalQuestionNumber += questionCount;
            
            exportContent += `---\n\n`;
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
    
    // 更新题目编号
    function updateQuestionNumbers(content, startNumber) {
        // 按行分割内容
        const lines = content.split('\n');
        let currentNumber = startNumber;
        let result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检查是否是题目行（以数字）开头
            const match = line.match(/^(\d+)）\s*(.+)/);
            if (match) {
                // 替换为新的编号
                result.push(`${currentNumber}）\t${match[2]}`);
                currentNumber++;
            } else {
                result.push(line);
            }
        }
        
        return result.join('\n');
    }
    
    // 计算内容中的题目数量
    function countQuestionsInContent(content) {
        // 按行分割内容
        const lines = content.split('\n');
        let count = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检查是否是题目行（以数字）开头
            const match = line.match(/^(\d+)）\s*(.+)/);
            if (match) {
                count++;
            }
        }
        
        return count;
    }

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