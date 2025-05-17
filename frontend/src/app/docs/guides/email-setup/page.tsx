'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/UI/Card';

export default function EmailSetupGuidePage() {
  const [guideContent, setGuideContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would fetch the markdown content from an API
    // For now, we'll use a simplified version of the content
    setIsLoading(true);
    
    // Simulate API fetch delay
    setTimeout(() => {
      setGuideContent(`
# Email Setup Guide

This guide will help you set up your email account for use with the Insight Engine. The system uses email to ingest CRM reports and generate insights.

## Overview

The Insight Engine uses IMAP (Internet Message Access Protocol) to connect to your email account and retrieve CRM reports that are sent as attachments. This approach is more reliable and secure than browser automation, as it doesn't require storing your CRM platform credentials.

## Requirements

To set up email ingestion, you'll need:

1. An email account that receives CRM reports
2. IMAP access enabled for that email account
3. Email account credentials (username/password or app password)
4. IMAP server details (hostname, port, TLS settings)

## Email Account Setup

### Gmail Setup

1. **Enable IMAP in Gmail**:
   - Log in to your Gmail account
   - Click the gear icon (Settings) in the top right
   - Select "See all settings"
   - Go to the "Forwarding and POP/IMAP" tab
   - In the "IMAP Access" section, select "Enable IMAP"
   - Click "Save Changes"

2. **Create an App Password** (recommended for security):
   - Go to your Google Account
   - Select "Security" from the left menu
   - Under "Signing in to Google," select "2-Step Verification" (enable if not already)
   - At the bottom of the page, select "App passwords"
   - Select "Mail" as the app and "Other" as the device
   - Enter "Insight Engine" as the name
   - Click "Generate"
   - Copy the 16-character password that appears (you'll use this instead of your regular password)

3. **IMAP Settings for Gmail**:
   - IMAP Server: \`imap.gmail.com\`
   - Port: \`993\`
   - TLS: \`Enabled\`

### Outlook Setup

1. **Enable IMAP in Outlook.com**:
   - Log in to your Outlook.com account
   - Click the gear icon (Settings) in the top right
   - Select "View all Outlook settings"
   - Go to "Mail" > "Sync email"
   - Ensure IMAP is enabled
   - Click "Save"

2. **Create an App Password** (if using 2FA):
   - Go to your Microsoft Account
   - Select "Security" from the top menu
   - Under "Advanced security options," select "App passwords"
   - Click "Create a new app password"
   - Copy the generated password

3. **IMAP Settings for Outlook**:
   - IMAP Server: \`outlook.office365.com\`
   - Port: \`993\`
   - TLS: \`Enabled\`
      `);
      setIsLoading(false);
    }, 500);
  }, []);

  // Simple markdown renderer (in a real app, use a proper markdown library)
  const renderMarkdown = (markdown: string) => {
    const html = markdown
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-primary-600 mb-4 mt-6">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold text-neutral-800 mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-neutral-700 mb-2 mt-4">$1</h3>')
      .replace(/^(\d+\. .*$)/gm, '<li class="ml-6 list-decimal mb-2">$1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-6 list-disc mb-2">$1</li>')
      .replace(/`([^`]+)`/g, '<code class="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono text-sm">$1</code>');
    
    return { __html: html };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <div className="mb-4">
          <Link 
            href="/onboarding" 
            className="inline-flex items-center px-4 py-2 bg-white border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Onboarding
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-primary-600 mb-2">Email Setup Documentation</h1>
        <p className="text-neutral-600">Comprehensive guide for setting up email ingestion</p>
      </header>
      
      <Card className="overflow-visible">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-3/4"></div>
            <div className="h-4 bg-neutral-200 rounded w-full"></div>
            <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
            <div className="h-4 bg-neutral-200 rounded w-4/6"></div>
            <div className="h-8 bg-neutral-200 rounded w-1/2 mt-8"></div>
            <div className="h-4 bg-neutral-200 rounded w-full"></div>
            <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
          </div>
        ) : (
          <div 
            className="prose prose-primary max-w-none"
            dangerouslySetInnerHTML={renderMarkdown(guideContent)}
          />
        )}
      </Card>
      
      <div className="mt-8 pt-6 border-t border-neutral-200">
        <div className="flex justify-between items-center">
          <div>
            <Link 
              href="/onboarding"
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              Return to Onboarding
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
