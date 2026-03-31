/**
 * Form validation schemas
 * Centralized validation rules
 */

export const validationSchemas = {
  // Donor Validation
  donor: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s'-]+$/,
      message: 'First name must be 2-50 characters with only letters',
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s'-]+$/,
      message: 'Last name must be 2-50 characters with only letters',
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
    phone: {
      required: true,
      pattern: /^[\d\s\-\(\)\+]+$/,
      minLength: 10,
      message: 'Please enter a valid phone number (at least 10 digits)',
    },
    dateOfBirth: {
      required: true,
      validate: (date) => {
        const birthDate = new Date(date)
        const age = new Date().getFullYear() - birthDate.getFullYear()
        return age >= 18 && age <= 65
      },
      message: 'Age must be between 18 and 65 years',
    },
    bloodType: {
      required: true,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      message: 'Please select a valid blood type',
    },
  },

  // Blood Inventory Validation
  inventory: {
    donorId: {
      required: true,
      message: 'Donor is required',
    },
    bloodType: {
      required: true,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      message: 'Please select a valid blood type',
    },
    collectionDate: {
      required: true,
      validate: (date) => new Date(date) <= new Date(),
      message: 'Collection date cannot be in the future',
    },
    expiryDate: {
      required: true,
      validate: (expiryDate, formData) => {
        if (!formData?.collectionDate) return true
        const expiry = new Date(expiryDate)
        const collection = new Date(formData.collectionDate)
        const maxDays = 42 // Standard RBC expiry
        const maxDate = new Date(collection.getTime() + maxDays * 24 * 60 * 60 * 1000)
        return expiry <= maxDate
      },
      message: 'Expiry date cannot exceed 42 days from collection',
    },
    quantity: {
      required: true,
      min: 1,
      max: 10,
      message: 'Quantity must be between 1 and 10 units',
    },
  },

  // Hospital Request Validation
  request: {
    requestingOrganizationName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: 'Hospital name must be 2-100 characters',
    },
    patientName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: 'Patient name must be 2-100 characters',
    },
    urgency: {
      required: true,
      enum: ['routine', 'urgent', 'emergency'],
      message: 'Please select a valid urgency level',
    },
    bloodRequirements: {
      required: true,
      validate: (reqs) => Array.isArray(reqs) && reqs.length > 0,
      message: 'At least one blood type is required',
    },
  },

  // User/Account Validation
  user: {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
    password: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
    },
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s'-]+$/,
      message: 'Full name must be 2-100 characters with only letters',
    },
  },
}

/**
 * Validate form data against schema
 */
export function validateForm(data, schemaName) {
  const schema = validationSchemas[schemaName]
  if (!schema) throw new Error(`Schema '${schemaName}' not found`)

  const errors = {}

  Object.keys(schema).forEach((field) => {
    const rules = schema[field]
    const value = data[field]

    // Check required
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = rules.message || `${field} is required`
      return
    }

    if (!value) return // Skip other validations if empty and not required

    // Check enum
    if (rules.enum && !rules.enum.includes(value)) {
      errors[field] = rules.message
      return
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.message
      return
    }

    // Check min/max length
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = rules.message
      return
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = rules.message
      return
    }

    // Check min/max value
    if (rules.min && Number(value) < rules.min) {
      errors[field] = rules.message
      return
    }
    if (rules.max && Number(value) > rules.max) {
      errors[field] = rules.message
      return
    }

    // Custom validation
    if (rules.validate) {
      try {
        const isValid = rules.validate(value, data)
        if (!isValid) {
          errors[field] = rules.message
        }
      } catch (err) {
        errors[field] = 'Validation error'
      }
    }
  })

  return Object.keys(errors).length > 0 ? errors : null
}

/**
 * Get field error message
 */
export function getFieldError(errors, fieldName) {
  return errors?.[fieldName] || null
}

/**
 * Check if field has error
 */
export function hasFieldError(errors, fieldName) {
  return !!errors?.[fieldName]
}
