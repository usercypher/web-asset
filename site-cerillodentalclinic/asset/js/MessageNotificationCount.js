(function() {
    var global = (typeof window !== 'undefined') ? window : this;

    function MessageNotificationCount() {}

    MessageNotificationCount.prototype.init = function(url) {
        var notificationBadge = new Tag("notification-badge");
        var request = new Request(new XMLHttpRequest());

        var initialPageURL = new Url().base;
        var isPollingActive = true;

        function getNotificationCount() {
            // Stop polling if the URL has changed
            if (!isPollingActive || new Url().base !== initialPageURL) {
                return;
            }

            request.addCallback(function(request, response) {
                if (response.code === 0) {
                    notificationBadge.set('No internet connection.');
                } else if (response.code > 299) {
                    isPollingActive = false; // stop future polling
                    return;
                } else {
                    if (response.content === "0") {
                        notificationBadge.tag.classList.remove('active');
                    } else {
                        notificationBadge.tag.classList.add('active');
                    }
                    notificationBadge.set(response.content);
                }

                // Schedule next poll if still active
                if (isPollingActive) {
                    setTimeout(getNotificationCount, 30000);
                }
            });

            request.send(url, {
                'method': 'GET',
            });
        }

        // Initial call
        getNotificationCount();

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            isPollingActive = false;
        });
    };

    global.MessageNotificationCount = MessageNotificationCount;
})();
