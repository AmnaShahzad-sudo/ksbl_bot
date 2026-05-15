(function() {
    // Configuration - will be overridden by the init function
    let config = {
        apiUrl: '',
        apiKey: '',
        botName: 'KSBLBot',
        logoUrl: '',
        userIconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // Default beautiful user icon
        assistantIconUrl: '' // Will fallback to logoUrl
    };

    let chatHistory = [];
    let isMinimized = true;

    function init(userConfig) {
        config = { ...config, ...userConfig };
        createUI();
    }

    function createUI() {
        // Create Stylesheet Link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = config.cssUrl || 'widget.css';
        document.head.appendChild(link);

        // Create Main Container
        const container = document.createElement('div');
        container.id = 'ksbl-chat-widget';
        
        const logoHtml = config.logoUrl ? `<img src="${config.logoUrl}" alt="Chat">` : `<div class="ksbl-logo-fallback">K</div>`;
        
        container.innerHTML = `
            <div id="ksbl-chat-bubble">
                ${logoHtml}
            </div>
            <div id="ksbl-chat-window" class="ksbl-hidden">
                <div id="ksbl-chat-header">
                    <div class="header-info">
                        ${logoHtml}
                        <span>${config.botName}</span>
                    </div>
                    <button id="ksbl-chat-close">&times;</button>
                </div>
                <div id="ksbl-chat-messages"></div>
                <div id="ksbl-chat-input-area">
                    <textarea id="ksbl-chat-input" placeholder="Type your message..." rows="1"></textarea>
                    <button id="ksbl-chat-send">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                    </button>
                </div>
                <div id="ksbl-chat-footer">Powered by KSBL AI</div>
            </div>
        `;
        document.body.appendChild(container);

        // Event Listeners
        const bubble = document.getElementById('ksbl-chat-bubble');
        const window = document.getElementById('ksbl-chat-window');
        const closeBtn = document.getElementById('ksbl-chat-close');
        const sendBtn = document.getElementById('ksbl-chat-send');
        const input = document.getElementById('ksbl-chat-input');

        bubble.onclick = () => {
            window.classList.remove('ksbl-hidden');
            bubble.classList.add('ksbl-hidden');
            input.focus();
        };

        closeBtn.onclick = () => {
            window.classList.add('ksbl-hidden');
            bubble.classList.remove('ksbl-hidden');
        };

        sendBtn.onclick = sendMessage;
        input.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };

        // Welcome message
        addMessage('assistant', 'Assalamu Alaikum! I am KSBLBot. How can I assist you today?');
    }

    function addMessage(role, text) {
        const msgArea = document.getElementById('ksbl-chat-messages');
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `ksbl-msg-wrapper ${role}`;
        
        const iconUrl = role === 'assistant' ? (config.assistantIconUrl || config.logoUrl) : config.userIconUrl;
        const iconHtml = iconUrl ? `<img src="${iconUrl}" class="ksbl-msg-icon" alt="${role}">` : `<div class="ksbl-msg-icon fallback">${role[0].toUpperCase()}</div>`;

        msgWrapper.innerHTML = `
            ${role === 'assistant' ? iconHtml : ''}
            <div class="ksbl-msg">
                <div class="msg-content">${text}</div>
            </div>
            ${role === 'user' ? iconHtml : ''}
        `;
        
        msgArea.appendChild(msgWrapper);
        msgArea.scrollTop = msgArea.scrollHeight;
        return msgWrapper.querySelector('.msg-content');
    }

    async function sendMessage() {
        const input = document.getElementById('ksbl-chat-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage('user', text);
        chatHistory.push({ role: 'user', content: text });

        const loadingMsg = addMessage('assistant', '<span class="dot-typing"></span>');
        
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

            if (!response.ok) throw new Error('Failed to connect to API');

            loadingMsg.innerHTML = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                botResponse += chunk;
                loadingMsg.innerText = botResponse;
                document.getElementById('ksbl-chat-messages').scrollTop = document.getElementById('ksbl-chat-messages').scrollHeight;
            }

            chatHistory.push({ role: 'assistant', content: botResponse });

        } catch (error) {
            console.error('Chat Error:', error);
            loadingMsg.innerHTML = '<span style="color: #ff4d4d">Sorry, I am having trouble connecting. Please try again later.</span>';
        }
    }

    window.initKSBLBot = init;
})();
