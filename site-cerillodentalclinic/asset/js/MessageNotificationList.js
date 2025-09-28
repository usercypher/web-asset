(function() {
    var global = (typeof window !== 'undefined') ? window: this;

    function MessageNotificationList() {}

    MessageNotificationList.prototype.init = function(url, latestMessageTime) {
        var notificationContainer = new Tag("notification-container");
        var request = new Request(new XMLHttpRequest());
        var getNotificationsInterval = null;
        
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
            request.addCallback(function(request, response) {
                if (response.code === 0) {
                    notificationContainer.set('No internet connection.');
                } else if (response.code > 299) {
                    clearInterval(getNotificationsInterval);
                } else {
                    var result = JSON.parse(response.content);

                    if (result.error) {
                        console.log(result.error);
                        return;
                    }

                    var notificationItems = result;
                    notificationItems = Object.fromEntries(Object.entries(notificationItems).reverse());

                    for (let key in notificationItems) {
                        var notificationItem = notificationItems[key];
                        latestMessageTime = notificationItem['sent_at'];
                        notificationItem['is_read'] = notificationItem['key'] == null ? '' : 'read';
                        notificationItem['sent_at'] = new Date().toLocaleDateString('en-US', {
                            'year': 'numeric',
                            'month': 'short',
                            'day': 'numeric'
                        });
                        notificationContainer.prepend(notificationItemTemplate(notificationItem));
                        
                    }
                    
                }
            });

            request.send(url, {
                'method': "POST",
                'headers': {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                'content': Utils.objectToQuery({
                    'latest_message_time' : latestMessageTime
                })
            });
        }

        getNotifications();

        getNotificationsInterval = setInterval(getNotifications, 30000);
        window.addEventListener('beforeunload', function() {
            clearInterval(getNotificationsInterval);
        });
    };

    global.MessageNotificationList = MessageNotificationList;
})();