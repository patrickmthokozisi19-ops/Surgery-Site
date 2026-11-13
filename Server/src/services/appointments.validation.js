export class AppointmentError extends Error {
    constructor(message, status = 400) {
      super(message);
      this.status = status;
    }
  }
  
  const fail = (message) => {
    throw new AppointmentError(message);
  };
  
  export const STATUSES = [
    "pending",
    "confirmed",
    "checked-in",
    "completed",
    "cancelled"
  ];
  
  const TYPES = [
    "consult",
    "followup",
    "procedure",
    "results"
  ];
  
  const PROFILE_FIELDS = [
    "preferredName",
    "birthDate",
    "idType",
    "identityNumber",
    "language",
    "contactOwner",
    "patientEmail",
    "alternativePhone",
    "address",
    "postalCode",
    "contactMethod",
    "emergencyName",
    "emergencyRelationship",
    "emergencyPhone",
    "kinSame",
    "kinName",
    "kinRelationship",
    "kinPhone",
    "guardianNeeded",
    "guardianName",
    "guardianRelationship",
    "guardianPhone",
    "paymentMethod",
    "payerName",
    "payerPhone",
    "scheme",
    "plan",
    "memberNumber",
    "dependantCode",
    "mainMember",
    "authorisation"
  ];
  
  const APPOINTMENT_FIELDS = [
    "patient",
    "specialist",
    "contact",
    "type",
    "status",
    "date",
    "start",
    "end",
    "notes",
    "patientDetails"
  ];
  
  const isObject = (value) => {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  };
  
  const cleanText = (value, label, max = 150) => {
    if (typeof value !== "string") {
      fail(`${label} must be text.`);
    }
  
    const result = value.trim();
  
    if (result.length > max) {
      fail(`${label} must be ${max} characters or fewer.`);
    }
  
    return result;
  };
  
  const required = (value, label) => {
    if (!value) {
      fail(`${label} is required.`);
    }
  };
  
  const oneOf = (value, options, label) => {
    if (!options.includes(value)) {
      fail(`Invalid ${label}.`);
    }
  };
  
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
  
    const date = new Date(`${value}T00:00:00Z`);
  
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };
  
  const today = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  };
  
  const validatePhone = (value, label) => {
    if (!value) return;
  
    const cleaned = value.replace(/[ ()-]/g, "");
  
    if (!/^\+?\d{7,15}$/.test(cleaned)) {
      fail(`Check ${label}. Include the country code for international numbers.`);
    }
  };
  
  export const parseAppointmentBody = (body) => {
    if (!isObject(body)) {
      fail("Send a JSON object.");
    }
  
    const data = {};
  
    for (const key of Object.keys(body)) {
      if (!APPOINTMENT_FIELDS.includes(key)) {
        fail(`Unknown appointment field: ${key}`);
      }
  
      if (key === "patientDetails") {
        if (!isObject(body.patientDetails)) {
          fail("Patient details must be an object.");
        }
  
        data.patientDetails = {};
  
        for (const field of Object.keys(body.patientDetails)) {
          if (!PROFILE_FIELDS.includes(field)) {
            fail(`Unknown patient detail: ${field}`);
          }
  
          data.patientDetails[field] = cleanText(
            body.patientDetails[field],
            field
          );
        }
      } else {
        data[key] = cleanText(
          body[key],
          key,
          key === "notes" ? 500 : 150
        );
      }
    }
  
    if (Object.keys(data).length === 0) {
      fail("Provide at least one field.");
    }
  
    return data;
  };
  
  export const validateStatus = (status) => {
    oneOf(status, STATUSES, "appointment status");
  };
  
  export const validateRegistration = (appointment) => {
    required(appointment.patient, "Patient name");
    required(appointment.specialist, "Specialist");
    required(appointment.contact, "Contact number");
  
    validatePhone(appointment.contact, "contact number");
  
    if (!validDate(appointment.date)) {
      fail("Enter a valid appointment date.");
    }
  
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  
    if (
      !timePattern.test(appointment.start || "") ||
      !timePattern.test(appointment.end || "")
    ) {
      fail("Enter valid start and end times.");
    }
  
    if (appointment.end <= appointment.start) {
      fail("End time must be later than start time.");
    }
  
    oneOf(appointment.type, TYPES, "visit type");
    validateStatus(appointment.status);
  
    const details = appointment.patientDetails || {};
  
    if (
      !validDate(details.birthDate || "") ||
      details.birthDate < "1900-01-01" ||
      details.birthDate > today()
    ) {
      fail("Enter a valid date of birth between 1900 and today.");
    }
  
    oneOf(
      details.idType,
      ["unavailable", "sa-id", "passport", "other"],
      "identification type"
    );
  
    if (details.idType === "unavailable") {
      details.identityNumber = "";
    } else {
      required(details.identityNumber, "Identification number");
    }
  
    if (details.idType === "sa-id") {
      const id = details.identityNumber;
  
      if (!/^\d{13}$/.test(id)) {
        fail("A South African ID must contain 13 digits.");
      }
  
      let sum = 0;
  
      for (let index = 0; index < 13; index++) {
        let digit = Number(id[index]);
  
        if (index % 2 === 1) {
          digit *= 2;
  
          if (digit > 9) {
            digit -= 9;
          }
        }
  
        sum += digit;
      }
  
      if (sum % 10 !== 0) {
        fail("The South African ID checksum is invalid.");
      }
  
      const birthDateDigits = details.birthDate
        .slice(2)
        .replaceAll("-", "");
  
      if (id.slice(0, 6) !== birthDateDigits) {
        fail("ID number and date of birth do not match.");
      }
    }
  
    oneOf(
      details.contactOwner,
      ["patient", "guardian", "representative"],
      "contact owner"
    );
  
    oneOf(
      details.contactMethod,
      ["phone", "sms", "email"],
      "contact method"
    );
  
    if (
      details.patientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.patientEmail)
    ) {
      fail("Enter a valid email address.");
    }
  
    if (details.contactMethod === "email") {
      required(details.patientEmail, "Email address");
    }
  
    oneOf(details.kinSame, ["yes", "no"], "next-of-kin selection");
    oneOf(details.guardianNeeded, ["yes", "no"], "guardian selection");
  
    const currentDate = today();
  
    let age =
      Number(currentDate.slice(0, 4)) -
      Number(details.birthDate.slice(0, 4));
  
    if (currentDate.slice(5) < details.birthDate.slice(5)) {
      age--;
    }
  
    if (age < 18 && details.guardianNeeded !== "yes") {
      fail("Guardian details are required for a patient under 18.");
    }
  
    const guardianFields = [
      "guardianName",
      "guardianRelationship",
      "guardianPhone"
    ];
  
    if (details.guardianNeeded === "yes") {
      for (const field of guardianFields) {
        required(details[field], field);
      }
    } else {
      for (const field of guardianFields) {
        details[field] = "";
      }
    }
    if (details.kinSame === "yes") {
      details.kinName = details.emergencyName || "";
      details.kinRelationship = details.emergencyRelationship || "";
      details.kinPhone = details.emergencyPhone || "";
    }
  
    for (const prefix of ["emergency", "kin"]) {
      const fields = [
        `${prefix}Name`,
        `${prefix}Relationship`,
        `${prefix}Phone`
      ];
  
      if (fields.some((field) => details[field])) {
        for (const field of fields) {
          required(details[field], field);
        }
      }
    }
  
    oneOf(
      details.paymentMethod,
      ["self", "medical-aid", "other"],
      "payment method"
    );
  
    const medicalAidFields = [
      "scheme",
      "plan",
      "memberNumber",
      "dependantCode",
      "mainMember",
      "authorisation"
    ];
  
    if (details.paymentMethod === "medical-aid") {
      for (const field of [
        "scheme",
        "memberNumber",
        "dependantCode",
        "mainMember"
      ]) {
        required(details[field], field);
      }
    } else {
      for (const field of medicalAidFields) {
        details[field] = "";
      }
    }
  
    for (const field of [
      "alternativePhone",
      "emergencyPhone",
      "kinPhone",
      "guardianPhone",
      "payerPhone"
    ]) {
      validatePhone(details[field], field);
    }
  
    return appointment;
  };