'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  CheckCircle, 
  ArrowRight, 
  Users, 
  Package,
  MapPin,
  Phone,
  Mail,
  Settings
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

const setupSteps = [
  {
    id: 'organization',
    title: 'Organization Details',
    description: 'Set up your blood bank or hospital information',
    icon: Building2
  },
  {
    id: 'contact',
    title: 'Contact Information',
    description: 'Add your contact details for communication',
    icon: Mail
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Set your physical location for blood donors',
    icon: MapPin
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Configure your notification and system preferences',
    icon: Settings
  }
]

export default function SetupWizard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [organizationData, setOrganizationData] = useState({
    name: '',
    type: 'blood_bank',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    registrationNumber: '',
    description: ''
  })
  const [completedSteps, setCompletedSteps] = useState(new Set())

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    // Check if user already has organization
    if (user?.organizationId && user?.organizationName) {
      router.push('/dashboard')
      return
    }
  }, [isAuthenticated, user])

  const handleNext = () => {
    // Validate current step
    if (!validateStep(currentStep)) {
      return
    }

    if (currentStep < setupSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
      setCompletedSteps(prev => new Set([...prev, setupSteps[currentStep].id]))
    } else {
      // Complete setup
      handleCompleteSetup()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const validateStep = (stepIndex) => {
    const step = setupSteps[stepIndex]
    
    switch (step.id) {
      case 'organization':
        return organizationData.name.trim() !== '' && organizationData.email.trim() !== ''
      case 'contact':
        return organizationData.phone.trim() !== ''
      case 'location':
        return organizationData.city.trim() !== '' && organizationData.country.trim() !== ''
      case 'preferences':
        return true // Preferences are optional
      default:
        return false
    }
  }

  const handleCompleteSetup = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organizationData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create organization')
      }

      // Mark all steps as completed
      setCompletedSteps(new Set(setupSteps.map(step => step.id)))
      
      // Show success and redirect
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      console.error('[v0] Setup completion error:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setOrganizationData(prev => ({ ...prev, [field]: value }))
  }

  const currentStepData = setupSteps[currentStep]
  const isStepCompleted = completedSteps.has(currentStepData.id)

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Bar */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-foreground">Setup Your Organization</h1>
              <Badge className={isStepCompleted ? 'bg-green-100 text-green-800' : 'bg-secondary/20 text-secondary-foreground'}>
                Step {currentStep + 1} of {setupSteps.length}
              </Badge>
            </div>
            
            <div className="text-sm text-foreground/60">
              {currentStep + 1}. {currentStepData.title}
            </div>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <div className="flex items-center justify-between">
            {setupSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index < currentStep ? 'bg-primary text-primary-foreground' :
                  index === currentStep ? 'bg-primary text-primary-foreground' :
                  completedSteps.has(step.id) ? 'bg-green-500 text-white' :
                  'bg-secondary/20 text-secondary-foreground'
                }`}>
                  {completedSteps.has(step.id) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                
                {index < setupSteps.length - 1 && (
                  <div className={`w-16 h-0.5 ${
                    index < currentStep ? 'bg-primary' : 'bg-secondary/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps List */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Setup Steps</h2>
              <div className="space-y-3">
                {setupSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      index === currentStep
                        ? 'bg-primary/10 border-primary/30'
                        : completedSteps.has(step.id)
                        ? 'bg-green-50 border-green-200'
                        : 'hover:bg-secondary/5'
                    }`}
                    onClick={() => index <= currentStep && setCurrentStep(index)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      completedSteps.has(step.id)
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/20 text-secondary-foreground'
                    }`}>
                      {completedSteps.has(step.id) ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className={`font-medium ${
                        index === currentStep ? 'text-primary' : 'text-foreground'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-sm text-foreground/60">
                        {step.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Current Step Content */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <currentStepData.icon className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{currentStepData.title}</h2>
                  <p className="text-foreground/60">{currentStepData.description}</p>
                </div>
              </div>

              {/* Step Forms */}
              {currentStepData.id === 'organization' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Organization Name *
                    </label>
                    <Input
                      value={organizationData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="City General Hospital"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Organization Type *
                    </label>
                    <select
                      value={organizationData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="blood_bank">Blood Bank</option>
                      <option value="hospital">Hospital</option>
                      <option value="transfusion_center">Transfusion Center</option>
                      <option value="ngo">NGO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={organizationData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contact@bloodbank.com"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Registration Number
                    </label>
                    <Input
                      value={organizationData.registrationNumber}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                      placeholder="BR-2024-001"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      value={organizationData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of your organization..."
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none"
                    />
                  </div>
                </div>
              )}

              {currentStepData.id === 'contact' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number *
                    </label>
                    <Input
                      type="tel"
                      value={organizationData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {currentStepData.id === 'location' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Address
                    </label>
                    <Input
                      value={organizationData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="123 Main Street, Suite 100"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        City *
                      </label>
                      <Input
                        value={organizationData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="New York"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        State/Province *
                      </label>
                      <Input
                        value={organizationData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="NY"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Country *
                    </label>
                    <Input
                      value={organizationData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="United States"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {currentStepData.id === 'preferences' && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <Settings className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Preferences Configured</h3>
                    <p className="text-foreground/60 mb-6">
                      Your basic organization setup is complete! You can configure detailed preferences later in the settings page.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                
                <Button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep) || loading}
                >
                  {loading ? 'Processing...' : 
                   currentStep === setupSteps.length - 1 ? 'Complete Setup' : 'Next Step'
                  }
                  {currentStep < setupSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 ml-2" />
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
