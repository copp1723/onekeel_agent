'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload as UploadIcon } from 'lucide-react'

interface UploadProps {
  onUploadSuccess: (uploadId: string, fileName: string) => void
}

export function Upload({ onUploadSuccess }: UploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are supported')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    // Create form data
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5
          return newProgress >= 90 ? 90 : newProgress
        })
      }, 100)

      // Send file to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      setUploadProgress(100)
      
      // Get upload ID from response
      const data = await response.json()
      onUploadSuccess(data.upload_id, file.name)
    } catch (error) {
      console.error('Error uploading file:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <UploadIcon className="h-12 w-12 text-muted-foreground mb-4" />
        
        <h3 className="text-lg font-medium mb-2">
          {isUploading ? 'Uploading...' : 'Drop your CSV file here'}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4">
          {isUploading 
            ? `Processing your data (${uploadProgress}%)`
            : 'Or click the button below to browse files'
          }
        </p>

        {error && (
          <div className="text-destructive text-sm mb-4">
            {error}
          </div>
        )}

        {isUploading && (
          <div className="w-full max-w-xs mb-4 bg-secondary rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <Button 
          onClick={handleButtonClick}
          disabled={isUploading}
        >
          <UploadIcon className="h-4 w-4 mr-2" />
          Select CSV File
        </Button>
      </div>
    </Card>
  )
}
