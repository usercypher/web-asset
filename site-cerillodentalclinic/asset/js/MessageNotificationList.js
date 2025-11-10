(function() {
    var global = (typeof window !== 'undefined') ? window : this;

    function MessageNotificationList() {}

    MessageNotificationList.prototype.init = function(urlBase, url, latestMessageTime) {
        var notificationContainer = new El("notification-container");
        var request = new Request(new XMLHttpRequest());
        var isPollingActive = true;
        var isVisible = true;
        var pollingTimer = null;
        var initialPageURL = new Url().base;
    
        function notificationItemTemplate(data) {
            return `
                <div class="tile p-1">
                    <div class="tile-icon">
                        <figure class="avatar avatar-lg s-rounded" data-initial="TO"></figure>
                    </div>
                    <div class="tile-content">
                        <p class="tile-title text-bold"><a href="${Utils.strReplace(urlBase, {':id' : data.id})}">${data.subject}</a></p>
                        <p class="tile-subtitle" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${data.body}</p>
                    </div>
                    <div class="tile-action text-gray">
                        ${data.sent_at}
                    </div>
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
    
                            notificationItem['sent_at'] = new Date().toLocaleDateString('en-US', {
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
