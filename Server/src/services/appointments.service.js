
let appointments = [
    {
      id: 1,
      patient: "Thabo Mokoena",
      specialist: "Dr. N. Maseko",
      date: "2026-11-15",
      status: "confirmed"
    },
    {
      id: 2,
      patient: "Sarah Khumalo",
      specialist: "Dr. K. Lewis",
      date: "2026-11-16",
      status: "pending"
    }
  ];
  
  export const findAllAppointments = () => {
    return appointments;
  };
  
  export const findAppointmentById = (id) => {
    return appointments.find(
      appointment => appointment.id === id
    );
  };
  
  export const addAppointment = (data) => {
    const id = Math.max(
      0,
      ...appointments.map(appointment => appointment.id)
    ) + 1;
  
    const appointment = {
      id,
      patient: data.patient,
      specialist: data.specialist,
      date: data.date,
      status: "pending"
    };
  
    appointments.push(appointment);
  
    return appointment;
  };
  
  export const changeAppointmentStatus = (id, status) => {
    const appointment = findAppointmentById(id);
  
    if (!appointment) {
      return null;
    }
  
    appointment.status = status;
  
    return appointment;
  };
  