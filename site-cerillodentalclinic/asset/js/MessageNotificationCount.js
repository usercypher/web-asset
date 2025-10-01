(function() {
    var global = (typeof window !== 'undefined') ? window : this;

    function MessageNotificationCount() {}

    MessageNotificationCount.prototype.init = function(url) {
        var notificationBadge = new Tag("notification-badge");
        var request = new Request(new XMLHttpRequest());
    
        var initialPageURL = new Url().base;
        var isPollingActive = true;
        var isVisible = true;
        var pollingTimer = null;
    
        function getNotificationCount() {
            if (!isPollingActive || !isVisible || new Url().base !== initialPageURL) {
                return;
            }
    
            request.addCallback(function(request, response) {
                if (response.code === 0) {
                    notificationBadge.set('No internet connection.');
                } else if (response.code > 299) {
                    isPollingActive = false;
                    return;
                } else {
                    if (response.content === "0") {
                        notificationBadge.tag.classList.remove('active');
                    } else {
                        notificationBadge.tag.classList.add('active');
                    }
                    notificationBadge.set(response.content);
                }
    
                if (isPollingActive && isVisible) {
                    pollingTimer = setTimeout(getNotificationCount, 30000);
                }
            });
    
            request.send(url, {
                'method': 'GET',
            });
        }
    
        function handleVisibilityChange() {
            isVisible = !document.hidden;
            if (isVisible && isPollingActive && !pollingTimer) {
                getNotificationCount(); // Resume polling
            } else if (!isVisible && pollingTimer) {
                clearTimeout(pollingTimer); // Pause polling
                pollingTimer = null;
            }
        }
    
        // Attach visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);
    
        // Initial call
        getNotificationCount();
    
        // Cleanup on unload
        window.addEventListener('beforeunload', function() {
            isPollingActive = false;
            clearTimeout(pollingTimer);
        });
    };


    global.MessageNotificationCount = MessageNotificationCount;
})();
