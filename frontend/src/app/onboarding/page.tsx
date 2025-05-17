'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/UI/Card';
import Button from '@/components/Button';
import SetupStep from '@/components/SetupGuide/SetupStep';
import ProgressTracker from '@/components/SetupGuide/ProgressTracker';
import EmailSetupForm from '@/components/SetupGuide/EmailSetupForm';
import VendorInstructions from '@/components/SetupGuide/VendorInstructions';
import { useToast } from '@/components/Feedback/ToastContext';

// Mock API function to test email connection
const testEmailConnection = async (config: any): Promise<boolean> => {
  // In a real implementation, this would call an API endpoint
  console.log('Testing email connection with config:', config);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For demo purposes, we'll consider it successful if the host is one of the common providers
  const commonHosts = ['imap.gmail.com', 'outlook.office365.com', 'imap.mail.yahoo.com'];
  return commonHosts.includes(config.host);
};

// Mock API function to save email configuration
const saveEmailConfig = async (config: any): Promise<boolean> => {
  // In a real implementation, this would call an API endpoint
  console.log('Saving email configuration:', config);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo purposes, always return success
  return true;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Setup steps
  const steps = [
    'Email Configuration',
    'Vendor Selection',
    'Report Setup',
    'Verification'
  ];
  
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<'VinSolutions' | 'VAUTO' | 'CDK' | 'Reynolds'>('VinSolutions');
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Track progress in localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('onboardingProgress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setActiveStep(progress.activeStep);
        setCompletedSteps(progress.completedSteps);
        setEmailConfig(progress.emailConfig);
        setSelectedVendor(progress.selectedVendor || 'VinSolutions');
      } catch (e) {
        console.error('Failed to parse saved onboarding progress', e);
      }
    }
  }, []);
  
  // Save progress to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('onboardingProgress', JSON.stringify({
      activeStep,
      completedSteps,
      emailConfig,
      selectedVendor
    }));
  }, [activeStep, completedSteps, emailConfig, selectedVendor]);
  
  const handleStepActivation = (stepIndex: number) => {
    setActiveStep(stepIndex);
  };
  
  const handleStepCompletion = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
    
    // Move to next step
    if (stepIndex < steps.length - 1) {
      setActiveStep(stepIndex + 1);
    }
  };
  
  const handleEmailSetup = async (config: any) => {
    try {
      await saveEmailConfig(config);
      setEmailConfig(config);
      showToast('Email configuration saved successfully', 'success');
      handleStepCompletion(0);
    } catch (error) {
      showToast('Failed to save email configuration', 'error');
    }
  };
  
  const handleVendorSelection = (vendor: 'VinSolutions' | 'VAUTO' | 'CDK' | 'Reynolds') => {
    setSelectedVendor(vendor);
    handleStepCompletion(1);
  };
  
  const handleReportSetupComplete = () => {
    handleStepCompletion(2);
  };
  
  const handleVerification = async () => {
    setIsVerifying(true);
    
    try {
      // In a real implementation, this would verify that reports are being received
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      handleStepCompletion(3);
      showToast('Setup completed successfully!', 'success');
      
      // Clear onboarding progress from localStorage
      localStorage.removeItem('onboardingProgress');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      showToast('Verification failed. Please check your setup.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <div className="mb-4">
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-white border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Dashboard
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-primary-600 mb-2">Email Setup Guide</h1>
        <p className="text-neutral-600">Follow these steps to configure your email for report ingestion</p>
      </header>
      
      <ProgressTracker 
        steps={steps}
        currentStep={activeStep}
        completedSteps={completedSteps}
      />
      
      <div className="space-y-6">
        <SetupStep
          title="Email Configuration"
          description="Configure your email account for IMAP access"
          isActive={activeStep === 0}
          isCompleted={completedSteps.includes(0)}
          stepNumber={1}
          onActivate={() => handleStepActivation(0)}
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Configure your email account for IMAP access. This will allow the system to retrieve CRM reports from your inbox.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    For Gmail accounts, you'll need to create an App Password. <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="font-medium underline">Learn how</a>
                  </p>
                </div>
              </div>
            </div>
            
            <EmailSetupForm 
              onComplete={handleEmailSetup}
              onTest={testEmailConnection}
            />
            
            <div className="mt-4 text-sm text-neutral-500">
              <p>
                Need more help? View the <Link href="/docs/guides/email-setup" className="text-primary-600 hover:text-primary-800">detailed email setup guide</Link>.
              </p>
            </div>
          </div>
        </SetupStep>
        
        <SetupStep
          title="Vendor Selection"
          description="Select your CRM vendor"
          isActive={activeStep === 1}
          isCompleted={completedSteps.includes(1)}
          stepNumber={2}
          onActivate={() => handleStepActivation(1)}
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Select your CRM vendor to get vendor-specific setup instructions.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {(['VinSolutions', 'VAUTO', 'CDK', 'Reynolds'] as const).map((vendor) => (
                <Card
                  key={vendor}
                  className={`cursor-pointer transition-all ${selectedVendor === vendor ? 'border-primary-500 ring-2 ring-primary-200' : 'hover:border-neutral-300'}`}
                  onClick={() => setSelectedVendor(vendor)}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border ${selectedVendor === vendor ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'} mr-3 flex items-center justify-center`}>
                      {selectedVendor === vendor && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="font-medium">{vendor}</span>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button onClick={() => handleVendorSelection(selectedVendor)}>
                Continue
              </Button>
            </div>
          </div>
        </SetupStep>
        
        <SetupStep
          title="Report Setup"
          description="Configure your CRM to send reports to your email"
          isActive={activeStep === 2}
          isCompleted={completedSteps.includes(2)}
          stepNumber={3}
          onActivate={() => handleStepActivation(2)}
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Follow these steps to configure your CRM to send reports to your email.
            </p>
            
            <VendorInstructions vendor={selectedVendor} />
            
            <div className="flex justify-end mt-6">
              <Button onClick={handleReportSetupComplete}>
                I've Configured My Reports
              </Button>
            </div>
          </div>
        </SetupStep>
        
        <SetupStep
          title="Verification"
          description="Verify your setup is working correctly"
          isActive={activeStep === 3}
          isCompleted={completedSteps.includes(3)}
          stepNumber={4}
          onActivate={() => handleStepActivation(3)}
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Let's verify that your setup is working correctly. The system will check if it can connect to your email account and find reports.
            </p>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Make sure you've sent at least one test report to your email before proceeding.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleVerification}
                isLoading={isVerifying}
                loadingText="Verifying..."
              >
                Verify Setup
              </Button>
            </div>
          </div>
        </SetupStep>
      </div>
      
      <div className="mt-8 pt-6 border-t border-neutral-200">
        <div className="flex justify-between items-center">
          <div>
            <Link 
              href="/docs/guides/email-setup"
              target="_blank"
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              View Full Documentation
            </Link>
          </div>
          
          <div className="flex space-x-3">
            <Link 
              href="https://www.loom.com/share/email-setup-guide"
              target="_blank"
              className="inline-flex items-center text-neutral-700 hover:text-neutral-900"
            >
              <svg className="w-5 h-5 mr-1.5 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Watch Video Tutorial
            </Link>
            
            <Link 
              href="/support"
              className="inline-flex items-center text-neutral-700 hover:text-neutral-900"
            >
              <svg className="w-5 h-5 mr-1.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              Get Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
