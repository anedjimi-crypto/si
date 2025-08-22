
/**
 * Conseiller RGPD IA - Application JavaScript
 * Powered by Symplissime AI
 * Version 3.1
 */

// Configuration de Marked pour la coloration syntaxique
if (typeof marked !== 'undefined') {
    marked.setOptions({
        highlight: (code, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, {language: lang}).value;
            }
            return hljs.highlightAuto(code).value;
        }
    });
}

class ConseillerRGPDApp {
    constructor() {
        this.config = window.RGPD_CONFIG || {};
        this.fontScale = 1;
        this.isProcessing = false;
        this.messageHistory = [];
        this.themes = window.RGPD_THEMES || [];
        this.fontClasses = ['font-inter', 'font-roboto', 'font-lato', 'font-poppins', 'font-jetbrains'];
        this.debugLog = [];
        // Cache frequently accessed DOM elements
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.toast = document.getElementById('toast');
        this.datetimeElement = document.getElementById('datetime');
        this.themeMenu = document.getElementById('themeMenu');
        this.fontMenu = document.getElementById('fontMenu');
        this.debugPanel = document.getElementById('debugPanel');
        this.debugContent = document.getElementById('debugContent');
        this.debugInfo = document.getElementById('debugInfo');
        this.debugClose = document.getElementById('debugClose');
        
        this.init();
    }

    init() {
        this.loadSavedPreferences();
        this.buildThemeMenu();
        this.bindEvents();
        this.updateDateTime();
        this.showWelcomeMessage();
        this.focusInput();
        this.updateSendButtonState();
        this.logAction('Application initialisée');
        this.updateDebugInfo();

        // Mise à jour de l'heure chaque seconde
        setInterval(() => this.updateDateTime(), 1000);
    }

    loadSavedPreferences() {
        const savedFontScale = localStorage.getItem('rgpd_fontScale');
        if (savedFontScale) {
            this.fontScale = parseFloat(savedFontScale);
            document.documentElement.style.setProperty('--font-scale', this.fontScale);
        }

        const savedTheme = localStorage.getItem('rgpd_theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.textContent = '☀️';
            }
        }

        const savedColorTheme = localStorage.getItem('rgpd_colorTheme');
        this.applyColorTheme(savedColorTheme || '', true);

