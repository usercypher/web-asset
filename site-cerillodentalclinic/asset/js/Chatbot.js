(function() {
    var global = (typeof window !== 'undefined') ? window: this;

    function Chatbot() {}

    Chatbot.prototype.init = function(url) {
        var chatButton = document.getElementById('chat-float-button');
        var chatWindow = document.getElementById('chat-window');
        var chatInput = document.getElementById('chat-input');
        var chatSend = document.getElementById('chat-send');
        var chatMessages = new El('chat-messages');
        
        let chatHistory = [];

        // Load chatHistory on page load
        var saved = sessionStorage.getItem('chatHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);  // use chatHistory, not history
            chatHistory.forEach(({ text, type }) => {
                chatMessages.append(messageTemplate(text, type, false)); // false = don't re-add to history on replay
            });
            scrollToBottom();
        }

        document.getElementById('chat-clear').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the chat history?')) {
                chatHistory = [];
                sessionStorage.removeItem('chatHistory');
                chatMessages.html('');
                chatInput.focus();
            }
        });


        // Generate message bubble HTML
        function messageTemplate(text, type = 'sent', addToHistory = true) {
            if (addToHistory) {
                chatHistory.push({ text, type });
                sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            }
            return `
                <div
                    class="chat-message ${type === 'sent' ? 'bg-primary text-secondary' : 'bg-gray'}"
                    style="max-width: 270px; padding: 0.5em 1em; margin-bottom: 1em; ${type === 'sent' ? 'float: right;' : 'clear: both;' }"
                >
                    ${text}
                </div>
            `;

        }

        // Scroll to bottom of chat
        function scrollToBottom() {
            chatMessages.el.scrollTop = chatMessages.el.scrollHeight;
        }

        function enableLongPressToCopy(selector) {
            let pressTimer = null;
            let isScrolling = false;
            const longPressDuration = 500;
        
            document.addEventListener('touchstart', function (e) {
                var target = e.target.closest(selector);
                if (!target) return;
        
                // Reset the scroll state when touch starts
                isScrolling = false;
        
                // Start the long press timer
                pressTimer = setTimeout(() => {
                    if (!isScrolling) {
                        copyToClipboard(target.innerText);
                        showCopiedFeedback(target);
                    }
                }, longPressDuration);
            }, { passive: false });  // Allow preventDefault to stop scrolling
        
            document.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });
        
            document.addEventListener('touchcancel', () => {
                clearTimeout(pressTimer);
            });
        
            document.addEventListener('touchmove', () => {
                if (!isScrolling) {
                    isScrolling = true;  // Set to true once the user starts scrolling
                    clearTimeout(pressTimer);  // Cancel the long press timer if scrolling
                }
            });
        
            // Optional: desktop support
            document.addEventListener('mousedown', function (e) {
                var target = e.target.closest(selector);
                if (!target) return;
        
                pressTimer = setTimeout(() => {
                    copyToClipboard(target.innerText);
                    showCopiedFeedback(target);
                }, longPressDuration);
            });
        
            document.addEventListener('mouseup', () => clearTimeout(pressTimer));
            document.addEventListener('mouseleave', () => clearTimeout(pressTimer));
        }

    
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).catch(err => {
                console.error('Clipboard write failed:', err);
            });
        }
    
        function showCopiedFeedback(element) {
            var original = element.style.backgroundColor;
            element.style.transition = 'background-color 0.3s';
            element.style.backgroundColor = '#d1ffd6';
    
            setTimeout(() => {
                element.style.backgroundColor = original;
            }, 600);
        }
    
        // Call this after DOM content is loaded
        document.addEventListener('DOMContentLoaded', () => {
            enableLongPressToCopy('.chat-message');
        });
        
        var sending = false;

        // Send message
        chatSend.addEventListener('click', () => {
            var request = new Request(new XMLHttpRequest());

            var message = chatInput.value.trim();
            if (!message || sending) return;
            sending = true;

            // Append user message
            chatMessages.append(messageTemplate(message, 'sent'));
            chatInput.value = '';
            chatSend.classList.add('loading');
            scrollToBottom();

            request.addCallback(function(request, response) {
                if (response.code === 0) {
                    chatMessages.append(messageTemplate('No internet connection.', 'received'));
                    chatSend.classList.remove('loading');
                    sending = false;
                } else {
                    var result = JSON.parse(response.content);

                    if (response.code > 299) {
                        chatMessages.append(messageTemplate(result.error, 'received'));
                        console.log(result.error);
                        chatSend.classList.remove('loading');
                        sending = false;
                        return;
                    }

                    request.send(result.url, {
                        'method': 'POST',
                        'headers': { 
                            'Content-Type': "application/json",
                            'X-goog-api-key': result.key,
                        },
                        'content': JSON.stringify({
                            'contents' : {
                                'parts': [
                                    {
                                        'text': result.context
                                    }
                                ]
                            }
                        }),
                        'timeout' : 10
                    });
                }
            });

            request.addCallback(function(request, response) {
                if (response.code === 0) {
                    chatMessages.append(messageTemplate('No internet connection.', 'received'));
                    chatSend.classList.remove('loading');
                } else {
                    var result = JSON.parse(response.content);
                    if (response.code > 299) {
                        chatMessages.append(messageTemplate('Something went wrong. Please try again later.', 'received'));
                        chatSend.classList.remove('loading');
                        console.log(result.error);
                    } else {
                        chatMessages.append(messageTemplate(result['candidates'][0]['content']['parts'][0]['text'], 'received'));
                        chatSend.classList.remove('loading');
                        scrollToBottom();
                    }
                }

                sending = false;
            });


            request.send(url, {
                'method': "POST",
                'headers': {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                'content': Utils.objectToQuery({
                    'query' : message
                })
            });
        });

        // Send message on Enter key
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                chatSend.click();
            }
        });
    };

    global.Chatbot = Chatbot;
})();