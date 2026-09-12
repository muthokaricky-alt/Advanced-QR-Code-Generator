// ============================================================
//  QR STUDIO - Full Application with Custom Corner Styles
// ============================================================
//whole app logic

(function() {
    'use strict';

    // ---------- DOM REFS ----------
    const getEl = (id) => document.getElementById(id);

    const fgColor = getEl('fgColor');
    const bgColor = getEl('bgColor');
    const sizeSlider = getEl('sizeSlider');
    const sizeLabel = getEl('sizeLabel');
    const logoUpload = getEl('logoUpload');
    const removeLogoBtn = getEl('removeLogoBtn');
    const generateBtn = getEl('generateBtn');
    const qrContainer = getEl('qrcode');
    const templateSelect = getEl('templateSelect');
    const templateFields = getEl('templateFields');
    const historyGrid = getEl('historyGrid');
    const historyCount = getEl('historyCount');
    const clearHistoryBtn = getEl('clearHistoryBtn');
    const exportHistoryBtn = getEl('exportHistoryBtn');
    const darkModeToggle = getEl('darkModeToggle');
    const csvUpload = getEl('csvUpload');
    const bulkGenerateBtn = getEl('bulkGenerateBtn');
    const bulkStatus = getEl('bulk-status');
    const scanBtn = getEl('scanBtn');
    const scannerModal = getEl('scannerModal');
    const scannerCloseBtn = getEl('scannerCloseBtn');
    const scannerContainer = getEl('scanner-container');
    const scannerStatus = getEl('scannerStatus');
    const cornerSelector = getEl('cornerSelector');
    const downloadPDF = getEl('downloadPDF');
    const previewBox = getEl('previewBox');
    const dataPreviewText = getEl('dataPreviewText');
    const toastContainer = getEl('toastContainer');

    const totalScansEl = getEl('totalScans');
    const uniqueCodesEl = getEl('uniqueCodes');
    const todayScansEl = getEl('todayScans');
    const lastScanEl = getEl('lastScan');
    const clearAnalyticsBtn = getEl('clearAnalyticsBtn');

    // ---------- STATE ----------
    let currentQR = null;
    let logoDataURL = null;
    let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
    let currentText = 'https://example.com';
    let generationTimeout = null;
    let html5Scanner = null;
    let cornerStyle = 'square';
    let analytics = JSON.parse(localStorage.getItem('qrAnalytics') || '{"scans":[],"total":0}');
    let isGenerating = false;

    // ---------- TOAST SYSTEM ----------
    function showToast(message, type = 'info', duration = 3000) {
        if (!toastContainer) return;
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
        if (!darkModeToggle) return;
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

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setDarkMode(!isDark);
            showToast(isDark ? '🌙 Dark mode off' : '☀️ Dark mode on', 'info');
        });
    }

    // ---------- CORNER STYLES ----------
    if (cornerSelector) {
        cornerSelector.addEventListener('click', function(e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            cornerSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            cornerStyle = btn.dataset.style;
            showToast(`🔲 Corner style: ${btn.textContent}`, 'info');
            generateQR();
        });
    }

    // ---------- TEMPLATE SYSTEM ----------
    const templates = {
        text: {
            fields: `
                    <div class="full-width control-group">
                        <label for="textInput">Enter text or URL</label>
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
        if (!templateFields) return;
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
        }, 50);
    }

    function getTemplateData() {
        const textInput = document.getElementById('textInput');
        if (textInput) {
            return textInput.value || 'https://example.com';
        }

        const template = templateSelect ? templateSelect.value : 'text';

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

    function scheduleGenerate() {
        clearTimeout(generationTimeout);
        generationTimeout = setTimeout(() => {
            generateQR();
            addToHistory(currentText);
        }, 400);
    }

    // ============================================================
    //  CORE QR GENERATION WITH CUSTOM CORNER STYLES
    // ============================================================
    function generateQR() {
        if (isGenerating) return;
        isGenerating = true;

        try {
            const textInput = document.getElementById('textInput');
            if (textInput) {
                currentText = textInput.value || 'https://example.com';
            }

            const text = currentText || 'https://example.com';
            if (!text) {
                isGenerating = false;
                return false;
            }

            console.log('Generating QR with corner style:', cornerStyle, 'for:', text);

            if (qrContainer) {
                qrContainer.innerHTML = '';
            } else {
                console.error('QR container not found');
                isGenerating = false;
                return false;
            }

            const size = parseInt(sizeSlider ? sizeSlider.value : 300) || 300;
            const fg = fgColor ? fgColor.value : '#111111';
            const bg = bgColor ? bgColor.value : '#ffffff';

            // Generate the QR code first using the library
            currentQR = new QRCode(qrContainer, {
                text: text,
                width: size,
                height: size,
                colorDark: fg,
                colorLight: bg,
                correctLevel: QRCode.CorrectLevel.H
            });

            // Wait for QR to render, then apply custom corner styles
            setTimeout(() => {
                applyCornerStyles();
            }, 50);

            // Update data preview
            if (dataPreviewText) {
                dataPreviewText.textContent = text.length > 60 ? text.substring(0, 60) + '…' : text;
            }

            // Apply logo if exists
            if (logoDataURL) {
                setTimeout(function() {
                    applyLogoOverlay();
                }, 200);
            }

            isGenerating = false;
            return true;
        } catch (error) {
            console.error('QR Generation Error:', error);
            showToast('❌ Error generating QR', 'error');
            isGenerating = false;
            return false;
        }
    }

    // ============================================================
    //  CUSTOM CORNER STYLES
    // ============================================================
    function applyCornerStyles() {
        if (!qrContainer) return;

        const canvas = qrContainer.querySelector('canvas');
        if (!canvas) {
            console.log('Canvas not ready, retrying...');
            setTimeout(applyCornerStyles, 100);
            return;
        }

        console.log('Applying corner style:', cornerStyle);

        const ctx = canvas.getContext('2d');
        const size = parseInt(sizeSlider ? sizeSlider.value : 300) || 300;
        const fg = fgColor ? fgColor.value : '#111111';
        const bg = bgColor ? bgColor.value : '#ffffff';

        // Get the QR code data by scanning the canvas
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Find all modules (QR code pixels)
        // We look for pixels that match the foreground color
        const fgRgb = hexToRgb(fg);
        const threshold = 30;

        // First, identify which pixels are part of the QR code
        const moduleSize = Math.floor(size / 25); // Approximate module size
        const modules = [];

        // Sample the canvas to find module positions
        for (let row = 0; row < 25; row++) {
            for (let col = 0; col < 25; col++) {
                const x = Math.floor(col * moduleSize + moduleSize / 2);
                const y = Math.floor(row * moduleSize + moduleSize / 2);
                const idx = (y * size + x) * 4;

                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                const isFg = Math.abs(r - fgRgb.r) < threshold &&
                    Math.abs(g - fgRgb.g) < threshold &&
                    Math.abs(b - fgRgb.b) < threshold;

                if (isFg) {
                    modules.push({ row, col, x: col * moduleSize, y: row * moduleSize });
                }
            }
        }

        // Clear the canvas and redraw with custom corners
        // We need to redraw everything from scratch

        // First, fill background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);

        // Now draw each module with the selected corner style
        const cornerRadius = cornerStyle === 'square' ? 0 :
            cornerStyle === 'rounded' ? moduleSize * 0.3 :
            moduleSize * 0.5; // circle

        modules.forEach(module => {
            const x = module.x;
            const y = module.y;
            const w = moduleSize;
            const h = moduleSize;

            ctx.fillStyle = fg;

            if (cornerStyle === 'square') {
                // Square corners
                ctx.fillRect(x, y, w, h);
            } else if (cornerStyle === 'rounded') {
                // Rounded corners
                const r = Math.min(w, h) * 0.25;
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
                ctx.fill();
            } else if (cornerStyle === 'circle') {
                // Circle corners
                const radius = Math.min(w, h) / 2;
                const cx = x + w / 2;
                const cy = y + h / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
        });

        console.log('Corner style applied:', cornerStyle);
    }

    // Helper: Convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    // ============================================================
    //  LOGO OVERLAY
    // ============================================================
    function applyLogoOverlay() {
        if (!qrContainer || !logoDataURL) {
            console.log('No logo to apply');
            return;
        }

        const qrCanvas = qrContainer.querySelector('canvas');
        if (!qrCanvas) {
            console.log('QR canvas not found, retrying...');
            setTimeout(applyLogoOverlay, 100);
            return;
        }

        console.log('Applying logo overlay...');

        const ctx = qrCanvas.getContext('2d');
        const size = parseInt(sizeSlider ? sizeSlider.value : 300) || 300;
        const logoSize = size * 0.22;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;

        // Draw white background circle behind logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = bgColor ? bgColor.value : '#ffffff';
        ctx.fill();
        ctx.restore();

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            console.log('Logo image loaded, drawing...');
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
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            console.log('Logo applied successfully!');
            showToast('🖼️ Logo applied to QR!', 'success', 1500);
        };

        img.onerror = function() {
            console.error('Failed to load logo image');
            showToast('❌ Failed to load logo', 'error');
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

        if (totalScansEl) totalScansEl.textContent = total;
        if (uniqueCodesEl) uniqueCodesEl.textContent = unique;
        if (todayScansEl) todayScansEl.textContent = today;
        if (lastScanEl) {
            lastScanEl.textContent = last;
            lastScanEl.style.fontSize = scans.length > 0 ? '0.8rem' : '1rem';
        }

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

    if (clearAnalyticsBtn) {
        clearAnalyticsBtn.addEventListener('click', function() {
            if (confirm('Clear all analytics data?')) {
                analytics = { scans: [], total: 0 };
                localStorage.setItem('qrAnalytics', JSON.stringify(analytics));
                updateAnalytics();
                showToast('📊 Analytics cleared', 'warning');
            }
        });
    }

    // ---------- HISTORY ----------
    function renderHistory() {
        if (!historyGrid) return;
        historyGrid.innerHTML = '';
        if (historyCount) historyCount.textContent = history.length;

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
                document.querySelector('.app').scrollIntoView({ behavior: 'smooth' });
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

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function() {
            if (confirm('Clear all scan history?')) {
                history = [];
                localStorage.setItem('qrHistory', JSON.stringify(history));
                renderHistory();
                showToast('🗑️ History cleared', 'warning');
            }
        });
    }

    if (exportHistoryBtn) {
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
    }

    // ---------- DOWNLOADS ----------
    document.getElementById('downloadPNG')?.addEventListener('click', function() {
        const container = document.getElementById('qrcode-container');
        if (!container || !qrContainer || !qrContainer.querySelector('canvas')) {
            showToast('❌ No QR code to download', 'error');
            return;
        }
        html2canvas(container, {
            scale: 3,
            backgroundColor: bgColor ? bgColor.value : '#ffffff',
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

    document.getElementById('downloadSVG')?.addEventListener('click', function() {
        const text = currentText || 'https://example.com';
        if (!text) return;
        const size = parseInt(sizeSlider ? sizeSlider.value : 300) || 300;
        const fg = fgColor ? fgColor.value : '#111111';
        const bg = bgColor ? bgColor.value : '#ffffff';
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

    if (downloadPDF) {
        downloadPDF.addEventListener('click', function() {
            const text = currentText || 'https://example.com';
            if (!text) return;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const size = parseInt(sizeSlider ? sizeSlider.value : 300) || 300;

            const tempDiv = document.createElement('div');
            const tempQR = new QRCode(tempDiv, {
                text: text,
                width: size,
                height: size,
                colorDark: fgColor ? fgColor.value : '#111111',
                colorLight: bgColor ? bgColor.value : '#ffffff',
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
    }

    document.getElementById('copyToClipboard')?.addEventListener('click', function() {
        const container = document.getElementById('qrcode-container');
        if (!container || !qrContainer || !qrContainer.querySelector('canvas')) {
            showToast('❌ No QR code to copy', 'error');
            return;
        }
        html2canvas(container, {
            scale: 2,
            backgroundColor: bgColor ? bgColor.value : '#ffffff',
            allowTaint: true,
            useCORS: true
        }).then(canvas => {
            canvas.toBlob(function(blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => {
                        const btn = document.getElementById('copyToClipboard');
                        if (btn) {
                            const orig = btn.innerHTML;
                            btn.innerHTML = '✅ Copied!';
                            setTimeout(() => { btn.innerHTML = orig; }, 2000);
                        }
                        showToast('📋 Copied to clipboard!', 'success');
                    })
                    .catch(() => showToast('❌ Copy failed', 'error'));
            });
        }).catch(() => showToast('❌ Could not copy', 'error'));
    });

    // ---------- LOGO ----------
    if (logoUpload) {
        logoUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) {
                console.log('No file selected');
                return;
            }

            if (!file.type.startsWith('image/')) {
                showToast('❌ Please select an image file', 'error');
                this.value = '';
                return;
            }

            console.log('Logo file selected:', file.name);

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    logoDataURL = event.target.result;
                    console.log('Logo loaded, applying to QR...');
                    generateQR();
                    showToast('🖼️ Logo added!', 'success');
                } catch (error) {
                    console.error('Error loading logo:', error);
                    showToast('❌ Failed to load logo', 'error');
                }
            };
            reader.onerror = function() {
                showToast('❌ Failed to read file', 'error');
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', function() {
            console.log('Removing logo...');
            logoDataURL = null;
            if (logoUpload) logoUpload.value = '';
            generateQR();
            showToast('🖼️ Logo removed', 'info');
        });
    }

    // ---------- DRAG & DROP LOGO ----------
    if (previewBox) {
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
    }

    // ---------- BULK GENERATION ----------
    if (bulkGenerateBtn && csvUpload && bulkStatus) {
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
                const fg = fgColor ? fgColor.value : '#111111';
                const bg = bgColor ? bgColor.value : '#ffffff';
                const size = parseInt(sizeSlider ? sizeSlider.value : 300) || 300;
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
    }

    // ---------- QR SCANNER ----------
    if (scanBtn && scannerModal && scannerCloseBtn && scannerContainer && scannerStatus) {
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
    }

    function startScanner() {
        if (!scannerContainer || !scannerStatus) return;
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
        if (scannerStatus) {
            scannerStatus.textContent = '✅ Scanned: ' + decodedText.substring(0, 30) + (decodedText.length > 30 ?
                '…' : '');
        }

        currentText = decodedText;
        const input = document.getElementById('textInput');
        if (input) input.value = decodedText;

        if (templateSelect) templateSelect.value = 'text';
        renderTemplate('text');

        generateQR();
        addToHistory(decodedText);
        logScan(decodedText);
        showToast(`📷 Scanned: ${decodedText.substring(0, 30)}${decodedText.length > 30 ? '…' : ''}`, 'success');

        setTimeout(() => {
            if (scannerModal) scannerModal.classList.remove('active');
            stopScanner();
        }, 2000);
    }

    function onScanError(err) {
        // Silent errors
    }

    // ---------- KEYBOARD SHORTCUTS ----------
    document.addEventListener('keydown', function(e) {
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

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('downloadPNG')?.click();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.target.closest('input, select, textarea')) {
            e.preventDefault();
            document.getElementById('copyToClipboard')?.click();
        }

        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            if (darkModeToggle) darkModeToggle.click();
        }

        if (e.key === 'Escape') {
            if (scannerModal && scannerModal.classList.contains('active')) {
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
    if (templateSelect) {
        templateSelect.addEventListener('change', function() {
            renderTemplate(this.value);
            showToast(`📋 Template: ${this.options[this.selectedIndex].text}`, 'info');
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            const data = getTemplateData();
            if (data) {
                currentText = data;
                generateQR();
                addToHistory(currentText);
                showToast('🔄 QR generated', 'success');
            }
        });
    }

    if (fgColor) fgColor.addEventListener('input', generateQR);
    if (bgColor) bgColor.addEventListener('input', generateQR);
    if (sizeSlider) {
        sizeSlider.addEventListener('input', function() {
            if (sizeLabel) sizeLabel.textContent = this.value;
            generateQR();
        });
    }

    // ---------- INIT ----------
    renderTemplate('text');
    renderHistory();
    updateAnalytics();

    setTimeout(function() {
        const input = document.getElementById('textInput');
        if (input) {
            currentText = input.value || 'https://example.com';
            generateQR();
            showToast('🚀 QR Studio ready!', 'info', 2000);
        }
    }, 300);

})();
