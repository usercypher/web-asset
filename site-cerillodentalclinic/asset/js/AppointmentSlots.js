(function() {
    var global = (typeof window !== 'undefined') ? window: this;

    function AppointmentSlots() {}

    AppointmentSlots.prototype.init = function(allSlots, userId, urlProfile) {
        var service = ElX.x("-appointment-data-service");
        var date = ElX.x("-appointment-data-date");
        
        var dateContainer = new El("date-buttons");
        var slotContainer = new El("slots-container");
        
        service.tap(function (old, current, event) {
            service.rot("_");
            ElX.rot("this", "active", event.target);
            
            dateContainer.html("");
            slotContainer.html("");
            
            var dates = Object.keys(allSlots[current] || {});
            if (dates.length === 0) {
                dateContainer.html('<p>No available dates.</p>');
                return;
            }
            var datesTpl = "";
            dates.forEach(d => {
                datesTpl += `
                    <label class="chip _" x-on-click x-ref--appointment-data-date x-var--appointment-data-date="${d}">${new Date(d).toLocaleDateString('en-US', {
                        month: 'short',   // "Sep"
                        day: 'numeric',   // "29"
                        year: 'numeric'   // "2025"
                    })}</label>
                `;
            });
            
            dateContainer.html(datesTpl);
            ElX.init(dateContainer.el.getElementsByTagName("*"));
            ElX.clean();
        });

        date.tap(function (old, current, event) {
            date.rot("_");
            ElX.rot("this", "active", event.target);

            slotContainer.html("");

            const formattedDate = new Date(date.value()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            const slotList = allSlots[service.value()][date.value()] || [];
            if (slotList.length === 0) {
                slotContainer.innerHTML = '<p>No available slots for this date.</p>';
                return;
            }
            
            var rows = "";
            var buttonId = 0;
            slotList.forEach(slot => {
                const formattedTimeStart = formatTime(slot.start);
                const formattedTimeEnd = formatTime(slot.end);
                const urlProfileProcessed = Utils.strReplace(urlProfile, {":id" : slot.doctor_id});

                rows += `
                <tr>
                    <td>${formattedTimeStart} - ${formattedTimeEnd}</td>
                    <td>${slot.service_duration} min</td>
                    <td>${slot.service_price}</td>
                    <td><a href="${urlProfileProcessed}">${slot.doctor_name}</a></td>
                    <td>
                        <button 
                            class="btn btn-primary"
                            type="button"
                            x-ref--appointment-create-open-${buttonId}
                            x-on-click
                            x-rot--appointment-create="active"
                            x-focus="-appointment-create-tab-last"
                            x-tab="-appointment-create-tab-first:-appointment-create-tab-last"
                            x-set-window_x-on-key-window-escape="-appointment-create-close"
                            x-set-window_x-run--appointment-create-close="x-on-click"
                            x-set--appointment-create-close.x-focus="-appointment-create-open-${buttonId}"
                            x-val-appointment_user_id="${userId}"
                            x-val-appointment_service_id="${slot.service_id}"
                            x-val-appointment_schedule_id="${slot.schedule_id}"
                            x-val-appointment_time_start="${slot.start}"
                            x-val-appointment_time_end="${slot.end}"
                            x-val-appointment_service_name_show="${service.value()}"
                            x-val-appointment_service_price_show="${slot.service_price}"
                            x-val-appointment_date_show="${formattedDate}"
                            x-val-appointment_time_show="${formattedTimeStart} - ${formattedTimeEnd}"
                            x-val-appointment_doctor_name_show="${slot.doctor_name}"
                        >Book</button>
                    </td>
                </tr>
                `;

                buttonId++;
            });

            slotContainer.html(`
            <table class="table table-scroll">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Duration</th>
                        <th>Price</th>
                        <th>Doctor</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            `);
    
            ElX.init(slotContainer.el.getElementsByTagName("*"));
            ElX.clean();
        });
    };

    function formatTime(timeStr) {
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(+hours, +minutes);

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    global.AppointmentSlots = AppointmentSlots;
})();