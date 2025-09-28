(function() {
    var global = (typeof window !== 'undefined') ? window: this;

    function MessageNotificationCount() {}

    MessageNotificationCount.prototype.init = function(url) {
        var notificationBadge = new Tag("notification-badge");
        var request = new Request(new XMLHttpRequest());
        var notificationInterval = null;
        
        function getNotificationCount() {
            request.addCallback(function(request, response) {
                if (response.code === 0) {
                    notificationBadge.set('No internet connection.');
                } else if (response.code > 299) {
                    clearInterval(notificationInterval);
                    return;
                } else {
                    if (response.content == "0") {
                        notificationBadge.tag.classList.remove('active');
                    } else {
                        notificationBadge.tag.classList.add('active');
                    }
                    notificationBadge.set(response.content);
                }
            });

            request.send(url, {
                'method': 'GET',
            });
        }

        getNotificationCount();
        
        notificationInterval = setInterval(getNotificationCount, 30000);
        window.addEventListener('beforeunload', function() {
            clearInterval(notificationInterval);
        });
    };

    global.MessageNotificationCount = MessageNotificationCount;
})();