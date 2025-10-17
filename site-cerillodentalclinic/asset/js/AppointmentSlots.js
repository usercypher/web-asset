(function() {
    var global = (typeof window !== 'undefined') ? window: this;

    function AppointmentSlots() {}

    AppointmentSlots.prototype.init = function(allSlots, userId, urlProfile) {
        const serviceButtons = document.getElementById('service-buttons');
        const dateButtons = document.getElementById('date-buttons');
        const slotsContainer = document.getElementById('slots-container');
        
        let selectedService = null;
        let selectedDate = null;
        
        serviceButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('service-btn')) {
                // Set selected
                selectedService = e.target.dataset.service;
                selectedDate = null;
        
                // Highlight selection
                document.querySelectorAll('.service-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
        
                // Populate dates
                dateButtons.innerHTML = '';
                slotsContainer.innerHTML = '';
        
                const dates = Object.keys(allSlots[selectedService] || {});
                if (dates.length === 0) {
                    dateButtons.innerHTML = '<p>No available dates.</p>';
                    return;
                }
        
                dates.forEach(date => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'pill date-btn';
                    btn.dataset.date = date;
                    btn.textContent = new Date(date).toLocaleDateString('en-US', {
                        month: 'short',   // "Sep"
                        day: 'numeric',   // "29"
                        year: 'numeric'   // "2025"
                    });
                    dateButtons.appendChild(btn);
                });
            }
        });
        
        dateButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-btn')) {
                selectedDate = e.target.dataset.date;
                
                const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
                    month: 'short',   // "Sep"
                    day: 'numeric',   // "29"
                    year: 'numeric'   // "2025"
                });
        
                // Highlight
                document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
        
                slotsContainer.innerHTML = '';
        
                const slotList = allSlots[selectedService][selectedDate] || [];
                if (slotList.length === 0) {
                    slotsContainer.innerHTML = '<p>No available slots for this date.</p>';
                    return;
                }
        
                const table = document.createElement('table');
                table.classList.add('table-nowrap');
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Duration</th>
                            <th>Price</th>
                            <th>Doctor</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                var buttonId = 0;
                slotList.forEach(slot => {
                    const row = document.createElement('tr');
                    const formattedTimeStart = formatTime(slot.start);
                    const formattedTimeEnd = formatTime(slot.end);
                    const urlProfileProcessed = Utils.strReplace(urlProfile, {":id" : slot.doctor_id});
                    
                    row.innerHTML = `
                        <td>${formattedTimeStart} - ${formattedTimeEnd}</td>
                        <td>${slot.service_duration} min</td>
                        <td>${slot.service_price}</td>
                        <td><a href="${urlProfileProcessed}">${slot.doctor_name}</a></td>
                        <td>
                            <button 
                                class="button"
                                type="button"
                                x-ref--create-appointment-open-${buttonId}
                                x-on-click
                                x-rot--create-appointment=""
                                x-rot--create-appointment-content=""
                                x-focus="-create-appointment-tab-last"
                                x-tab="-create-appointment-tab-first:-create-appointment-tab-last"
                                x-set-window_x-on-key-window-escape="-create-appointment-close"
                                x-set-window_x-run--create-appointment-close="x-on-click"
                                x-set--create-appointment-close.x-focus="-create-appointment-open-${buttonId}"
                                x-val-appointment_user_id="${userId}"
                                x-val-appointment_service_id="${slot.service_id}"
                                x-val-appointment_schedule_id="${slot.schedule_id}"
                                x-val-appointment_time_start="${slot.start}"
                                x-val-appointment_time_end="${slot.end}"
                                x-val-appointment_service_name_show="${selectedService}"
                                x-val-appointment_service_price_show="${slot.service_price}"
                                x-val-appointment_date_show="${formattedDate}"
                                x-val-appointment_time_show="${formattedTimeStart} - ${formattedTimeEnd}"
                                x-val-appointment_doctor_name_show="${slot.doctor_name}"
                            >Book</button>
                        </td>
                    `;
                    table.querySelector('tbody').appendChild(row);
                    buttonId++;
                });
        
                slotsContainer.appendChild(table);
        
                // Register modals
                elx.register(document.querySelectorAll('#slots-container *'));
                elx.clean();
            }
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