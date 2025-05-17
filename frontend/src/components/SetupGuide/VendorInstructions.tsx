'use client';

import React, { useState } from 'react';
import Card from '../UI/Card';

interface VendorInstructionsProps {
  vendor: 'VinSolutions' | 'VAUTO' | 'CDK' | 'Reynolds';
}

interface InstructionStep {
  title: string;
  description: string;
  image?: string;
}

const vendorInstructions: Record<VendorInstructionsProps['vendor'], {
  title: string;
  description: string;
  steps: InstructionStep[];
  emailSubjects: string[];
  reportTypes: string[];
}> = {
  VinSolutions: {
    title: 'VinSolutions Setup',
    description: 'Configure VinSolutions to email reports to your configured email address.',
    steps: [
      {
        title: 'Log in to VinSolutions',
        description: 'Access your VinSolutions account with your credentials.',
      },
      {
        title: 'Navigate to Reports',
        description: 'Go to Reports > Report Scheduler in the main navigation.',
      },
      {
        title: 'Create Scheduled Reports',
        description: 'Set up the required reports to be emailed daily to your configured email address.',
      },
      {
        title: 'Configure Email Delivery',
        description: 'Set the delivery format to CSV or Excel and enter your configured email as the recipient.',
      },
      {
        title: 'Save and Verify',
        description: 'Save your settings and verify that test reports are delivered to your email.',
      }
    ],
    emailSubjects: ['VinSolutions Report', 'Scheduled Report', 'Daily Report'],
    reportTypes: ['Inventory Aging Report', 'Sales Summary Report', 'Lead Activity Report']
  },
  VAUTO: {
    title: 'VAUTO Setup',
    description: 'Configure VAUTO to email reports to your configured email address.',
    steps: [
      {
        title: 'Log in to VAUTO',
        description: 'Access your VAUTO account with your credentials.',
      },
      {
        title: 'Navigate to Reports',
        description: 'Go to Reports > Scheduled Reports in the main navigation.',
      },
      {
        title: 'Create Scheduled Reports',
        description: 'Set up the required reports to be emailed daily to your configured email address.',
      },
      {
        title: 'Configure Email Delivery',
        description: 'Set the delivery format to CSV or Excel and enter your configured email as the recipient.',
      },
      {
        title: 'Save and Verify',
        description: 'Save your settings and verify that test reports are delivered to your email.',
      }
    ],
    emailSubjects: ['VAUTO Report', 'Automated Report', 'Daily Report'],
    reportTypes: ['Inventory Report', 'Pricing Report', 'Market Days Supply Report']
  },
  CDK: {
    title: 'CDK Setup',
    description: 'Configure CDK to email reports to your configured email address.',
    steps: [
      {
        title: 'Log in to CDK',
        description: 'Access your CDK account with your credentials.',
      },
      {
        title: 'Navigate to Reports',
        description: 'Go to Reports > Report Scheduler in the main navigation.',
      },
      {
        title: 'Create Scheduled Reports',
        description: 'Set up the required reports to be emailed daily to your configured email address.',
      },
      {
        title: 'Configure Email Delivery',
        description: 'Set the delivery format to CSV or Excel and enter your configured email as the recipient.',
      },
      {
        title: 'Save and Verify',
        description: 'Save your settings and verify that test reports are delivered to your email.',
      }
    ],
    emailSubjects: ['CDK Report', 'Daily Report', 'Automated Report'],
    reportTypes: ['Inventory Report', 'Sales Report', 'Customer Report']
  },
  Reynolds: {
    title: 'Reynolds Setup',
    description: 'Configure Reynolds to email reports to your configured email address.',
    steps: [
      {
        title: 'Log in to Reynolds',
        description: 'Access your Reynolds account with your credentials.',
      },
      {
        title: 'Navigate to Reports',
        description: 'Go to Reports > Schedule Reports in the main navigation.',
      },
      {
        title: 'Create Scheduled Reports',
        description: 'Set up the required reports to be emailed daily to your configured email address.',
      },
      {
        title: 'Configure Email Delivery',
        description: 'Set the delivery format to CSV or Excel and enter your configured email as the recipient.',
      },
      {
        title: 'Save and Verify',
        description: 'Save your settings and verify that test reports are delivered to your email.',
      }
    ],
    emailSubjects: ['Reynolds Report', 'ERA Report', 'Daily Report'],
    reportTypes: ['Inventory Report', 'Sales Report', 'F&I Report']
  }
};

export default function VendorInstructions({ vendor }: VendorInstructionsProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  
  const instructions = vendorInstructions[vendor];
  
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-neutral-800 mb-2">{instructions.title}</h3>
        <p className="text-neutral-600">{instructions.description}</p>
      </div>
      
      <div className="space-y-3">
        <h4 className="font-medium text-neutral-700">Setup Steps:</h4>
        {instructions.steps.map((step, index) => (
          <Card 
            key={index}
            className={expandedStep === index ? 'border-primary-300 shadow-sm' : ''}
          >
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedStep(expandedStep === index ? null : index)}
            >
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 mr-3">
                  <span className="text-xs font-medium">{index + 1}</span>
                </div>
                <h5 className="font-medium text-neutral-800">{step.title}</h5>
              </div>
              <svg 
                className={`w-5 h-5 text-neutral-400 transition-transform ${expandedStep === index ? 'transform rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
            
            {expandedStep === index && (
              <div className="mt-3 pt-3 border-t border-neutral-200">
                <p className="text-neutral-600">{step.description}</p>
                {step.image && (
                  <img 
                    src={step.image} 
                    alt={`${step.title} screenshot`} 
                    className="mt-3 rounded-md border border-neutral-200"
                  />
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
      
      <div className="mt-6 space-y-3">
        <h4 className="font-medium text-neutral-700">Email Subject Patterns:</h4>
        <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200">
          <p className="text-neutral-600 text-sm">The system looks for emails with subjects containing:</p>
          <ul className="mt-2 space-y-1">
            {instructions.emailSubjects.map((subject, index) => (
              <li key={index} className="flex items-center text-neutral-700">
                <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <code className="bg-white px-2 py-0.5 rounded border border-neutral-200 text-sm">{subject}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mt-6 space-y-3">
        <h4 className="font-medium text-neutral-700">Required Report Types:</h4>
        <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200">
          <p className="text-neutral-600 text-sm">Configure the following reports to be emailed:</p>
          <ul className="mt-2 space-y-1">
            {instructions.reportTypes.map((report, index) => (
              <li key={index} className="flex items-center text-neutral-700">
                <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {report}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
