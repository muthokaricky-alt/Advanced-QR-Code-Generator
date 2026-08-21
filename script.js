// ============================================================
//  ADVANCED QR CODE GENERATOR - Full Application
// ============================================================

(function() {
    'use strict';

    // ---------- DOM REFS ----------
    const fgColor = document.getElementById('fgColor');
    const bgColor = document.getElementById('bgColor');
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeLabel = document.getElementById('sizeLabel');
    const logoUpload = document.getElementById('logoUpload');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const generateBtn = document.getElementById('generateBtn');
    const qrContainer = document.getElementById('qrcode');
    const qrContainerWrap = document.getElementById('qrcode-container');
    const templateSelect = document.getElementById('templateSelect');
    const templateFields = document.getElementById('templateFields');
    const historyGrid = document.getElementById('historyGrid');
    const historyCount = document.getElementById('historyCount');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const csvUpload = document.getElementById('csvUpload');
    const bulkGenerateBtn = document.getElementById('bulkGenerateBtn');
    const bulkStatus = document.getElementById('bulk-status');
    const scanBtn = document.getElementById('scanBtn');
    const scannerModal = document.getElementById('scannerModal');
    const scannerCloseBtn = document.getElementById('scannerCloseBtn');
    const scannerContainer = document.getElementById('scanner-container');
    const scannerStatus = document.getElementById('scannerStatus');
    const cornerSelector = document.getElementById('cornerSelector');
    const downloadPDF = document.getElementById('downloadPDF');
    const previewBox = document.getElementById('previewBox');
    const dataPreviewText = document.getElementById('dataPreviewText');
    const toastContainer = document.getElementById('toastContainer');

    // Analytics
    const totalScansEl = document.getElementById('totalScans');
    const uniqueCodesEl = document.getElementById('uniqueCodes');
    const todayScansEl = document.getElementById('todayScans');
    const lastScanEl = document.getElementById('lastScan');
    const clearAnalyticsBtn = document.getElementById('clearAnalyticsBtn');

    // ---------- STATE ----------
    let currentQR = null;
    let logoDataURL = null;
    let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
    let currentText = 'https://example.com';
    let generationTimeout = null;
    let html5Scanner = null;
    let cornerStyle = 'square';
    let analytics = JSON.parse(localStorage.getItem('qrAnalytics') || '{"scans":[],"total":0}');

    // ---------- TOAST SYSTEM ----------
    function showToast(message, type = 'info', duration = 3000) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '💡'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
                <span class="toast-icon">${icons[type] || '💡'}</span>
                <span>${message}</span>
            `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    // ---------- DARK MODE ----------
    function setDarkMode(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
            darkModeToggle.classList.add('active');
        } else {
            document.documentElement.removeAttribute('data-theme');
            darkModeToggle.classList.remove('active');
        }
        localStorage.setItem('darkMode', enabled ? 'dark' : 'light');
    }

    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'dark') setDarkMode(true);

    darkModeToggle.addEventListener('click', function() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        setDarkMode(!isDark);
        showToast(isDark ? '🌙 Dark mode off' : '☀️ Dark mode on', 'info');
    });

    // ---------- CORNER STYLES ----------
    cornerSelector.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        cornerSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cornerStyle = btn.dataset.style;
        generateQR();
        showToast(`🔲 Corner style: ${btn.textContent}`, 'info');
    });

    // ---------- TEMPLATE SYSTEM ----------
    const templates = {
        text: {
            fields: `
                    <div class="full-width control-group">
                        <label for="textInput">Enter any text or URL</label>
                        <input type="text" id="textInput" value="https://example.com" placeholder="Paste text or URL..." />
                    </div>
                `
        },
        wifi: {
            fields: `
                    <div class="control-group">
                        <label for="wifiSsid">Network Name (SSID)</label>
                        <input type="text" id="wifiSsid" value="MyWiFi" placeholder="Network name" />
                    </div>
                    <div class="control-group">
                        <label for="wifiPassword">Password</label>
                        <input type="password" id="wifiPassword" value="password123" placeholder="WiFi password" />
                    </div>
                    <div class="control-group">
                        <label for="wifiEncryption">Encryption</label>
                        <select id="wifiEncryption">
                            <option value="WPA">WPA/WPA2</option>
                            <option value="WEP">WEP</option>
                            <option value="nopass">Open (no password)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="wifiHidden">Hidden SSID?</label>
                        <select id="wifiHidden">
                            <option value="false">Visible</option>
                            <option value="true">Hidden</option>
                        </select>
                    </div>
                `
        },
        contact: {
            fields: `
                    <div class="control-group">
                        <label for="contactName">Full Name</label>
                        <input type="text" id="contactName" value="John Doe" placeholder="Full name" />
                    </div>
                    <div class="control-group">
                        <label for="contactPhone">Phone</label>
                        <input type="text" id="contactPhone" value="+1234567890" placeholder="Phone number" />
                    </div>
                    <div class="control-group">
                        <label for="contactEmail">Email</label>
                        <input type="text" id="contactEmail" value="john@example.com" placeholder="Email" />
                    </div>
                    <div class="control-group">
                        <label for="contactCompany">Company</label>
                        <input type="text" id="contactCompany" value="Acme Inc" placeholder="Company name" />
                    </div>
                    <div class="full-width control-group">
                        <label for="contactWebsite">Website</label>
                        <input type="text" id="contactWebsite" value="https://example.com" placeholder="Website URL" />
                    </div>
                `
        },
        event: {
            fields: `
                    <div class="control-group">
                        <label for="eventTitle">Event Title</label>
                        <input type="text" id="eventTitle" value="Team Meeting" placeholder="Event name" />
                    </div>
                    <div class="control-group">
                        <label for="eventDate">Date</label>
                        <input type="date" id="eventDate" value="2026-09-15" />
                    </div>
                    <div class="control-group">
                        <label for="eventStart">Start Time</label>
                        <input type="time" id="eventStart" value="14:00" />
                    </div>
                    <div class="control-group">
                        <label for="eventEnd">End Time</label>
                        <input type="time" id="eventEnd" value="15:00" />
                    </div>
                    <div class="full-width control-group">
                        <label for="eventLocation">Location</label>
                        <input type="text" id="eventLocation" value="Conference Room A" placeholder="Location" />
                    </div>
                    <div class="full-width control-group">
                        <label for="eventDescription">Description</label>
                        <input type="text" id="eventDescription" value="Monthly sync-up" placeholder="Description" />
                    </div>
                `
        }
    };

    function renderTemplate(templateKey) {
        const tpl = templates[templateKey] || templates.text;
        templateFields.innerHTML = tpl.fields;

        const allInputs = templateFields.querySelectorAll('input, select');
        allInputs.forEach(el => {
            el.addEventListener('input', function() {
                const data = getTemplateData();
                if (data) {
                    currentText = data;
                    scheduleGenerate();
                }
            });
            el.addEventListener('change', function() {
                const data = getTemplateData();
                if (data) {
                    currentText = data;
                    scheduleGenerate();
                }
            });
        });

        setTimeout(() => {
            const data = getTemplateData();
            if (data) {
                currentText = data;
                generateQR();
            }
        }, 30);
    }

    function getTemplateData() {
        const template = templateSelect.value;

        if (template === 'text') {
            const input = document.getElementById('textInput');
            return input ? input.value : 'https://example.com';
        }

        if (template === 'wifi') {
            const ssid = document.getElementById('wifiSsid')?.value || 'MyWiFi';
            const pass = document.getElementById('wifiPassword')?.value || 'password123';
            const enc = document.getElementById('wifiEncryption')?.value || 'WPA';
            const hidden = document.getElementById('wifiHidden')?.value === 'true' ? ';H=true' : '';
            if (enc === 'nopass') return `WIFI:S:${ssid};T:nopass;${hidden};;`;
            return `WIFI:T:${enc};S:${ssid};P:${pass};${hidden};;`;
        }

        if (template === 'contact') {
            const name = document.getElementById('contactName')?.value || 'John Doe';
            const phone = document.getElementById('contactPhone')?.value || '';
            const email = document.getElementById('contactEmail')?.value || '';
            const company = document.getElementById('contactCompany')?.value || '';
            const website = document.getElementById('contactWebsite')?.value || '';
            return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nORG:${company}\nURL:${website}\nEND:VCARD`;
        }

        if (template === 'event') {
            const title = document.getElementById('eventTitle')?.value || 'Event';
            const date = document.getElementById('eventDate')?.value || '';
            const start = document.getElementById('eventStart')?.value || '00:00';
            const end = document.getElementById('eventEnd')?.value || '23:59';
            const location = document.getElementById('eventLocation')?.value || '';
            const description = document.getElementById('eventDescription')?.value || '';
            const startDT = date ? `${date}T${start}` : '';
            const endDT = date ? `${date}T${end}` : '';
            return `BEGIN:VEVENT\nSUMMARY:${title}\nDTSTART:${startDT}\nDTEND:${endDT}\nLOCATION:${location}\nDESCRIPTION:${description}\nEND:VEVENT`;
        }

        return 'https://example.com';
    }

    // ---------- SCHEDULED GENERATION ----------
    function scheduleGenerate() {
        clearTimeout(generationTimeout);
        generationTimeout = setTimeout(() => {
            generateQR();
            addToHistory(currentText);
        }, 400);
    }

    // ---------- CORE QR GENERATION ----------
    function generateQR() {
        const text = currentText || 'https://example.com';
        if (!text) return false;

        // Animation
        qrContainerWrap.classList.remove('generating');
        void qrContainerWrap.offsetWidth;
        qrContainerWrap.classList.add('generating');

        qrContainer.innerHTML = '';
        const size = parseInt(sizeSlider.value);
        const fg = fgColor.value;
        const bg = bgColor.value;

        currentQR = new QRCode(qrContainer, {
            text: text,
            width: size,
            height: size,
            colorDark: fg,
            colorLight: bg,
            correctLevel: QRCode.CorrectLevel.H
        });

        // Apply corner style
        applyCornerStyle();

        if (logoDataURL) applyLogoOverlay();

        // Update data preview
        dataPreviewText.textContent = text.length > 60 ? text.substring(0, 60) + '…' : text;

        return true;
    }

    function applyCornerStyle() {
        const canvas = qrContainer.querySelector('canvas');
        if (!canvas) return;
        // Note: Full corner style implementation requires module detection.
        // For this demo, we keep the standard QR style.
        // In production, use a library that supports custom module shapes.
    }

    function applyLogoOverlay() {
        const qrCanvas = qrContainer.querySelector('canvas');
        if (!qrCanvas) return;
        const ctx = qrCanvas.getContext('2d');
        const size = parseInt(sizeSlider.value);
        const logoSize = size * 0.22;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 5, 0, Math.PI * 2);
        ctx.fillStyle = bgColor.value;
        ctx.fill();
        ctx.restore();

        const img = new Image();
        img.onload = function() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, x, y, logoSize, logoSize);
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        };
        img.src = logoDataURL;
    }

    // ---------- ANALYTICS ----------
    function updateAnalytics() {
        const scans = analytics.scans || [];
        const total = scans.length;
        const unique = new Set(scans.map(s => s.text)).size;
        const today = scans.filter(s => {
            const d = new Date(s.timestamp);
            const now = new Date();
            return d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear();
        }).length;
        const last = scans.length > 0 ? new Date(scans[scans.length - 1].timestamp).toLocaleString() : '—';

        totalScansEl.textContent = total;
        uniqueCodesEl.textContent = unique;
        todayScansEl.textContent = today;
        lastScanEl.textContent = last;
        lastScanEl.style.fontSize = scans.length > 0 ? '0.8rem' : '1rem';

        localStorage.setItem('qrAnalytics', JSON.stringify(analytics));
    }

    function logScan(text) {
        if (!text) return;
        analytics.scans.push({
            text: text,
            timestamp: Date.now()
        });
        if (analytics.scans.length > 1000) analytics.scans = analytics.scans.slice(-1000);
        updateAnalytics();
    }

    clearAnalyticsBtn.addEventListener('click', function() {
        if (confirm('Clear all analytics data?')) {
            analytics = { scans: [], total: 0 };
            localStorage.setItem('qrAnalytics', JSON.stringify(analytics));
            updateAnalytics();
            showToast('📊 Analytics cleared', 'warning');
        }
    });

    // ---------- HISTORY ----------
    function renderHistory() {
        historyGrid.innerHTML = '';
        historyCount.textContent = history.length;

        if (history.length === 0) {
            historyGrid.innerHTML =
                '<div class="history-empty">No QR codes saved yet. Generate one to get started!</div>';
            return;
        }

        const reversed = [...history].reverse().slice(0, 30);
        reversed.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';

            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');

            const tempDiv = document.createElement('div');
            const tempQR = new QRCode(tempDiv, {
                text: item,
                width: 100,
                height: 100,
                colorDark: '#1a202c',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            const tempCanvas = tempDiv.querySelector('canvas');
            if (tempCanvas) ctx.drawImage(tempCanvas, 0, 0, 100, 100);

            const label = document.createElement('div');
            label.className = 'history-label';
            label.textContent = item.substring(0, 20) + (item.length > 20 ? '…' : '');

            const delBtn = document.createElement('button');
            delBtn.className = 'history-delete';
            delBtn.textContent = '×';
            delBtn.setAttribute('aria-label', 'Remove from history');
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const realIndex = history.length - 1 - index;
                history.splice(realIndex, 1);
                localStorage.setItem('qrHistory', JSON.stringify(history));
                renderHistory();
                showToast('🗑️ Removed from history', 'warning');
            });

            div.appendChild(canvas);
            div.appendChild(label);
            div.appendChild(delBtn);

            div.addEventListener('click', function() {
                currentText = item;
                const input = document.getElementById('textInput');
                if (input) input.value = item;
                generateQR();
                logScan(item);
                showToast('🔄 Loaded from history', 'info');
                document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
            });

            historyGrid.appendChild(div);
        });
    }

    function addToHistory(text) {
        if (!text || text.length < 2) return;
        history = history.filter(item => item !== text);
        history.push(text);
        if (history.length > 50) history = history.slice(-50);
        localStorage.setItem('qrHistory', JSON.stringify(history));
        renderHistory();
        logScan(text);
    }

    clearHistoryBtn.addEventListener('click', function() {
        if (confirm('Clear all scan history?')) {
            history = [];
            localStorage.setItem('qrHistory', JSON.stringify(history));
            renderHistory();
            showToast('🗑️ History cleared', 'warning');
        }
    });

    // ---------- EXPORT HISTORY AS JSON ----------
    exportHistoryBtn.addEventListener('click', function() {
        if (history.length === 0) {
            showToast('📭 No history to export', 'warning');
            return;
        }
        const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qr_history_${new Date().toISOString().slice(0,10)}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast(`📤 Exported ${history.length} items`, 'success');
    });

    // ---------- DOWNLOADS ----------
    document.getElementById('downloadPNG').addEventListener('click', function() {
        const container = document.getElementById('qrcode-container');
        html2canvas(container, {
            scale: 3,
            backgroundColor: bgColor.value,
            allowTaint: true,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('⬇️ PNG downloaded', 'success');
        }).catch(() => showToast('❌ Could not render PNG', 'error'));
    });

    document.getElementById('downloadSVG').addEventListener('click', function() {
        const text = currentText || 'https://example.com';
        if (!text) return;
        const size = parseInt(sizeSlider.value);
        const fg = fgColor.value;
        const bg = bgColor.value;
        const tempDiv = document.createElement('div');
        const tempQR = new QRCode(tempDiv, {
            text: text,
            width: size,
            height: size,
            colorDark: fg,
            colorLight: bg,
            correctLevel: QRCode.CorrectLevel.H
        });
        const svgElem = tempDiv.querySelector('svg');
        if (!svgElem) { showToast('❌ SVG generation failed', 'error'); return; }
        const svgData = new XMLSerializer().serializeToString(svgElem);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'qrcode.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('⬇️ SVG downloaded', 'success');
    });

    // ---------- PDF EXPORT ----------
    downloadPDF.addEventListener('click', function() {
        const text = currentText || 'https://example.com';
        if (!text) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const size = parseInt(sizeSlider.value);

        const tempDiv = document.createElement('div');
        const tempQR = new QRCode(tempDiv, {
            text: text,
            width: size,
            height: size,
            colorDark: fgColor.value,
            colorLight: bgColor.value,
            correctLevel: QRCode.CorrectLevel.H
        });
        const canvas = tempDiv.querySelector('canvas');
        if (!canvas) { showToast('❌ Could not generate QR for PDF', 'error'); return; }

        const imgData = canvas.toDataURL('image/png');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxDim = Math.min(pageWidth - margin * 2, pageHeight - margin * 2 - 30);
        const dim = Math.min(maxDim, 150);

        const x = (pageWidth - dim) / 2;
        const y = (pageHeight - dim) / 2 - 10;

        doc.addImage(imgData, 'PNG', x, y, dim, dim);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Generated by QR Studio Pro', pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.save('qrcode.pdf');
        showToast('📄 PDF downloaded', 'success');
    });

    // ---------- COPY TO CLIPBOARD ----------
    document.getElementById('copyToClipboard').addEventListener('click', function() {
        const container = document.getElementById('qrcode-container');
        html2canvas(container, {
            scale: 2,
            backgroundColor: bgColor.value,
            allowTaint: true,
            useCORS: true
        }).then(canvas => {
            canvas.toBlob(function(blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => {
                        const btn = document.getElementById('copyToClipboard');
                        const orig = btn.innerHTML;
                        btn.innerHTML = '✅ Copied!';
                        setTimeout(() => { btn.innerHTML = orig; }, 2000);
                        showToast('📋 Copied to clipboard!', 'success');
                    })
                    .catch(() => showToast('❌ Copy failed', 'error'));
            });
        }).catch(() => showToast('❌ Could not copy', 'error'));
    });

    // ---------- LOGO ----------
    logoUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            logoDataURL = event.target.result;
            generateQR();
            addToHistory(currentText + ' [with logo]');
            showToast('🖼️ Logo added!', 'success');
        };
        reader.readAsDataURL(file);
    });

    removeLogoBtn.addEventListener('click', function() {
        logoDataURL = null;
        logoUpload.value = '';
        generateQR();
        showToast('🖼️ Logo removed', 'info');
    });

    // ---------- DRAG & DROP LOGO ----------
    previewBox.addEventListener('dragover', function(e) {
        e.preventDefault();
        previewBox.classList.add('drag-over');
    });

    previewBox.addEventListener('dragleave', function(e) {
        e.preventDefault();
        previewBox.classList.remove('drag-over');
    });

    previewBox.addEventListener('drop', function(e) {
        e.preventDefault();
        previewBox.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                logoDataURL = event.target.result;
                generateQR();
                addToHistory(currentText + ' [with logo]');
                showToast('🖼️ Logo dropped!', 'success');
            };
            reader.readAsDataURL(files[0]);
        } else {
            showToast('❌ Please drop an image file', 'warning');
        }
    });

    // ---------- BULK GENERATION ----------
    bulkGenerateBtn.addEventListener('click', function() {
        if (!csvUpload.files || !csvUpload.files[0]) {
            showToast('⚠️ Please select a CSV file first', 'warning');
            return;
        }
        const file = csvUpload.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                showToast('⚠️ CSV must have a header and data rows', 'warning');
                return;
            }
            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
            let dataIndex = header.indexOf('data');
            if (dataIndex === -1) dataIndex = 0;

            const zip = new JSZip();
            const fg = fgColor.value;
            const bg = bgColor.value;
            const size = parseInt(sizeSlider.value);
            let rowCount = 0;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length <= dataIndex) continue;
                const data = cols[dataIndex];
                if (!data) continue;
                rowCount++;
                const tempDiv = document.createElement('div');
                const tempQR = new QRCode(tempDiv, {
                    text: data,
                    width: size,
                    height: size,
                    colorDark: fg,
                    colorLight: bg,
                    correctLevel: QRCode.CorrectLevel.H
                });
                const canvas = tempDiv.querySelector('canvas');
                if (canvas) {
                    const safeName = data.substring(0, 30).replace(/[^a-z0-9]/gi, '_') || `qr_${i}`;
                    const dataUrl = canvas.toDataURL('image/png').split(',')[1];
                    zip.file(`${safeName}.png`, dataUrl, { base64: true });
                }
            }

            if (rowCount === 0) {
                showToast('⚠️ No valid data rows found', 'warning');
                return;
            }

            bulkStatus.innerHTML = `⏳ Generating ZIP with ${rowCount} QR codes…`;
            zip.generateAsync({ type: 'blob' }).then(function(blob) {
                saveAs(blob, 'qrcodes_bulk.zip');
                bulkStatus.innerHTML = `✅ Success! Downloaded ZIP with ${rowCount} QR codes.`;
                showToast(`📦 Downloaded ZIP with ${rowCount} QR codes`, 'success');
            });
        };
        reader.readAsText(file);
    });

    // ---------- QR SCANNER ----------
    scanBtn.addEventListener('click', function() {
        scannerModal.classList.add('active');
        startScanner();
    });

    scannerCloseBtn.addEventListener('click', function() {
        scannerModal.classList.remove('active');
        stopScanner();
    });

    scannerModal.addEventListener('click', function(e) {
        if (e.target === scannerModal) {
            scannerModal.classList.remove('active');
            stopScanner();
        }
    });

    function startScanner() {
        if (html5Scanner) {
            html5Scanner.clear();
            html5Scanner = null;
        }

        scannerStatus.textContent = '⏳ Starting camera...';

        html5Scanner = new Html5Qrcode("scanner-container");

        html5Scanner.start({ facingMode: "environment" }, {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        }, onScanSuccess, onScanError).catch(err => {
            scannerStatus.textContent = '❌ Camera error: ' + err;
            showToast('❌ Camera access denied', 'error');
            console.error(err);
        });
    }

    function stopScanner() {
        if (html5Scanner) {
            html5Scanner.stop().then(() => {
                html5Scanner.clear();
                html5Scanner = null;
            }).catch(err => console.warn('Scanner stop error:', err));
        }
    }

    function onScanSuccess(decodedText, decodedResult) {
        scannerStatus.textContent = '✅ Scanned: ' + decodedText.substring(0, 30) + (decodedText.length > 30 ?
            '…' : '');

        currentText = decodedText;
        const input = document.getElementById('textInput');
        if (input) input.value = decodedText;

        templateSelect.value = 'text';
        renderTemplate('text');

        generateQR();
        addToHistory(decodedText);
        logScan(decodedText);
        showToast(`📷 Scanned: ${decodedText.substring(0, 30)}${decodedText.length > 30 ? '…' : ''}`, 'success');

        setTimeout(() => {
            scannerModal.classList.remove('active');
            stopScanner();
        }, 2000);
    }

    function onScanError(err) {
        // Silent errors
    }

    // ---------- KEYBOARD SHORTCUTS ----------
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter or Cmd+Enter = Generate
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const data = getTemplateData();
            if (data) {
                currentText = data;
                generateQR();
                addToHistory(currentText);
                showToast('🔄 QR generated', 'success');
            }
        }

        // Ctrl+S = Download PNG
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('downloadPNG').click();
        }

        // Ctrl+C = Copy (only if not in input field)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.target.closest('input, select, textarea')) {
            e.preventDefault();
            document.getElementById('copyToClipboard').click();
        }

        // Ctrl+Shift+D = Toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            darkModeToggle.click();
        }

        // Escape = Close scanner
        if (e.key === 'Escape') {
            if (scannerModal.classList.contains('active')) {
                scannerModal.classList.remove('active');
                stopScanner();
            }
        }
    });

    // ---------- AUTO-DETECT CLIPBOARD URL ----------
    document.addEventListener('DOMContentLoaded', function() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
                if (text && (text.startsWith('http://') || text.startsWith('https://') || text
                        .includes('.'))) {
                    const input = document.getElementById('textInput');
                    if (input && input.value === 'https://example.com') {
                        input.value = text;
                        currentText = text;
                        generateQR();
                        showToast('📋 Auto-detected URL from clipboard', 'info');
                    }
                }
            }).catch(() => {});
        }
    });

    // ---------- EVENT BINDINGS ----------
    templateSelect.addEventListener('change', function() {
        renderTemplate(this.value);
        showToast(`📋 Template: ${this.options[this.selectedIndex].text}`, 'info');
    });

    generateBtn.addEventListener('click', function() {
        const data = getTemplateData();
        if (data) {
            currentText = data;
            generateQR();
            addToHistory(currentText);
            showToast('🔄 QR generated', 'success');
        }
    });

    fgColor.addEventListener('input', generateQR);
    bgColor.addEventListener('input', generateQR);
    sizeSlider.addEventListener('input', function() {
        sizeLabel.textContent = this.value;
        generateQR();
    });

    // ---------- INIT ----------
    renderTemplate('text');
    renderHistory();
    updateAnalytics();

    // Show welcome toast
    setTimeout(() => {
        showToast('🚀 Welcome to QR Studio Pro!', 'info', 2500);
    }, 500);

})();