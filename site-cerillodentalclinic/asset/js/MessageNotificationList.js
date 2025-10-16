(function() {
    var global = (typeof window !== 'undefined') ? window : this;

    function MessageNotificationList() {}

    MessageNotificationList.prototype.init = function(url, latestMessageTime) {
        var notificationContainer = new El("notification-container");
        var request = new Request(new XMLHttpRequest());
        var isPollingActive = true;
        var isVisible = true;
        var pollingTimer = null;
        var initialPageURL = new Url().base;
    
        function notificationItemTemplate(data) {
            return `
                <div class="block notification-item ${data.is_read}">
                    <h4>${data.subject}</h4>
                    <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.body}</p>
                    <small>${data.sent_at}</small>
                </div>
            `;
        }
    
        function getNotifications() {
            if (!isPollingActive || !isVisible || new Url().base !== initialPageURL) {
                return;
            }
    
            request.addCallback(function(request, response) {
                if (response.code === 0) {
                    notificationContainer.html('No internet connection.');
                } else if (response.code > 299) {
                    isPollingActive = false;
                    return;
                } else {
                    try {
                        var result = JSON.parse(response.content);
    
                        if (result.error) {
                            console.log(result.error);
                            return;
                        }
    
                        var notificationItems = Object.fromEntries(
                            Object.entries(result).reverse()
                        );
    
                        for (let key in notificationItems) {
                            var notificationItem = notificationItems[key];
    
                            latestMessageTime = notificationItem['sent_at'];
    
                            notificationItem['is_read'] =
                                notificationItem['key'] == null ? '' : 'read';
    
                            notificationItem['sent_at'] = new Date().toLocaleDateString('en-US', {
                                'year': 'numeric',
                                'month': 'short',
                                'day': 'numeric'
                            });
    
                            notificationContainer.prepend(
                                notificationItemTemplate(notificationItem)
                            );
                        }
                    } catch (e) {
                        console.error("Failed to parse response:", e);
                    }
                }
    
                // Schedule next poll if still active and visible
                if (isPollingActive && isVisible) {
                    pollingTimer = setTimeout(getNotifications, 30000);
                }
            });
    
            request.send(url, {
                'method': "POST",
                'headers': {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                'content': Utils.objectToQuery({
                    'latest_message_time': latestMessageTime
                })
            });
        }
    
        function handleVisibilityChange() {
            isVisible = !document.hidden;
    
            if (isVisible && isPollingActive && !pollingTimer) {
                getNotifications(); // Resume polling immediately
            } else if (!isVisible && pollingTimer) {
                clearTimeout(pollingTimer); // Pause polling
                pollingTimer = null;
            }
        }
    
        // Listen for tab visibility change
        document.addEventListener('visibilitychange', handleVisibilityChange);
    
        // Initial poll
        getNotifications();
    
        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            isPollingActive = false;
            clearTimeout(pollingTimer);
        });
    };


    global.MessageNotificationList = MessageNotificationList;
})();
