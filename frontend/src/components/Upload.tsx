'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Card from '@/components/ui/card'
import { Upload as UploadIcon, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export interface UploadProps {
  onUploadSuccess: (uploadId: string, fileName: string) => void
  maxFileSize?: number // in bytes
  allowedTypes?: string[]
}

export function Upload({
  onUploadSuccess,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  allowedTypes = ['text/csv', 'application/vnd.ms-excel']
}: UploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      return 'Only CSV files are supported'
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`
    }

    return null
  }

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
    const validationError = validateFile(file)
    if (validationError) {
      toast({
        title: 'Upload Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setIsSuccess(false)

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + 5
        return newProgress >= 90 ? 90 : newProgress
      })
    }, 300)

    const formData = new FormData()
    formData.append('file', file)

    try {
      console.log(`Uploading file: ${file.name}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(95) // Almost done

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload response not OK:', response.status, errorText)
        throw new Error(errorText || 'Upload failed')
      }

      const data = await response.json()
      console.log('Upload response data:', data)

      // Set to 100% complete
      setUploadProgress(100)

      // Small delay before showing success state
      setTimeout(() => {
        onUploadSuccess(data.uploadId, file.name)
        setIsSuccess(true)
        setIsUploading(false)
        toast({
          title: 'Upload Successful',
          description: `${file.name} was uploaded successfully`,
        })
      }, 500)

    } catch (error) {
      clearInterval(progressInterval)
      console.error('Upload error:', error)
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      // In case of success, we'll set isUploading to false after the success toast
      // In case of error, we need to set it here
      if (!isSuccess) {
        setIsUploading(false)
      }
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      } ${isSuccess ? 'border-green-500 bg-green-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {isUploading ? (
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        ) : isSuccess ? (
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        ) : (
          <UploadIcon className="h-12 w-12 text-muted-foreground" />
        )}

        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            {isSuccess ? 'Upload Complete!' :
             isUploading ? 'Processing your file...' :
             'Drop your CSV file here'}
          </h3>

          <p className="text-sm text-muted-foreground">
            {isSuccess ? 'Your data is being analyzed' :
             isUploading ? `${uploadProgress}% completed` :
             'Or click to select a file (Max 5MB)'}
          </p>
        </div>

        {!isSuccess && (
          <Button
            onClick={handleButtonClick}
            disabled={isUploading}
            className="mt-4"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UploadIcon className="h-4 w-4 mr-2" />
            )}
            {isUploading ? 'Uploading...' : 'Select CSV File'}
          </Button>
        )}
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading}
          data-testid="file-input"
        />
      </div>
    </Card>
  )
}