        const savedFont = localStorage.getItem('rgpd_font');
        if (savedFont && this.fontClasses.includes(savedFont)) {
            document.body.classList.add(savedFont);
        }
    }

    buildThemeMenu() {
        if (!this.themeMenu) return;
        this.themeMenu.innerHTML = '';
        this.themes.forEach(theme => {
            const option = document.createElement('div');
            option.className = 'theme-option';
            option.setAttribute('data-theme', theme.id);
            option.textContent = theme.name;
            this.themeMenu.appendChild(option);
        });
    }

    bindEvents() {
        // Événement de soumission du formulaire
        const chatForm = document.getElementById('chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Effets visuels pendant la frappe
        if (this.messageInput) {
            let inputRaf;
            this.messageInput.addEventListener('input', () => {
                cancelAnimationFrame(inputRaf);
                inputRaf = requestAnimationFrame(() => {
                    const hasText = this.messageInput.value.trim().length > 0;
                    this.messageInput.classList.toggle('typing', hasText);
                    this.updateSendButtonState();
                });
            });
        }

        if (this.themeMenu) {
            this.themeMenu.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                if (theme !== null) {
                    this.applyColorTheme(theme);
                    this.hideThemeMenu();
                }
            });

            document.addEventListener('click', (e) => {
                const toggle = document.getElementById('colorThemeToggle');
                if (toggle && !this.themeMenu.contains(e.target) && e.target !== toggle) {
                    this.hideThemeMenu();
                }
            });
        }

        if (this.fontMenu) {
            this.fontMenu.addEventListener('click', (e) => {
                const font = e.target.getAttribute('data-font');
                if (font !== null) {
                    this.applyFont(font);
                    this.hideFontMenu();
                }
            });

            document.addEventListener('click', (e) => {
                const toggle = document.getElementById('fontToggle');
                if (toggle && !this.fontMenu.contains(e.target) && e.target !== toggle) {
                    this.hideFontMenu();
                }
            });
        }

        if (this.debugClose) {
            this.debugClose.addEventListener('click', () => this.toggleDebug());
        }

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Prévention de la fermeture accidentelle avec des données non sauvegardées
        window.addEventListener('beforeunload', (e) => {
            if (this.messageHistory.length > 1) { // Plus que le message de bienvenue
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    handleKeyboardShortcuts(e) {
        // Press "/" to focus input
        if (e.key === '/' && document.activeElement !== this.messageInput) {
            e.preventDefault();
            this.focusInput();
        }
        
        // Ctrl+Enter pour envoyer
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const form = document.getElementById('chatForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        if (this.isProcessing) return;

        const messageInput = this.messageInput;
        const message = messageInput.value.trim();
        
        if (!message) {
            this.showToast('Veuillez saisir un message', 'warning');
            return;
        }

        if (message.length > 1000) {
            this.showToast('Message trop long (max 1000 caractères)', 'error');
            return;
        }

        messageInput.value = '';
        this.updateSendButtonState();
        await this.sendMessage(message);
    }

    async sendMessage(message) {
        this.addMessage(message, true);
        this.showTyping();
        this.setProcessingState(true);

        try {
            const formData = new FormData();
            formData.append('action', 'chat');
            formData.append('message', message);
            formData.append('workspace', this.config.WORKSPACE);

            const response = await fetch(this.config.API_ENDPOINT, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Erreur HTTP: ${response.status}`);
            }

            this.hideTyping();

            const messageEl = this.addMessage('', false, false);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                this.streamMessage(messageEl, chunk);
            }
            this.finishStreaming(messageEl);
            this.updateStatus(true, 'Connecté');
        } catch (error) {
            console.error('Erreur de communication:', error);
            this.hideTyping();
            this.addMessage(`Erreur : ${error.message}`, false, true);
            this.updateStatus(false, 'Erreur');
            this.showToast('Problème de connexion', 'error');
        } finally {
            this.setProcessingState(false);
        }
    }

    setProcessingState(processing) {
        this.isProcessing = processing;
        const messageInput = this.messageInput;
        const sendButton = this.sendButton;
        
        if (messageInput) {
            messageInput.disabled = processing;
        }
        
        if (sendButton) {
            sendButton.disabled = processing;
            if (processing) {
                sendButton.classList.add('loading');
            } else {
                sendButton.classList.remove('loading');
            }
        }

        this.updateStatus(processing ? null : true, processing ? 'Traitement...' : 'Connecté');
        this.updateSendButtonState();
    }

    updateSendButtonState() {
        const sendButton = this.sendButton;
        if (!sendButton) return;
        const hasText = this.messageInput && this.messageInput.value.trim().length > 0;
        sendButton.classList.toggle('active', hasText && !this.isProcessing && !sendButton.disabled);
    }

    addMessage(content, isUser = false, isError = false) {
        const chatMessages = this.chatMessages;
        if (!chatMessages) return;

        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${isUser ? 'user' : 'bot'}`;
        
        const avatar = document.createElement('div');
        avatar.className = `avatar ${isUser ? 'user' : 'bot'}`;
        avatar.textContent = isUser ? 'U' : 'R';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const message = document.createElement('div');
        message.className = `message ${isUser ? 'user' : 'bot'} ${isError ? 'error' : ''}`;

        // Sécurisation et rendu du contenu
        if (!isUser && !isError) {
            let html;
            try {
                html = marked.parse(content);
                html = DOMPurify.sanitize(html);
                html = typogr.typogrify(html);
                message.innerHTML = html;
            } catch (e) {
                // Fallback: render as plain text if Markdown parsing fails
                message.textContent = content;
            }
        } else {
            message.textContent = content;
        }
        
        messageContent.appendChild(message);
        
        // Actions pour les messages du bot (non-erreur)
        if (!isUser && !isError) {
            const actions = this.createMessageActions(content);
            messageContent.appendChild(actions);
        }
        
        wrapper.appendChild(avatar);
        wrapper.appendChild(messageContent);
        chatMessages.appendChild(wrapper);

        // Coloration syntaxique pour les messages du bot
        if (!isUser && !isError) {
            wrapper.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
        
        // Enregistrer dans l'historique
        this.messageHistory.push({ content, isUser, isError, timestamp: new Date() });
        if (isUser) {
            this.logAction(`Utilisateur: ${content}`);
        } else if (isError) {
            this.logAction(`Erreur: ${content}`);
        }

        this.scrollToBottom();
        return message;
    }

    streamMessage(messageElement, text) {
        if (messageElement) {
            messageElement.textContent += text;
            this.scrollToBottom();
        }
    }

    finishStreaming(messageElement) {
        if (messageElement) {
            const fullText = messageElement.textContent;
            let html;
            try {
                html = marked.parse(fullText);
                html = DOMPurify.sanitize(html);
                html = typogr.typogrify(html);
            } catch (e) {
                html = DOMPurify.sanitize('<div class="error-message">Erreur lors de l\'affichage du message.</div>');
                // Optionally, log the error for debugging:
                // console.error('Markdown parsing error:', e);
            }
            messageElement.innerHTML = html;
            messageElement.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
            const messageContent = messageElement.parentElement;
            if (messageContent) {
                const oldActions = messageContent.querySelector('.message-actions');
                if (oldActions) oldActions.remove();
                const actions = this.createMessageActions(fullText);
                messageContent.appendChild(actions);
            }
            if (this.messageHistory.length > 0) {
                this.messageHistory[this.messageHistory.length - 1].content = fullText;
            }
            this.logAction(`Bot: ${fullText}`);
        }
    }

    createMessageActions(content) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        // Bouton Copier
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn';
        copyBtn.innerHTML = '📋 Copier';
        copyBtn.onclick = () => this.copyToClipboard(content);
        
        // Bouton Enregistrer
        const saveBtn = document.createElement('button');
        saveBtn.className = 'action-btn';
        saveBtn.innerHTML = '💾 Enregistrer';
        saveBtn.onclick = () => this.saveAsFile(content);
        
        // Bouton Email
        const emailBtn = document.createElement('button');
        emailBtn.className = 'action-btn';
        emailBtn.innerHTML = '📧 Email';
        emailBtn.onclick = () => this.sendByEmail(content);
        
        actions.appendChild(copyBtn);
        actions.appendChild(saveBtn);
        actions.appendChild(emailBtn);
        
        return actions;
    }

    showTyping() {
        const chatMessages = this.chatMessages;
        if (!chatMessages) return;

        // Supprimer l'indicateur existant s'il y en a un
        this.hideTyping();

        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        wrapper.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar bot';
        avatar.textContent = 'R';
        
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        
        wrapper.appendChild(avatar);
        wrapper.appendChild(typing);
        chatMessages.appendChild(wrapper);
        
        this.scrollToBottom();
    }

    hideTyping() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    showWelcomeMessage() {
        const welcomeMessage = `👋 Bonjour ! Je suis votre Conseiller RGPD IA powered by Symplissime AI. Je peux vous accompagner sur tous les aspects de la protection des données :

• 📋 Conformité RGPD et réglementations européennes
• 🔒 Protection et sécurisation des données personnelles  
• 📝 Rédaction de politiques de confidentialité et mentions légales
• ⚖️ Droits des personnes concernées (accès, rectification, effacement...)
• 🛡️ Mesures de sécurité techniques et organisationnelles
• 📊 Analyses d'impact relatives à la protection des données (AIPD)
• 🏢 Mise en conformité des entreprises et organisations
• 📞 Gestion des violations de données et notifications CNIL

Comment puis-je vous accompagner dans votre démarche de conformité RGPD aujourd'hui ?`;

        setTimeout(() => {
            this.addMessage(welcomeMessage, false);
            this.logAction(`Bot: ${welcomeMessage}`);
            this.updateStatus(true, 'Connecté');
        }, 1000);
    }

    updateDateTime() {
        const el = this.datetimeElement;
        if (!el) return;

        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');

        el.textContent = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    updateStatus(connected, text = null) {
        const statusDot = this.statusDot;
        const statusText = this.statusText;

        if (!statusDot || !statusText) return;

        statusDot.classList.remove('error');

        if (connected === true) {
            statusText.textContent = text || 'Connecté';
        } else if (connected === false) {
            statusDot.classList.add('error');
            statusText.textContent = text || 'Erreur';
        } else {
            // État neutre (en cours de traitement)
            statusText.textContent = text || 'En cours...';
        }
    }

    scrollToBottom() {
        const chatMessages = this.chatMessages;
        if (chatMessages) {
            requestAnimationFrame(() => {
                // Prefer scrollTo with smooth behavior if supported
                if ('scrollTo' in chatMessages) {
                    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                } else {
                    // Fallback for older browsers
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            });
        }
    }

    focusInput() {
        const messageInput = this.messageInput;
        if (messageInput && !messageInput.disabled) {
            messageInput.focus();
        }
    }

    // Méthodes utilitaires
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copié dans le presse-papiers !', 'success');
            this.logAction('Copie dans le presse-papiers');
        } catch (err) {
            console.error('Erreur de copie:', err);
            this.showToast('Échec de la copie', 'error');
            this.logAction('Erreur de copie');
        }
    }

    saveAsFile(text, filename = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `conseil-rgpd-${timestamp}.txt`;
        
        try {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || defaultFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showToast('Fichier enregistré !', 'success');
            this.logAction('Enregistrement dans un fichier');
        } catch (err) {
            console.error('Erreur de sauvegarde:', err);
            this.showToast('Erreur lors de la sauvegarde', 'error');
            this.logAction('Erreur de sauvegarde');
        }
    }

    sendByEmail(text) {
        try {
            const subject = encodeURIComponent('Conseil RGPD - IA Symplissime');
            const body = encodeURIComponent(text);
            const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
            window.location.href = mailtoLink;
            this.showToast('Ouverture du client mail...', 'success');
            this.logAction('Envoi par email');
        } catch (err) {
            console.error('Erreur email:', err);
            this.showToast('Erreur lors de l\'ouverture du mail', 'error');
            this.logAction('Erreur email');
        }
    }

    showToast(message, type = 'success') {
        const toast = this.toast;
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Contrôles de police
    increaseFontSize() {
        if (this.fontScale < 1.5) {
            this.fontScale += 0.1;
            this.updateFontScale();
            this.showToast('Taille du texte augmentée', 'success');
            this.logAction('Augmentation de la taille du texte');
        } else {
            this.showToast('Taille maximale atteinte', 'warning');
        }
    }

    decreaseFontSize() {
        if (this.fontScale > 0.7) {
            this.fontScale -= 0.1;
            this.updateFontScale();
            this.showToast('Taille du texte réduite', 'success');
            this.logAction('Réduction de la taille du texte');
        } else {
            this.showToast('Taille minimale atteinte', 'warning');
        }
    }

    updateFontScale() {
        document.documentElement.style.setProperty('--font-scale', this.fontScale);
        localStorage.setItem('rgpd_fontScale', this.fontScale);
    }

    toggleTheme() {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('rgpd_theme', isLight ? 'light' : 'dark');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = isLight ? '☀️' : '🌙';
        }
        this.showToast(isLight ? 'Thème clair activé' : 'Thème sombre activé', 'success');
        this.logAction(`Mode clair: ${isLight}`);
    }

    toggleThemeMenu() {
        if (this.themeMenu) {
            this.themeMenu.classList.toggle('hidden');
        }
    }

    hideThemeMenu() {
        if (this.themeMenu) {
            this.themeMenu.classList.add('hidden');
        }
    }

    toggleFontMenu() {
        if (this.fontMenu) {
            this.fontMenu.classList.toggle('hidden');
        }
    }

    hideFontMenu() {
        if (this.fontMenu) {
            this.fontMenu.classList.add('hidden');
        }
    }

    toggleDebug() {
        if (this.debugPanel) {
            this.debugPanel.classList.toggle('hidden');
            if (!this.debugPanel.classList.contains('hidden')) {
                this.updateDebugInfo();
            }
        }
    }

    updateDebugInfo() {
        if (this.debugInfo) {
            const info = [
                `Version: ${this.config.VERSION}`,
                `Utilisateur: ${this.config.USER}`,
                `Thème: ${localStorage.getItem('rgpd_colorTheme') || 'default'}`,
                `Police: ${localStorage.getItem('rgpd_font') || 'default'}`
            ];
            this.debugInfo.innerHTML = info.map(i => `<div>${i}</div>`).join('');
        }
    }

    logAction(action) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] ${action}`;
        this.debugLog.push(entry);
        if (this.debugContent) {
            const div = document.createElement('div');
            div.textContent = entry;
            this.debugContent.appendChild(div);
            this.debugContent.scrollTop = this.debugContent.scrollHeight;
        }
    }

    applyFont(font) {
        document.body.classList.remove(...this.fontClasses);
        if (font) {
            document.body.classList.add(font);
        }
        localStorage.setItem('rgpd_font', font);
        const fontMap = {
            'font-inter': 'Inter',
            'font-roboto': 'Roboto',
            'font-lato': 'Lato',
            'font-poppins': 'Poppins',
            'font-jetbrains': 'JetBrains Mono'
        };
        const fontName = fontMap[font] || 'défaut';
        this.showToast(`Police ${fontName} activée`, 'success');
        this.logAction(`Police changée: ${fontName}`);
        this.updateDebugInfo();
    }

    applyColorTheme(themeId, silent = false) {
        const theme = this.themes.find(t => t.id === themeId) || this.themes[0];
        const root = document.documentElement;
        Object.entries(theme.vars).forEach(([key, val]) => root.style.setProperty(key, val));
        localStorage.setItem('rgpd_colorTheme', themeId);
        if (!silent) {
            this.showToast(`Thème ${theme.name} activé`, 'success');
        }
        this.logAction(`Thème changé: ${theme.name}`);
        this.updateDebugInfo();
    }

    // Méthode pour exporter tout l'historique
    exportChatHistory() {
        if (this.messageHistory.length <= 1) {
            this.showToast('Aucun historique à exporter', 'warning');
            return;
        }

        const history = this.messageHistory
            .filter(msg => !msg.isError)
            .map(msg => {
                const sender = msg.isUser ? 'Utilisateur' : 'Conseiller RGPD IA';
                const timestamp = msg.timestamp.toLocaleString('fr-FR');
                return `[${timestamp}] ${sender}:\n${msg.content}\n`;
            })
            .join('\n---\n\n');

        const header = `Historique de conversation - Conseiller RGPD IA
Powered by Symplissime AI
Généré le: ${new Date().toLocaleString('fr-FR')}

===================================================

`;

        this.saveAsFile(header + history, `historique-rgpd-${new Date().toISOString().slice(0, 10)}.txt`);
        this.logAction('Export de l\'historique de conversation');
    }

    // Méthode pour vider l'historique
    clearHistory() {
        if (confirm('Êtes-vous sûr de vouloir effacer l\'historique de conversation ?')) {
            const chatMessages = this.chatMessages;
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            this.messageHistory = [];
            this.showWelcomeMessage();
            this.showToast('Historique effacé', 'success');
            this.logAction('Historique effacé');
        }
    }
}

// Initialisation de l'application
let rgpdApp;

document.addEventListener('DOMContentLoaded', function() {
    rgpdApp = new ConseillerRGPDApp();
});

// Exposition globale pour les boutons HTML
window.rgpdApp = {
    increaseFontSize: () => rgpdApp?.increaseFontSize(),
    decreaseFontSize: () => rgpdApp?.decreaseFontSize(),
    toggleTheme: () => rgpdApp?.toggleTheme(),
    toggleThemeMenu: () => rgpdApp?.toggleThemeMenu(),
    toggleFontMenu: () => rgpdApp?.toggleFontMenu(),
    toggleDebug: () => rgpdApp?.toggleDebug(),
    exportHistory: () => rgpdApp?.exportChatHistory(),
    clearHistory: () => rgpdApp?.clearHistory()
};

// Service Worker registration with development safeguard
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

        if (isLocalhost) {
            console.log('Service Worker disabled for development environment');
        } else {
            navigator.serviceWorker.register('sw.js')
                .then(() => {
                    console.log('Service Worker registered successfully');
                })
                .catch(error => {
                    console.error('SW registration failed:', error);
                });
        }
    });
}
