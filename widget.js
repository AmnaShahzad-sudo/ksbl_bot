(function () {

    const markedScript = document.createElement('script');
    markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    document.head.appendChild(markedScript);

    let config = {
        apiUrl: '',
        apiKey: '',
        botName: 'KSBLBot',
        logoUrl: '',
        userIconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        assistantIconUrl: ''
    };

    let chatHistory = [];

    function init(userConfig) {
        config = { ...config, ...userConfig };
        createUI();
    }

    function createUI() {

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = config.cssUrl || 'widget.css';
        document.head.appendChild(link);

        const bubbleIconHtml = `
            <div class="ksbl-chat-bubble-icon">
                <svg viewBox="0 0 24 24">
                    <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                </svg>
            </div>
        `;

        const headerLogoHtml = `
            <div class="header-logo-wrap">
                <img src="${config.logoUrl}" alt="KSBL">
            </div>
        `;

        const container = document.createElement('div');
        container.id = 'ksbl-chat-widget';

        container.innerHTML = `
            <div id="ksbl-chat-bubble">
                ${bubbleIconHtml}
            </div>

            <div id="ksbl-chat-window" class="ksbl-hidden">

                <div id="ksbl-chat-header">
                    <div class="header-info">
                        ${headerLogoHtml}
                        <div class="header-text">
                            <span class="header-name">${config.botName}</span>
                            <span class="header-status">● Online</span>
                        </div>
                    </div>
                    <button id="ksbl-chat-close">&times;</button>
                </div>

                <div id="ksbl-chat-messages"></div>

                <div id="ksbl-chat-input-area">
                    <textarea
                        id="ksbl-chat-input"
                        placeholder="Ask me anything about KSBL..."
                        rows="1"
                    ></textarea>
                    <button id="ksbl-chat-send">
                        <svg viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>

                <div id="ksbl-chat-footer">
                    Powered by KSBL AI
                </div>

            </div>
        `;

        document.body.appendChild(container);

        const bubble = document.getElementById('ksbl-chat-bubble');
        const windowEl = document.getElementById('ksbl-chat-window');
        const closeBtn = document.getElementById('ksbl-chat-close');
        const sendBtn = document.getElementById('ksbl-chat-send');
        const input = document.getElementById('ksbl-chat-input');

        bubble.onclick = () => {
            bubble.style.animation = 'none';
            bubble.classList.add('ksbl-hidden');
            windowEl.classList.remove('ksbl-hidden');
            input.focus();
        };

        closeBtn.onclick = () => {
            windowEl.classList.add('ksbl-hidden');
            bubble.classList.remove('ksbl-hidden');
            bubble.style.animation = 'ksblPulse 2s infinite';
        };

        sendBtn.onclick = sendMessage;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });

        addMessage('assistant', 'Assalamu Alaikum! I am KSBLBot. How can I help you today?');
    }

    function addMessage(role, text) {

        const msgArea = document.getElementById('ksbl-chat-messages');
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `ksbl-msg-wrapper ${role}`;

        const iconUrl = role === 'assistant'
            ? (config.assistantIconUrl || config.logoUrl)
            : config.userIconUrl;

        const iconHtml = `
            <div class="ksbl-msg-icon-wrap">
                <img src="${iconUrl}" alt="${role}">
            </div>
        `;

        msgWrapper.innerHTML = `
            ${role === 'assistant' ? iconHtml : ''}
            <div class="ksbl-msg ${role}">
                <div class="msg-content"></div>
            </div>
            ${role === 'user' ? iconHtml : ''}
        `;

        const content = msgWrapper.querySelector('.msg-content');

        if (role === 'assistant' && text && window.marked) {
            content.innerHTML = marked.parse(text);
        } else if (text) {
            content.innerText = text;
        }

        msgArea.appendChild(msgWrapper);
        msgArea.scrollTop = msgArea.scrollHeight;
        return content;
    }

    function showTypingIndicator() {

        const msgArea = document.getElementById('ksbl-chat-messages');
        const wrapper = document.createElement('div');
        wrapper.className = 'ksbl-msg-wrapper assistant';
        wrapper.id = 'ksbl-typing-indicator';

        const iconHtml = `
            <div class="ksbl-msg-icon-wrap">
                <img src="${config.logoUrl}" alt="assistant">
            </div>
        `;

        wrapper.innerHTML = `
            ${iconHtml}
            <div class="ksbl-msg assistant">
                <div class="ksbl-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        msgArea.appendChild(wrapper);
        msgArea.scrollTop = msgArea.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('ksbl-typing-indicator');
        if (indicator) indicator.remove();
    }

    async function sendMessage() {

        const input = document.getElementById('ksbl-chat-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.style.height = 'auto';

        addMessage('user', text);
        chatHistory.push({ role: 'user', content: text });

        showTypingIndicator();

        try {
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': config.apiKey
                },
                body: JSON.stringify({
                    messages: chatHistory,
                    detail: 'concise'
                })
            });

            if (!response.ok) throw new Error('API error: ' + response.status);

            removeTypingIndicator();
            const loadingMsg = addMessage('assistant', '');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                botResponse += chunk;

                if (window.marked) {
                    loadingMsg.innerHTML = marked.parse(botResponse);
                } else {
                    loadingMsg.innerText = botResponse;
                }

                document.getElementById('ksbl-chat-messages').scrollTop =
                    document.getElementById('ksbl-chat-messages').scrollHeight;
            }

            chatHistory.push({ role: 'assistant', content: botResponse });

        } catch (error) {
            console.error('Chat Error:', error);
            removeTypingIndicator();
            addMessage('assistant', 'Sorry, I am having trouble connecting. Please try again later.');
        }
    }

    window.initKSBLBot = init;

})();
