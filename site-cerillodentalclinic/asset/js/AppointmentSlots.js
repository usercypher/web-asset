(function() {
    var global = (typeof window !== 'undefined') ? window: this;

    function AppointmentSlots() {}

    AppointmentSlots.prototype.init = function(allSlots, userId) {
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
                    btn.textContent = date;
                    dateButtons.appendChild(btn);
                });
            }
        });
        
        dateButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-btn')) {
                selectedDate = e.target.dataset.date;
        
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
                    row.innerHTML = `
                        <td>${slot.start} - ${slot.end}</td>
                        <td>${slot.service_duration} min</td>
                        <td>${slot.service_price}</td>
                        <td>${slot.doctor_name}</td>
                        <td>
                            <button 
                                class="button"
                                type="button"
                                x-ref--create-appointment-open-${buttonId}
                                x-on-click
                                x-cycle--create-appointment=""
                                x-cycle--create-appointment-content=""
                                x-focus="-create-appointment-tab-last"
                                x-tab="-create-appointment-tab-first:-create-appointment-tab-last"
                                x-attr-window_x-on-key-window-escape="-create-appointment-close"
                                x-attr-window_x-run--create-appointment-close="x-on-click"
                                x-attr--create-appointment-close_x-focus="-create-appointment-open-${buttonId}"
                                x-val-appointment_user_id="${userId}"
                                x-val-appointment_service_id="${slot.service_id}"
                                x-val-appointment_schedule_id="${slot.schedule_id}"
                                x-val-appointment_time_start="${slot.start}"
                                x-val-appointment_time_end="${slot.end}"
                                x-val-appointment_service_name_show="${selectedService}"
                                x-val-appointment_service_price_show="${slot.service_price}"
                                x-val-appointment_date_show="${selectedDate}"
                                x-val-appointment_time_show="${slot.start} - ${slot.end}"
                                x-val-appointment_doctor_name_show="${slot.doctor_name}"
                            >Book</button>
                        </td>
                    `;
                    table.querySelector('tbody').appendChild(row);
                    buttonId++;
                });
        
                slotsContainer.appendChild(table);
        
                // Register modals
                tagx.register(document.querySelectorAll('#slots-container *'));
                tagx.clean();
            }
        });
    };

    global.AppointmentSlots = AppointmentSlots;
})();