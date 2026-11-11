
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
  
  // GET all appointments
  export const getAppointments = (req, res) => {
    res.status(200).json(appointments);
  };
  
  // GET appointment by ID
  export const getAppointmentById = (req, res) => {
    const id = Number(req.params.id);
  
    const appointment = appointments.find(
      item => item.id === id
    );
  
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }
  
    res.status(200).json(appointment);
  };
  
  // POST new appointment
  export const createAppointment = (req, res) => {
    const { patient, specialist, date } = req.body;
  
    if (!patient || !specialist || !date) {
      return res.status(400).json({
        message: "Patient, specialist and date are required"
      });
    }
  
    const appointment = {
      id: Math.max(0, ...appointments.map(a => a.id)) + 1,
      patient,
      specialist,
      date,
      status: "pending"
    };
  
    appointments.push(appointment);
  
    res.status(201).json(appointment);
  };
  
  // PATCH appointment status
  export const updateAppointment = (req, res) => {
    const id = Number(req.params.id);
  
    const appointment = appointments.find(
      item => item.id === id
    );
  
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }
  
    const allowedStatuses = [
      "pending",
      "confirmed",
      "checked-in",
      "completed",
      "cancelled"
    ];
  
    if (
      !allowedStatuses.includes(req.body?.status)
    ) {
      return res.status(400).json({
        message: "Invalid appointment status"
      });
    }
  
    appointment.status = req.body.status;
  
    res.status(200).json(appointment);
  };
  