import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Cloudinary
    const { url, publicId } = await uploadFile(buffer, {
      folder: `outreachiq/resumes/${session.user.id}`,
      publicId: `resume_${Date.now()}`,
      resourceType: 'raw',
    })

    // Parse PDF text
    let resumeText = ''
    try {
      const pdfParse = await import('pdf-parse')
      const parsed = await pdfParse.default(buffer)
      resumeText = parsed.text
    } catch {
      console.error('Failed to parse PDF text')
    }

    // Update user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { resumeUrl: url, resumeCloudinaryId: publicId, resumeText },
    })

    return NextResponse.json({ success: true, url, resumeText })
  } catch (error) {
    console.error('Resume upload error:', error)
    return NextResponse.json({ error: 'Failed to upload resume' }, { status: 500 })
  }
}
