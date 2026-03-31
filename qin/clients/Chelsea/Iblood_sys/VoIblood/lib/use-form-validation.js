import { validationSchemas } from './validation-schemas'

export function useFormValidation(schemaKey) {
  const validate = (formData) => {
    const schema = validationSchemas[schemaKey]
    if (!schema) return { isValid: true, errors: {} }

    const errors = {}

    Object.entries(schema).forEach(([field, rules]) => {
      const value = formData[field]

      // Check required
      if (rules.required && (!value || value.toString().trim() === '')) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
        return
      }

      if (!value) return

      // Check minLength
      if (rules.minLength && value.toString().length < rules.minLength) {
        errors[field] = rules.message || `Minimum length is ${rules.minLength}`
        return
      }

      // Check maxLength
      if (rules.maxLength && value.toString().length > rules.maxLength) {
        errors[field] = rules.message || `Maximum length is ${rules.maxLength}`
        return
      }

      // Check pattern
      if (rules.pattern && !rules.pattern.test(value.toString())) {
        errors[field] = rules.message || 'Invalid format'
        return
      }

      // Check enum
      if (rules.enum && !rules.enum.includes(value)) {
        errors[field] = rules.message || 'Invalid selection'
        return
      }

      // Check min
      if (rules.min !== undefined && parseInt(value) < rules.min) {
        errors[field] = rules.message || `Minimum value is ${rules.min}`
        return
      }

      // Check max
      if (rules.max !== undefined && parseInt(value) > rules.max) {
        errors[field] = rules.message || `Maximum value is ${rules.max}`
        return
      }

      // Check custom validation
      if (rules.validate && !rules.validate(value, formData)) {
        errors[field] = rules.message || 'Invalid value'
        return
      }
    })

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }

  const validateField = (field, value, formData) => {
    const schema = validationSchemas[schemaKey]
    if (!schema || !schema[field]) return null

    const rules = schema[field]

    // Check required
    if (rules.required && (!value || value.toString().trim() === '')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
    }

    if (!value) return null

    // Check minLength
    if (rules.minLength && value.toString().length < rules.minLength) {
      return rules.message || `Minimum length is ${rules.minLength}`
    }

    // Check maxLength
    if (rules.maxLength && value.toString().length > rules.maxLength) {
      return rules.message || `Maximum length is ${rules.maxLength}`
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(value.toString())) {
      return rules.message || 'Invalid format'
    }

    // Check enum
    if (rules.enum && !rules.enum.includes(value)) {
      return rules.message || 'Invalid selection'
    }

    // Check min
    if (rules.min !== undefined && parseInt(value) < rules.min) {
      return rules.message || `Minimum value is ${rules.min}`
    }

    // Check max
    if (rules.max !== undefined && parseInt(value) > rules.max) {
      return rules.message || `Maximum value is ${rules.max}`
    }

    // Check custom validation
    if (rules.validate && !rules.validate(value, formData)) {
      return rules.message || 'Invalid value'
    }

    return null
  }

  return { validate, validateField }
}
