import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp')
    try {
      await fs.mkdir(tempDir, { recursive: true })
    } catch (err) {
      console.error('Error creating temp directory:', err)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      )
    }

    // Save file temporarily
    const tempPath = path.join(tempDir, file.name)
    const fileBuffer = await file.arrayBuffer()
    await fs.writeFile(tempPath, Buffer.from(fileBuffer))

    console.log(`File saved to ${tempPath}, attempting to process...`)

    try {
      // Process with Python legacy code (using simplified version)
      // Try different Python executable names
      const pythonExecutable = process.platform === 'win32' ? 'python' :
                              (process.env.PYTHON_PATH || 'python3');

      console.log(`Using Python executable: ${pythonExecutable}`);

      const pythonProcess = spawn(pythonExecutable, [
        path.join(process.cwd(), '..', 'legacy_code', 'simple_upload.py'),
        tempPath
      ])

      let output = ''
      let errorOutput = ''

      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString()
        console.log(`Python stdout: ${chunk}`)
        output += chunk
      })

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString()
        console.error(`Python stderr: ${chunk}`)
        errorOutput += chunk
      })

      const uploadId = await new Promise<string>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          console.log(`Python process exited with code ${code}`)
          console.log(`Python output: ${output}`)

          if (code === 0) {
            try {
              // Try to parse JSON from output
              const result = JSON.parse(output)
              resolve(result.upload_id)
            } catch (e) {
              console.error('Failed to parse Python output as JSON:', e)
              console.error('Raw output:', output)

              // Fallback: Generate a UUID as upload ID
              const fallbackId = uuidv4()
              console.log(`Using fallback UUID: ${fallbackId}`)
              resolve(fallbackId)
            }
          } else {
            console.error(`Python process failed with code ${code}`)
            console.error(`Error output: ${errorOutput}`)

            // Fallback: Generate a UUID as upload ID
            const fallbackId = uuidv4()
            console.log(`Using fallback UUID after error: ${fallbackId}`)
            resolve(fallbackId)
          }
        })
      })

      // Clean up temp file
      try {
        await fs.unlink(tempPath)
      } catch (err) {
        console.error('Error deleting temp file:', err)
      }

      return NextResponse.json({
        uploadId,
        filename: file.name
      })
    } catch (processingError) {
      console.error('Error during file processing:', processingError)

      // Fallback: Generate a UUID as upload ID
      const fallbackId = uuidv4()

      return NextResponse.json({
        uploadId: fallbackId,
        filename: file.name,
        warning: 'File was uploaded but could not be processed. Using fallback ID.'
      })
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
