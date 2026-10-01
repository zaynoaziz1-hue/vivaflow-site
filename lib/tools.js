const business = require('./business.json');
module.exports = [
  {name: 'get_services', description: 'Read Vivaflow services, audience and pricing approach. Portfolio examples are fictional concepts.', value: business},
  {name: 'get_audit_booking_link', description: 'Get the free 30-minute audit booking link. Does not reserve a time, submit personal information or book an appointment.', value: business.audit}
];
