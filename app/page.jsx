'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LandingHeader } from '@/components/landing/header'
import { HeroSection } from '@/components/landing/hero'
import { FeaturesSection } from '@/components/landing/features'
import { HowItWorksSection } from '@/components/landing/how-it-works'
import { ModulesSection } from '@/components/landing/modules'
import { CTASection } from '@/components/landing/cta'
import { FooterSection } from '@/components/landing/footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ModulesSection />
      <CTASection />
      <FooterSection />
    </div>
  )
}
