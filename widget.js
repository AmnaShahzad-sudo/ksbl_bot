(function() {
    // Load marked.js for markdown parsing
    const markedScript = document.createElement('script');
    markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    document.head.appendChild(markedScript);

    // Configuration - will be overridden by the init function
    let config = {
        apiUrl: '',
        apiKey: '',
        botName: 'KSBLBot',
        logoUrl: '',
        userIconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        assistantIconUrl: ''
    };

    // System prompt to keep the bot on-topic
    const SYSTEM_PROMPT = `You are KSBLBot, an official AI assistant for KSBL (Karachi School of Business & Leadership). 
Your job is to help students, faculty, and visitors with questions related to KSBL — such as academic programs, admissions, courses, schedules, campus facilities, faculty, events, policies, and student services.

IMPORTANT RULES:
- Only answer questions related to KSBL or general academic/educational topics relevant to KSBL students.
- If a user asks about anything unrelated to KSBL (e.g. personal topics, entertainment, general trivia, politics, etc.), politely decline and redirect them. For example: "I'm only able to help with KSBL-related queries. Is there something about our programs, admissions, or campus I can assist you with?"
- Never engage in casual chit-chat, roleplay, or off-topic conversations.
- Be professional, friendly, and concise.
- Always greet with Islamic greetings where appropriate.`;

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
        
        const logoHtml = config.logoUrl
            ? `<img src="${config.logoUrl}" alt="Chat">`
            : `<div class="ksbl-logo-fallback">K</div>`;
        
        container.innerHTML = `
            <div id="ksbl-chat-bubble" title="Chat with KSBLBot">
                ${logoHtml}
            </div>
            <div id="ksbl-chat-window" class="ksbl-hidden">
                <div id="ksbl-chat-header">
                    <div class="header-info">
                        ${logoHtml}
                        <div class="header-text">
                            <span class="header-name">${config.botName}</span>
                            <span class="header-status">● Online</span>
                        </div>
                    </div>
                    <button id="ksbl-chat-close" title="Close">&times;</button>
                </div>
                <div id="ksbl-chat-messages"></div>
                <div id="ksbl-chat-input-area">
                    <textarea id="ksbl-chat-input" placeholder="Ask me anything about KSBL..." rows="1"></textarea>
                    <button id="ksbl-chat-send" title="Send">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <div id="ksbl-chat-footer">Powered by KSBL AI</div>
            </div>
        `;
        document.body.appendChild(container);

        // Event Listeners
        const bubble = document.getElementById('ksbl-chat-bubble');
        const chatWindow = document.getElementById('ksbl-chat-window');
        const closeBtn = document.getElementById('ksbl-chat-close');
        const sendBtn = document.getElementById('ksbl-chat-send');
        const input = document.getElementById('ksbl-chat-input');

        bubble.onclick = () => {
            chatWindow.classList.remove('ksbl-hidden');
            bubble.classList.add('ksbl-hidden');
            input.focus();
        };

        closeBtn.onclick = () => {
            chatWindow.classList.add('ksbl-hidden');
            bubble.classList.remove('ksbl-hidden');
        };

        sendBtn.onclick = sendMessage;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });

        // Welcome message
        addMessage('assistant', 'Assalamu Alaikum! I am KSBLBot, your KSBL assistant. How can I help you today?');
    }

    function addMessage(role, text) {
        const msgArea = document.getElementById('ksbl-chat-messages');
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `ksbl-msg-wrapper ${role}`;

        const iconUrl = role === 'assistant'
            ? (config.assistantIconUrl || config.logoUrl)
            : config.userIconUrl;

        const iconHtml = iconUrl
            ? `<img src="${iconUrl}" class="ksbl-msg-icon" alt="${role}" onerror="this.outerHTML='<div class=\'ksbl-msg-icon fallback\'>${role[0].toUpperCase()}</div>'">`
            : `<div class="ksbl-msg-icon fallback">${role[0].toUpperCase()}</div>`;

        msgWrapper.innerHTML = `
            ${role === 'assistant' ? iconHtml : ''}
            <div class="ksbl-msg ${role}">
                <div class="msg-content"></div>
            </div>
            ${role === 'user' ? iconHtml : ''}
        `;

        const messageContent = msgWrapper.querySelector('.msg-content');

        if (role === 'assistant' && text && window.marked) {
            messageContent.innerHTML = marked.parse(text);
        } else if (text) {
            messageContent.innerText = text;
        }

        msgArea.appendChild(msgWrapper);
        msgArea.scrollTop = msgArea.scrollHeight;
        return messageContent;
    }

    function showTypingIndicator() {
        const msgArea = document.getElementById('ksbl-chat-messages');
        const wrapper = document.createElement('div');
        wrapper.className = 'ksbl-msg-wrapper assistant';
        wrapper.id = 'ksbl-typing-indicator';

        const iconUrl = config.assistantIconUrl || config.logoUrl;
        const iconHtml = iconUrl
            ? `<img src="${iconUrl}" class="ksbl-msg-icon" alt="assistant">`
            : `<div class="ksbl-msg-icon fallback">K</div>`;

        wrapper.innerHTML = `
            ${iconHtml}
            <div class="ksbl-msg assistant">
                <div class="ksbl-typing-dots">
                    <span></span><span></span><span></span>
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
                    system: SYSTEM_PROMPT,
                    detail: 'concise'
                })
            });

            if (!response.ok) throw new Error('Failed to connect to API');

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
            addMessage('assistant', '');
            const errMsg = document.querySelector('.ksbl-msg-wrapper.assistant:last-child .msg-content');
            if (errMsg) errMsg.innerHTML = '<span style="color:#cc3300">Sorry, I\'m having trouble connecting. Please try again later.</span>';
        }
    }

    window.initKSBLBot = init;
})();
